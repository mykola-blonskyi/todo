import { Injectable } from '@nestjs/common';
import { ShareCandidate } from '../list-shares/share-candidate.model';
import z from 'zod';

// The hub's own wire shape (ADR-009: `{ userId, email, name, image }[]`) -
// its `userId` maps to our `hubUserId` naming (User.hubUserId, Identity),
// so the mapping happens right after parsing, not by renaming this schema
// to match us.
const hubMemberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

@Injectable()
export class HubClientService {
  // sessionCookie is the caller's real .blonskyi.dev session (see
  // HubSessionCookie) - this endpoint validates it against the hub's own
  // session store, unlike the locally-trusted x-user-id/x-user-email
  // identity headers used everywhere else (ADR-003).
  async searchProjectMembers(
    q: string,
    sessionCookie: string,
  ): Promise<ShareCandidate[]> {
    const url = new URL(`${process.env.HUB_URL}/api/auth/project-members`);
    url.searchParams.set('project', process.env.PROJECT_SLUG!);
    url.searchParams.set('q', q);
    const res = await fetch(url, { headers: { cookie: sessionCookie } });

    if (!res.ok) {
      throw new Error(`hub project-members search failed: ${res.status}`);
    }

    const data: unknown = await res.json();
    const members = z.array(hubMemberSchema).parse(data);
    return members.map(({ userId, ...rest }) => ({
      hubUserId: userId,
      ...rest,
    }));
  }
}
