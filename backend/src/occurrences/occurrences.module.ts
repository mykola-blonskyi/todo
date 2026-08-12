import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OccurrencesService } from './occurrences.service';
import { OccurrencesResolver } from './occurrences.resolver';
import { OccurrenceSpawnCron } from './occurrence-spawn.cron';

@Module({
  imports: [UsersModule],
  providers: [OccurrencesService, OccurrencesResolver, OccurrenceSpawnCron],
  exports: [OccurrencesService],
})
export class OccurrencesModule {}
