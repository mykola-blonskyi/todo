import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OccurrencesService } from './occurrences.service';
import { OccurrencesResolver } from './occurrences.resolver';

@Module({
  imports: [UsersModule],
  providers: [OccurrencesService, OccurrencesResolver],
  exports: [OccurrencesService],
})
export class OccurrencesModule {}
