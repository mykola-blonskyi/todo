import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { resolveIdentity } from '@shared/lib/hub-identity';
import { routing } from '@shared/lib/i18n/routing';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  googleCalendarRedirectUri,
} from '../shared';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// Entry point for the "Connect Google Calendar" action in Settings. Not
// covered by proxy.ts's page-auth gate (its matcher excludes /api - see
// proxy.ts), so identity is resolved independently here.
export async function GET(request: NextRequest) {
  const identity = await resolveIdentity(request.headers.get('cookie') ?? '');
  const locale =
    request.cookies.get('NEXT_LOCALE')?.value ?? routing.defaultLocale;

  if (!identity) {
    const loginUrl = new URL(`${process.env.API_URL}/${locale}/login`);
    loginUrl.searchParams.set(
      'callbackUrl',
      `${process.env.APP_URL}/${locale}/settings`,
    );
    return NextResponse.redirect(loginUrl);
  }

  // Random per-attempt nonce, round-tripped through Google and checked
  // against the cookie set below - standard OAuth CSRF protection
  // (independent of identity, which is resolved fresh from the session
  // cookie on the way back, not trusted from this state value).
  const state = randomUUID();

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', googleCalendarRedirectUri());
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', CALENDAR_SCOPE);
  // offline + consent together guarantee a refresh_token on every connect,
  // including a reconnect (Google otherwise only issues one on first
  // consent) - see backend GoogleCalendarService.connect.
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  return response;
}
