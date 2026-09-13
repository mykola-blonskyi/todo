import { NextRequest, NextResponse } from 'next/server';
import { getIdentity } from '@shared/lib/identity';
import { routing } from '@shared/lib/i18n/routing';
import { LOCALE_COOKIE, parseLocale } from '@shared/lib/i18n/config';
import { graphqlFetch } from '@shared/lib/graphql-client';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  googleCalendarRedirectUri,
} from '../shared';

// The OAuth redirect target Google sends the browser back to - must be a
// plain REST route, not GraphQL, since a third party can't POST a GraphQL
// query as a redirect (ticket acceptance criteria). Not covered by
// proxy.ts's page-auth gate, so identity is resolved independently here too.
export async function GET(request: NextRequest) {
  const locale =
    parseLocale(request.cookies.get(LOCALE_COOKIE)?.value) ??
    routing.defaultLocale;
  const settingsUrl = new URL(`${process.env.APP_URL}/${locale}/settings`);

  function redirectWithResult(result: 'connected' | 'error') {
    settingsUrl.searchParams.set('googleCalendar', result);
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithResult('error');
  }

  const identity = await getIdentity(request);
  if (!identity) {
    return redirectWithResult('error');
  }

  try {
    await graphqlFetch(
      `mutation ConnectGoogleCalendar($code: String!, $redirectUri: String!) {
        connectGoogleCalendar(code: $code, redirectUri: $redirectUri)
      }`,
      { code, redirectUri: googleCalendarRedirectUri() },
      identity,
    );
  } catch {
    return redirectWithResult('error');
  }

  return redirectWithResult('connected');
}
