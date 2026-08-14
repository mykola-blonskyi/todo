import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptToken, encryptToken } from './token-encryption';
import z from 'zod';

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
    };

    return this.prisma.googleCalendarConnection.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async isConnected(userId: string): Promise<boolean> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    return connection !== null;
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

    const refreshed = await this.refreshAccessToken(
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

  private async exchangeCode(code: string, redirectUri: string) {
    return this.postToTokenEndpoint({
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
  }

  private async refreshAccessToken(refreshToken: string) {
    return this.postToTokenEndpoint({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
  }

  private async postToTokenEndpoint(params: Record<string, string>) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        ...params,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });

    if (!res.ok) {
      throw new BadRequestException(
        'Google rejected the Calendar token request - reconnect may be required',
      );
    }

    const data: unknown = await res.json();
    return tokenResponseSchema.parse(data);
  }
}
