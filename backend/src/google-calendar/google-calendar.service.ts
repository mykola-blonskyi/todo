import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptToken, encryptToken } from './token-encryption';
import { GoogleGrantRevokedError } from './google-calendar.errors';
import z from 'zod';
import { GOOGLE_TIMEOUT_MS } from './google-timeout';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  scope: z.string(),
});

// A token is refreshed this far ahead of its real expiry, so a sync call
// that's mid-flight when the clock ticks over never sends an already-stale
// access token to the Calendar API.
const EXPIRY_SKEW_MS = 60_000;

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async connect(userId: string, code: string, redirectUri: string) {
    const tokens = await this.exchangeCode(code, redirectUri);

    const existing = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });

    // Google only re-issues a refresh_token when prompt=consent forces it
    // (the connect flow always sets that) - fall back to the existing,
    // still-encrypted refresh token on reconnect rather than overwriting it
    // with nothing (business-rules.md Rule 26).
    const refreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : existing?.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException(
        'Google did not grant a refresh token - reconnect and accept the consent prompt',
      );
    }

    const data = {
      accessToken: encryptToken(tokens.access_token),
      refreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
      // A reconnect is exactly the fix a revoked connection was asking for
      // (Rule 29) - clear the flag rather than leave the row nagging.
      revokedAt: null,
    };

    return this.prisma.googleCalendarConnection.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // Deliberately leaves CalendarSync rows and synced events alone (Rule 27).
  async disconnect(userId: string): Promise<boolean> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    if (!connection) {
      return true;
    }

    try {
      await this.revokeRefreshToken(decryptToken(connection.refreshToken));
    } catch (error) {
      this.logger.error(
        `Failed to revoke the Google Calendar grant for user ${userId} - deleting the local tokens anyway`,
        error instanceof Error ? error.stack : error,
      );
    }

    await this.prisma.googleCalendarConnection.delete({ where: { userId } });
    return true;
  }

  async isConnected(userId: string): Promise<boolean> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    return connection !== null;
  }

  // True once we've seen Google refuse the stored grant. The row is kept
  // (and still reports connected) so the UI can ask for a reconnect instead
  // of silently resetting to "never connected" - see Rule 29.
  async needsReconnect(userId: string): Promise<boolean> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    return connection?.revokedAt != null;
  }

  // Idempotent: re-flagging an already-flagged connection keeps the first
  // timestamp, which is the one that says when we actually noticed.
  async markRevoked(userId: string): Promise<void> {
    await this.prisma.googleCalendarConnection.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Returns a plaintext access token guaranteed valid for at least
  // EXPIRY_SKEW_MS, refreshing (and persisting) a new one first if the
  // stored one is expired or about to be.
  async getValidAccessToken(userId: string): Promise<string> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    if (!connection) {
      throw new BadRequestException('Google Calendar is not connected');
    }

    if (connection.expiresAt.getTime() > Date.now() + EXPIRY_SKEW_MS) {
      return decryptToken(connection.accessToken);
    }

    const refreshed = await this.refreshOrFlagRevoked(
      userId,
      decryptToken(connection.refreshToken),
    );

    await this.prisma.googleCalendarConnection.update({
      where: { userId },
      data: {
        accessToken: encryptToken(refreshed.access_token),
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      },
    });

    return refreshed.access_token;
  }

  // The refresh path is where a Google-side revoke actually shows up: the
  // grant is gone, so the connection is flagged and the caller gets a plain
  // "reconnect" error rather than a generic failure (Rule 29).
  private async refreshOrFlagRevoked(userId: string, refreshToken: string) {
    try {
      return await this.refreshAccessToken(refreshToken);
    } catch (error) {
      if (error instanceof GoogleGrantRevokedError) {
        await this.markRevoked(userId);
        throw new BadRequestException(
          'Google Calendar access was revoked - reconnect to sync again',
        );
      }
      throw error;
    }
  }

  private async exchangeCode(code: string, redirectUri: string) {
    try {
      return await this.postToTokenEndpoint({
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
    } catch (error) {
      // A stale or already-used authorization code comes back as
      // invalid_grant too, but at connect time that means "start the flow
      // again", not "the User revoked us" - only the refresh path carries
      // that meaning (Rule 29).
      if (error instanceof GoogleGrantRevokedError) {
        throw new BadRequestException(
          'Google rejected the Calendar authorization code - try connecting again',
        );
      }
      throw error;
    }
  }

  private async refreshAccessToken(refreshToken: string) {
    return this.postToTokenEndpoint({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
  }

  // Revoking the refresh token kills the whole grant, access tokens included.
  private async revokeRefreshToken(refreshToken: string) {
    const res = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken }),
    });

    if (!res.ok) {
      throw new Error(
        `Google rejected the Calendar token revocation: ${res.status}`,
      );
    }
  }

  private async postToTokenEndpoint(params: Record<string, string>) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        ...params,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });

    if (!res.ok) {
      // Google's OAuth errors all arrive as the same 400; only the body's
      // `error` field separates "the User revoked us" (invalid_grant) from
      // a transient or configuration failure, and the two want opposite
      // handling - see Rule 29.
      const reason = await errorCode(res);
      if (reason === 'invalid_grant') {
        throw new GoogleGrantRevokedError(reason);
      }
      throw new BadRequestException(
        'Google rejected the Calendar token request - reconnect may be required',
      );
    }

    const data: unknown = await res.json();
    return tokenResponseSchema.parse(data);
  }
}

// Best-effort read of Google's OAuth error body (`{"error": "invalid_grant",
// ...}`); returns null if the body isn't that shape, or isn't JSON at all.
async function errorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.clone().json()) as { error?: string };
    return body.error ?? null;
  } catch {
    return null;
  }
}
