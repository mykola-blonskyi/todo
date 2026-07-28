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
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('List title must not be empty');
    }

    return this.prisma.list.create({ data: { ownerId, title: trimmed } });
  }

  myLists(ownerId: string) {
    return this.prisma.list.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // A List that isn't the caller's own might as well not exist from their
  // perspective - NotFoundException for both "doesn't exist" and "exists but
  // isn't yours" avoids leaking which lists exist to non-owners.
  async list(ownerId: string, id: string) {
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list || list.ownerId !== ownerId) {
      throw new NotFoundException('List not found');
    }
    return list;
  }
}
