import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListShareStatus, Prisma } from '@prisma/client';
import { TaskMoveDirection } from './task-move-direction';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  tasksForList(listId: string) {
    return this.tasksForListWith(this.prisma, listId);
  }

  private tasksForListWith(
    client: Prisma.TransactionClient | PrismaService,
    listId: string,
  ) {
    return client.task.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });
  }

  // For the tasksByListId DataLoader (src/graphql/loaders.ts) - one query
  // for every List in a fan-out, grouped back into a Map by the loader.
  async tasksByListIds(listIds: string[]) {
    const tasks = await this.prisma.task.findMany({
      where: { listId: { in: listIds } },
      orderBy: { position: 'asc' },
    });

    const byListId = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const existing = byListId.get(task.listId);
      if (existing) {
        existing.push(task);
      } else {
        byListId.set(task.listId, [task]);
      }
    }
    return byListId;
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

  async toggleTaskDone(userId: string, id: string) {
    const task = await this.requireAccessToTask(userId, id);
    return this.prisma.task.update({
      where: { id },
      data: { done: !task.done },
    });
  }

  async updateTask(
    ownerId: string,
    id: string,
    updates: { title?: string; dueDate?: Date | null },
  ) {
    await this.requireOwnedTask(ownerId, id);

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && {
          title: this.requireTitle(updates.title),
        }),
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
      },
    });
  }

  async deleteTask(ownerId: string, id: string) {
    await this.requireOwnedTask(ownerId, id);
    await this.prisma.task.delete({ where: { id } });
    return true;
  }

  async moveTask(ownerId: string, id: string, direction: TaskMoveDirection) {
    const task = await this.requireOwnedTask(ownerId, id);

    return this.prisma.$transaction(async (tx) => {
      const neighbour = await tx.task.findFirst({
        where: {
          listId: task.listId,
          position:
            direction === TaskMoveDirection.up
              ? { lt: task.position }
              : { gt: task.position },
        },
        orderBy: {
          position: direction === TaskMoveDirection.up ? 'desc' : 'asc',
        },
      });

      // Already at the end it was asked to move towards. Not an error: the
      // button is one click away from being pressed again.
      if (!neighbour) {
        return this.tasksForListWith(tx, task.listId);
      }

      await tx.task.update({
        where: { id: task.id },
        data: { position: neighbour.position },
      });
      await tx.task.update({
        where: { id: neighbour.id },
        data: { position: task.position },
      });

      return this.tasksForListWith(tx, task.listId);
    });
  }

  private requireTitle(title: string | null | undefined): string {
    const trimmed = title?.trim();
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

  private async requireAccessToTask(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { list: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.list.ownerId === userId) {
      return task;
    }

    const listShare = await this.prisma.listShare.findUnique({
      where: {
        listId_userId: {
          userId,
          listId: task.listId,
        },
      },
    });

    if (listShare?.status !== ListShareStatus.accepted) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }
}
