import { Injectable } from '@nestjs/common';
import { ShareCandidate } from '../list-shares/share-candidate.model';
import z from 'zod';

const shareCandidateSchema = z.object({
  hubUserId: z.string(),
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
    return z.array(shareCandidateSchema).parse(data);
  }
}
