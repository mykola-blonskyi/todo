import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OccurrencesService } from './occurrences.service';

@Injectable()
export class OccurrenceSpawnCron {
  private readonly logger = new Logger(OccurrenceSpawnCron.name);

  constructor(private readonly occurrencesService: OccurrencesService) {}

  @Cron(CronExpression.EVERY_6_HOURS, { name: 'spawn-due-occurrences' })
  async spawnDueOccurrences() {
    const spawned = await this.occurrencesService.spawnAllDueOccurrences(
      new Date(),
    );
    if (spawned.length > 0) {
      this.logger.log(`Spawned ${spawned.length} Occurrence(s)`);
    }
  }
}
