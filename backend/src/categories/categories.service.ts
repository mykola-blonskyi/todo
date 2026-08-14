import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  myCategories(ownerId: string) {
    return this.prisma.category.findMany({
      where: { ownerId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(ownerId: string, name: string) {
    const trimmedName = this.requireName(name);
    await this.requireUniqueName(ownerId, trimmedName);

    return this.prisma.category.create({
      data: { ownerId, name: trimmedName },
    });
  }

  async renameCategory(ownerId: string, id: string, name: string) {
    await this.requireOwned(ownerId, id);
    const trimmedName = this.requireName(name);
    await this.requireUniqueName(ownerId, trimmedName, id);

    return this.prisma.category.update({
      where: { id },
      data: { name: trimmedName },
    });
  }

  async deleteCategory(ownerId: string, id: string) {
    await this.requireOwned(ownerId, id);
    // No cascade to Lists themselves - ListCategoryAssignment doesn't exist
    // yet (TODO-31, business-rules.md Rule 23).
    await this.prisma.category.delete({ where: { id } });
    return true;
  }

  private requireName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Category name must not be empty');
    }
    return trimmed;
  }

  private async requireUniqueName(
    ownerId: string,
    name: string,
    excludingId?: string,
  ) {
    const existing = await this.prisma.category.findUnique({
      where: { ownerId_name: { ownerId, name } },
    });
    if (existing && existing.id !== excludingId) {
      throw new ConflictException(
        `You already have a category named "${name}"`,
      );
    }
  }

  // A Category that isn't the caller's own might as well not exist from
  // their perspective - same pattern as ListsService.requireOwned.
  private async requireOwned(ownerId: string, id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category || category.ownerId !== ownerId) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}
