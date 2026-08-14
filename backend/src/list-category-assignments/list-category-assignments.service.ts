import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListShareStatus } from '@prisma/client';

@Injectable()
export class ListCategoryAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // A "folder" model, not multi-tag (knowledge/domain-model.md) - assigning
  // a new Category replaces any prior one this User had on this List.
  async assignListCategory(userId: string, listId: string, categoryId: string) {
    await this.requireAccessToList(userId, listId);
    await this.requireOwnedCategory(userId, categoryId);

    await this.prisma.listCategoryAssignment.upsert({
      where: { userId_listId: { userId, listId } },
      update: { categoryId },
      create: { userId, listId, categoryId },
    });

    return true;
  }

  async unassignListCategory(userId: string, listId: string): Promise<boolean> {
    await this.requireAccessToList(userId, listId);

    await this.prisma.listCategoryAssignment.deleteMany({
      where: { userId, listId },
    });

    return true;
  }

  // For the myCategoryByListId DataLoader (src/graphql/loaders.ts) - one
  // query for every List in a fan-out, grouped back into a Map. Still
  // scoped to a single caller (Rule 22) - userId is the loader's own
  // resolved current-user id, not a batch dimension.
  async myCategoriesByListIds(userId: string, listIds: string[]) {
    const assignments = await this.prisma.listCategoryAssignment.findMany({
      where: { userId, listId: { in: listIds } },
      include: { category: true },
    });
    return new Map(
      assignments.map((assignment) => [assignment.listId, assignment.category]),
    );
  }

  // Same owner-or-accepted-collaborator check duplicated across services -
  // see CommentsService's identical private helper for why (avoids a
  // circular module dependency).
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

  private async requireOwnedCategory(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category || category.ownerId !== userId) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}
