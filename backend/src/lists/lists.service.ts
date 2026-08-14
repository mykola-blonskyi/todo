import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ListShareStatus } from '@prisma/client';

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  createList(ownerId: string, title: string) {
    return this.prisma.list.create({
      data: { ownerId, title: this.requireTitle(title) },
    });
  }

  myLists(userId: string) {
    return this.prisma.list.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            shares: {
              some: {
                userId,
                status: ListShareStatus.accepted,
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async list(ownerId: string, id: string) {
    return this.requireAccess(ownerId, id);
  }

  async renameList(ownerId: string, id: string, title: string) {
    await this.requireOwned(ownerId, id);
    return this.prisma.list.update({
      where: { id },
      data: { title: this.requireTitle(title) },
    });
  }

  async updateListDueDate(ownerId: string, id: string, dueDate: Date | null) {
    await this.requireOwned(ownerId, id);
    return this.prisma.list.update({
      where: { id },
      data: { dueDate },
    });
  }

  async deleteList(ownerId: string, id: string) {
    await this.requireOwned(ownerId, id);
    await this.prisma.list.delete({ where: { id } });
    return true;
  }

  async listById(id: string) {
    return this.prisma.list.findUnique({ where: { id } });
  }

  // Lives here (not ListSharesService) to avoid a circular module dependency:
  // ListSharesModule already imports ListsModule for ownership checks, so the
  // reverse import isn't available without forwardRef(). ListsService already
  // has direct Prisma access, so no cross-module call is needed anyway.
  async acceptedCollaborators(listId: string) {
    const shares = await this.prisma.listShare.findMany({
      where: { listId, status: ListShareStatus.accepted },
      include: { user: true },
    });
    return shares.map((share) => share.user);
  }

  private requireTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('List title must not be empty');
    }
    return trimmed;
  }

  // A List that isn't the caller's own might as well not exist from their
  // perspective - NotFoundException for both "doesn't exist" and "exists but
  // isn't yours" avoids leaking which lists exist to non-owners.
  async requireOwned(ownerId: string, id: string) {
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list || list.ownerId !== ownerId) {
      throw new NotFoundException('List not found');
    }
    return list;
  }

  private async requireAccess(userId: string, id: string) {
    const list = await this.prisma.list.findUnique({ where: { id } });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    if (list.ownerId === userId) {
      return list;
    }

    const listShare = await this.prisma.listShare.findUnique({
      where: {
        listId_userId: {
          userId,
          listId: id,
        },
      },
    });

    if (listShare?.status !== ListShareStatus.accepted) {
      throw new NotFoundException('List not found');
    }

    return list;
  }
}
