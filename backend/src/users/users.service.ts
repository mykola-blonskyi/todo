import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Identity } from '../identity/identity.types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Lazily upserts the local shadow User row from the trusted identity
  // headers (knowledge/domain-model.md) - email/name/image are refreshed on
  // every call so the shadow row doesn't drift from the hub's own profile
  // data, while locale/theme (this app's own per-user preferences) are left
  // untouched once created.
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

  async userById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
