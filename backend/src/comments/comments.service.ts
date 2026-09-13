import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListShareStatus } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async addComment(
    authorId: string,
    taskId: string | null | undefined,
    listId: string | null | undefined,
    body: string,
  ) {
    if ((taskId && listId) || (!taskId && !listId)) {
      throw new BadRequestException(
        'addComment requires exactly one of taskId or listId',
      );
    }
    const trimmedBody = this.requireBody(body);

    if (taskId) {
      await this.requireAccessToTask(authorId, taskId);
      return this.prisma.comment.create({
        data: { authorId, taskId, body: trimmedBody },
        include: { author: true },
      });
    }

    await this.requireAccessToList(authorId, listId!);
    return this.prisma.comment.create({
      data: { authorId, listId, body: trimmedBody },
      include: { author: true },
    });
  }

  // For the commentsByTaskId DataLoader (src/graphql/loaders.ts) - one
  // query for every Task in a fan-out, grouped back into a Map.
  async commentsByTaskIds(taskIds: string[]) {
    const comments = await this.prisma.comment.findMany({
      where: { taskId: { in: taskIds } },
      orderBy: { createdAt: 'asc' },
      include: { author: true },
    });
    return this.groupBy(comments, (comment) => comment.taskId);
  }

  // For the commentsByListId DataLoader (src/graphql/loaders.ts) - one
  // query for every List in a fan-out, grouped back into a Map.
  async commentsByListIds(listIds: string[]) {
    const comments = await this.prisma.comment.findMany({
      where: { listId: { in: listIds } },
      orderBy: { createdAt: 'asc' },
      include: { author: true },
    });
    return this.groupBy(comments, (comment) => comment.listId);
  }

  private groupBy<T>(rows: T[], keyOf: (row: T) => string | null) {
    const byKey = new Map<string, T[]>();
    for (const row of rows) {
      const key = keyOf(row);
      if (!key) {
        continue;
      }
      const existing = byKey.get(key);
      if (existing) {
        existing.push(row);
      } else {
        byKey.set(key, [row]);
      }
    }
    return byKey;
  }

  // Nullable in the schema because GraphQL has no way to say "optional but
  // never null" for a scalar argument, so an explicit null arrives here and
  // used to reach .trim() as a TypeError - a 500 for what is a bad request.
  private requireBody(body: string | null | undefined): string {
    const trimmed = body?.trim();
    if (!trimmed) {
      throw new BadRequestException('Comment body must not be empty');
    }
    return trimmed;
  }

  // Same owner-or-accepted-collaborator check as ListsService/TasksService's
  // own private access guards - duplicated rather than called cross-module to
  // avoid a circular module dependency (matches the established convention,
  // see ListsService.acceptedCollaborators's comment).
  private async requireAccessToList(userId: string, id: string) {
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    if (list.ownerId === userId) {
      return list;
    }

    const listShare = await this.prisma.listShare.findUnique({
      where: { listId_userId: { userId, listId: id } },
    });

    if (listShare?.status !== ListShareStatus.accepted) {
      throw new NotFoundException('List not found');
    }
    return list;
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
      where: { listId_userId: { userId, listId: task.listId } },
    });

    if (listShare?.status !== ListShareStatus.accepted) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }
}
