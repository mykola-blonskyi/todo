import { ForbiddenException, Injectable } from '@nestjs/common';
import { ShareCandidate } from '../list-shares/share-candidate.model';
import type { ShareCandidateInput } from '../list-shares/share-candidate.input';
import z from 'zod';

// The hub is a separate service that can be slow or unreachable; without this
// undici holds a stalled response until its 300s headers timeout, and this
// call now sits in the invite path.
const HUB_TIMEOUT_MS = 5000;

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
    const res = await fetch(url, {
      headers: { cookie: sessionCookie },
      signal: AbortSignal.timeout(HUB_TIMEOUT_MS),
    });

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

  // Rule 4: a share target must already hold access to this project, checked
  // here rather than taken on trust from the caller. searchShareCandidates
  // ran the check but nothing bound an invite to a prior search, so any owner
  // could invite an arbitrary email and mint a User row for a stranger.
  //
  // The hub's own record is what comes back, not the caller's input: an
  // invite names a person, it does not get to describe them.
  async requireProjectMember(
    candidate: ShareCandidateInput,
    sessionCookie: string,
  ): Promise<ShareCandidate> {
    const members = await this.searchProjectMembers(
      candidate.email,
      sessionCookie,
    );
    const member = members.find(
      (m) => m.hubUserId === candidate.hubUserId && m.email === candidate.email,
    );

    if (!member) {
      throw new ForbiddenException(
        'That person does not have access to this project',
      );
    }

    return member;
  }
}
