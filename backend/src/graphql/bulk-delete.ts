import { Logger, NotFoundException } from '@nestjs/common';
import { BulkDeleteResult } from './bulk-delete-result.model';

export async function bulkDelete(
  ids: string[],
  deleteOne: (id: string) => Promise<unknown>,
  logging: { logger: Logger; entity: string },
): Promise<BulkDeleteResult> {
  const deletedIds: string[] = [];
  const failedIds: string[] = [];

  for (const id of new Set(ids)) {
    try {
      await deleteOne(id);
      deletedIds.push(id);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        logging.logger.error(
          `Bulk delete failed for ${logging.entity} ${id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
      failedIds.push(id);
    }
  }

  return { deletedIds, failedIds };
}
