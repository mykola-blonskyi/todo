import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  tasksForList(listId: string) {
    return this.prisma.task.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });
  }

  async createTask(
    ownerId: string,
    listId: string,
    title: string,
    dueDate?: Date | null,
  ) {
    await this.requireOwnedList(ownerId, listId);
    const trimmedTitle = this.requireTitle(title);

    const last = await this.prisma.task.findFirst({
      where: { listId },
      orderBy: { position: 'desc' },
    });

    return this.prisma.task.create({
      data: {
        listId,
        title: trimmedTitle,
        dueDate: dueDate ?? null,
        position: (last?.position ?? -1) + 1,
      },
    });
  }

  async toggleTaskDone(ownerId: string, id: string) {
    const task = await this.requireOwnedTask(ownerId, id);
    return this.prisma.task.update({
      where: { id },
      data: { done: !task.done },
    });
  }

  private requireTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('Task title must not be empty');
    }
    return trimmed;
  }

  private async requireOwnedList(ownerId: string, listId: string) {
    const list = await this.prisma.list.findUnique({ where: { id: listId } });
    if (!list || list.ownerId !== ownerId) {
      throw new NotFoundException('List not found');
    }
    return list;
  }

  private async requireOwnedTask(ownerId: string, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { list: true },
    });
    if (!task || task.list.ownerId !== ownerId) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }
}
