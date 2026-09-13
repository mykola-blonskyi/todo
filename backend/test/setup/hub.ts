export interface HubMember {
  hubUserId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

// Rule 4 puts a hub project-members lookup in the invite path, so every suite
// that invites someone needs a roster to invite them from. Declaring it per
// suite keeps the rule honest in tests: a candidate who is not listed here is
// refused, exactly as in production.
//
// Routes by URL rather than answering every call, because the Google Calendar
// suites stub `fetch` for their own outbound requests - pass `fallback` to
// keep those working alongside the roster.
export function stubHubProjectMembers(
  members: HubMember[],
  fallback?: typeof fetch,
): jest.SpyInstance {
  return jest
    .spyOn(global, 'fetch')
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);

      if (!url.includes('/api/auth/project-members')) {
        if (!fallback) {
          throw new Error(`Unstubbed fetch in test: ${url}`);
        }
        return fallback(input, init);
      }

      const q = new URL(url).searchParams.get('q') ?? '';
      const matches = members
        .filter(
          (m) =>
            m.email.toLowerCase().includes(q.toLowerCase()) ||
            (m.name ?? '').toLowerCase().includes(q.toLowerCase()),
        )
        .map((m) => ({
          userId: m.hubUserId,
          email: m.email,
          name: m.name ?? null,
          image: m.image ?? null,
        }));

      return Promise.resolve(new Response(JSON.stringify(matches)));
    });
}
