import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ListsService } from './lists.service';

// Daily is enough: the eligibility window is 30 days wide, so a missed run
// delays an archive rather than skipping it.
@Injectable()
export class ListArchiveCron {
  private readonly logger = new Logger(ListArchiveCron.name);

  constructor(private readonly listsService: ListsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, {
    name: 'archive-stale-template-lists',
  })
  async archiveStaleTemplateLists() {
    const archived = await this.listsService.archiveStaleTemplateLists(
      new Date(),
    );
    if (archived.length > 0) {
      this.logger.log(`Archived ${archived.length} stale template List(s)`);
    }
  }
}
