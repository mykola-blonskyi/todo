import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Identity } from '../identity/identity.types';
import { UserLocale, UserTheme } from '@prisma/client';

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
  // email/name/image unconditionally on an identitySub match, so passing it
  // client-supplied data describing someone else (e.g. a share/collaborator
  // "candidate") lets any caller corrupt another real user's profile. Use
  // findOrCreateCandidate for that case instead.
  findOrCreateByIdentity(identity: Identity) {
    return this.prisma.user.upsert({
      where: { identitySub: identity.identitySub },
      update: {
        email: identity.email,
        name: identity.name,
        image: identity.image,
      },
      create: {
        identitySub: identity.identitySub,
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
  //
  // candidate.hubUserId is actually the hub's own userId (from
  // HubClientService's project-members search, ADR-009), not a real login
  // `sub` - there is no login-side equivalent of that search yet. It gets
  // written into the User row's identitySub column as-is, so a
  // pre-created candidate row won't automatically link up when that person
  // later logs in for real via login. Known, accepted limitation of this
  // migration, not a bug to fix here.
  findOrCreateCandidate(candidate: Candidate) {
    return this.prisma.user.upsert({
      where: { identitySub: candidate.hubUserId },
      update: {},
      create: {
        identitySub: candidate.hubUserId,
        email: candidate.email,
        name: candidate.name,
        image: candidate.image,
      },
    });
  }

  // For the userById DataLoader (src/graphql/loaders.ts), used by
  // ListShare.user.
  async usersByIds(ids: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
    });
    return new Map(users.map((user) => [user.id, user]));
  }

  // userId is always the caller's own id (resolved via findOrCreateByIdentity
  // in the resolver, same as every other mutation) - a User only ever
  // updates their own theme/locale, no separate authorization check needed.
  updateTheme(userId: string, theme: UserTheme) {
    return this.prisma.user.update({ where: { id: userId }, data: { theme } });
  }

  updateLocale(userId: string, locale: UserLocale) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { locale },
    });
  }
}
