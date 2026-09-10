import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { User } from '../users/user.model';
import { GoogleCalendarService } from './google-calendar.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

// Contributes a field to User (owned by UsersModule) without UsersModule
// needing to import this module back - see google-calendar.module.ts.
@Resolver(() => User)
export class GoogleCalendarResolver {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly usersService: UsersService,
  ) {}

  @ResolveField(() => Boolean)
  googleCalendarConnected(@Parent() user: User) {
    return this.googleCalendarService.isConnected(user.id);
  }

  @Mutation(() => Boolean)
  async connectGoogleCalendar(
    @CurrentUser() identity: Identity,
    @Args('code') code: string,
    @Args('redirectUri') redirectUri: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    await this.googleCalendarService.connect(user.id, code, redirectUri);
    return true;
  }

  // Always true, even when nothing was connected or Google refused (Rule 27).
  @Mutation(() => Boolean)
  async disconnectGoogleCalendar(@CurrentUser() identity: Identity) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.googleCalendarService.disconnect(user.id);
  }
}
