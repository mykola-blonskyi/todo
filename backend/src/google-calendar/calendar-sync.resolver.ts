import { Args, ID, Int, Mutation, Resolver } from '@nestjs/graphql';
import { CalendarSyncService } from './calendar-sync.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver()
export class CalendarSyncResolver {
  constructor(
    private readonly calendarSyncService: CalendarSyncService,
    private readonly usersService: UsersService,
  ) {}

  @Mutation(() => Int)
  async syncListToCalendar(
    @CurrentUser() identity: Identity,
    @Args('listId', { type: () => ID }) listId: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.calendarSyncService.syncListToCalendar(user.id, listId);
  }
}
