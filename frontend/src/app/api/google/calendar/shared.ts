export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state';

// Must exactly match what was sent to Google's authorization endpoint - the
// token exchange (backend GoogleCalendarService.connect) re-validates it.
export function googleCalendarRedirectUri(): string {
  return `${process.env.APP_URL}/api/google/calendar/callback`;
}
