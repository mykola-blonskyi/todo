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

  async reorderTasks(ownerId: string, listId: string, taskIds: string[]) {
    await this.requireOwnedList(ownerId, listId);

    const tasks = await this.prisma.task.findMany({ where: { listId } });
    const currentIds = new Set(tasks.map((task) => task.id));
    const sameSet =
      taskIds.length === tasks.length &&
      taskIds.every((id) => currentIds.has(id));
    if (!sameSet) {
      throw new BadRequestException(
        "taskIds must match the List's current Tasks exactly",
      );
    }

    await this.prisma.$transaction(
      taskIds.map((id, position) =>
        this.prisma.task.update({ where: { id }, data: { position } }),
      ),
    );

    return this.tasksForList(listId);
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
