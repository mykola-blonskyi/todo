import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Identity } from '../identity/identity.types';
import { UserLayout, UserLocale, UserPalette, UserTheme } from '@prisma/client';

interface Candidate {
  hubUserId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Lazily resolves the local shadow User row from the trusted identity
  // headers (knowledge/domain-model.md), refreshing email/name/image on every
  // call while leaving locale/theme (this app's own preferences) alone.
  //
  // ONLY call this with an identity the caller cannot forge - i.e. the
  // trusted @CurrentUser() of the request. It overwrites email/name/image
  // unconditionally, so passing it client-supplied data describing someone
  // else lets any caller corrupt a real user's profile; use
  // findOrCreateCandidate for that.
  //
  // Falls back to matching on email when no row carries this identitySub yet:
  // findOrCreateCandidate may already have created one keyed by the hub's own
  // id, and creating a second row would only collide on User.email's unique
  // constraint. Same reconciliation login's own db.UpsertGoogleUser does
  // (docs/decisions.md ADR-016).
  findOrCreateByIdentity(identity: Identity) {
    return this.prisma.$transaction(async (tx) => {
      const bySub = await tx.user.findUnique({
        where: { identitySub: identity.identitySub },
      });

      if (bySub) {
        return tx.user.update({
          where: { identitySub: identity.identitySub },
          data: {
            email: identity.email,
            name: identity.name,
            image: identity.image,
          },
        });
      }

      const byEmail = await tx.user.findUnique({
        where: { email: identity.email },
      });

      if (byEmail) {
        return tx.user.update({
          where: { email: identity.email },
          data: {
            identitySub: identity.identitySub,
            name: identity.name,
            image: identity.image,
          },
        });
      }

      return tx.user.create({
        data: {
          identitySub: identity.identitySub,
          email: identity.email,
          name: identity.name,
          image: identity.image,
        },
      });
    });
  }

  // For resolving a client-supplied candidate (share invite, template
  // collaborator, ...) describing a User other than the caller. Never
  // overwrites an existing profile: the candidate data is unverified GraphQL
  // input, not a trusted identity header.
  //
  // candidate.hubUserId is the hub's own userId (HubClientService's
  // project-members search, ADR-009), not a login `sub`, and is written into
  // identitySub as-is - login has no equivalent search yet (TODO-54). When
  // that person later signs in for real, findOrCreateByIdentity reattaches
  // this row by email instead of leaving it stranded.
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
  // updates their own theme/palette/layout/locale, no separate authorization
  // check needed.
  updateTheme(userId: string, theme: UserTheme) {
    return this.prisma.user.update({ where: { id: userId }, data: { theme } });
  }

  updatePalette(userId: string, palette: UserPalette) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { palette },
    });
  }

  updateLayout(userId: string, layout: UserLayout) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { layout },
    });
  }

  updateLocale(userId: string, locale: UserLocale) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { locale },
    });
  }
}
