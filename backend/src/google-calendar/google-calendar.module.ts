import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarResolver } from './google-calendar.resolver';
import { GoogleCalendarApiClient } from './google-calendar-api.client';
import { CalendarSyncService } from './calendar-sync.service';
import { CalendarSyncResolver } from './calendar-sync.resolver';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [
    GoogleCalendarService,
    GoogleCalendarResolver,
    GoogleCalendarApiClient,
    CalendarSyncService,
    CalendarSyncResolver,
  ],
  exports: [GoogleCalendarService, GoogleCalendarApiClient],
})
export class GoogleCalendarModule {}
