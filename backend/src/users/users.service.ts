import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Identity } from '../identity/identity.types';

interface Candidate {
  hubUserId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Lazily upserts the local shadow User row from the trusted identity
  // headers (knowledge/domain-model.md) - email/name/image are refreshed on
  // every call so the shadow row doesn't drift from the hub's own profile
  // data, while locale/theme (this app's own per-user preferences) are left
  // untouched once created.
  //
  // ONLY call this with an identity the caller cannot forge - i.e. the
  // trusted @CurrentUser() of the request itself. It overwrites
  // email/name/image unconditionally on a hubUserId match, so passing it
  // client-supplied data describing someone else (e.g. a share/collaborator
  // "candidate") lets any caller corrupt another real user's profile. Use
  // findOrCreateCandidate for that case instead.
  findOrCreateByIdentity(identity: Identity) {
    return this.prisma.user.upsert({
      where: { hubUserId: identity.hubUserId },
      update: {
        email: identity.email,
        name: identity.name,
        image: identity.image,
      },
      create: {
        hubUserId: identity.hubUserId,
        email: identity.email,
        name: identity.name,
        image: identity.image,
      },
    });
  }

  // For resolving a client-supplied candidate (share invite, template
  // collaborator, ...) describing a User other than the caller. Unlike
  // findOrCreateByIdentity, never overwrites an existing User's profile -
  // the candidate data is unverified GraphQL input, not a trusted identity
  // header, so a hubUserId match must not let it clobber real profile data.
  findOrCreateCandidate(candidate: Candidate) {
    return this.prisma.user.upsert({
      where: { hubUserId: candidate.hubUserId },
      update: {},
      create: {
        hubUserId: candidate.hubUserId,
        email: candidate.email,
        name: candidate.name,
        image: candidate.image,
      },
    });
  }

  async userById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
