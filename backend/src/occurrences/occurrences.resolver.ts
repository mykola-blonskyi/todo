import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { List } from '../lists/list.model';
import { OccurrencesService } from './occurrences.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver()
export class OccurrencesResolver {
  constructor(
    private readonly occurrencesService: OccurrencesService,
    private readonly usersService: UsersService,
  ) {}

  // No cron yet (TODO-28) - this mutation lets a template owner (and, for
  // now, e2e tests) trigger the recurrence check directly with an explicit
  // `now`, matching the ticket's testability requirement.
  @Mutation(() => List, { nullable: true })
  async spawnDueOccurrence(
    @CurrentUser() identity: Identity,
    @Args('templateId', { type: () => ID }) templateId: string,
    @Args('now', { type: () => Date }) now: Date,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.occurrencesService.spawnDueOccurrence(user.id, templateId, now);
  }
}
