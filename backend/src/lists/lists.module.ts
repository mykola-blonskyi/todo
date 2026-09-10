import { Module } from '@nestjs/common';
import { ListsService } from './lists.service';
import { ListsResolver } from './lists.resolver';
import { ListArchiveCron } from './list-archive.cron';
import { UsersModule } from '../users/users.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [UsersModule, GoogleCalendarModule],
  providers: [ListsService, ListsResolver, ListArchiveCron],
  exports: [ListsService],
})
export class ListsModule {}
