import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  createList(ownerId: string, title: string) {
    return this.prisma.list.create({
      data: { ownerId, title: this.requireTitle(title) },
    });
  }

  myLists(ownerId: string) {
    return this.prisma.list.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async list(ownerId: string, id: string) {
    return this.requireOwned(ownerId, id);
  }

  async renameList(ownerId: string, id: string, title: string) {
    await this.requireOwned(ownerId, id);
    return this.prisma.list.update({
      where: { id },
      data: { title: this.requireTitle(title) },
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
}
