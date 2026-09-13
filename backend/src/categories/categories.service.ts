import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkDeleteResult } from '../graphql/bulk-delete-result.model';
import { bulkDelete } from '../graphql/bulk-delete';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

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
    await this.prisma.category.delete({ where: { id } });
    return true;
  }

  async deleteCategories(
    ownerId: string,
    ids: string[],
  ): Promise<BulkDeleteResult> {
    return bulkDelete(ids, (id) => this.deleteCategory(ownerId, id), {
      logger: this.logger,
      entity: 'Category',
    });
  }

  // Nullable in the schema because GraphQL has no way to say "optional but
  // never null" for a scalar argument, so an explicit null arrives here and
  // used to reach .trim() as a TypeError - a 500 for what is a bad request.
  private requireName(name: string | null | undefined): string {
    const trimmed = name?.trim();
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
