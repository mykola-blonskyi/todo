import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarResolver } from './google-calendar.resolver';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [GoogleCalendarService, GoogleCalendarResolver],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
