import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptToken } from './token-encryption';
import z from 'zod';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  scope: z.string(),
});

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

  private async exchangeCode(code: string, redirectUri: string) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      throw new BadRequestException(
        'Google rejected the Calendar authorization code',
      );
    }

    const data: unknown = await res.json();
    return tokenResponseSchema.parse(data);
  }
}
