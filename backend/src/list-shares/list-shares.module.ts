import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ListSharesResolver } from './list-shares.resolver';
import { ListSharesService } from './list-shares.service';
import { ListsModule } from '../lists/lists.module';
import { HubModule } from '../hub/hub.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [ListsModule, UsersModule, HubModule, GoogleCalendarModule],
  providers: [ListSharesService, ListSharesResolver],
})
export class ListSharesModule {}
