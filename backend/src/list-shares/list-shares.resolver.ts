import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ShareCandidate } from './share-candidate.model';
import { UsersService } from '../users/users.service';
import { ListSharesService } from './list-shares.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver(() => ShareCandidate)
export class ListSharesResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly listSharesService: ListSharesService,
  ) {}

  @Query(() => [ShareCandidate])
  async searchShareCandidates(
    @CurrentUser() identity: Identity,
    @Args('listId', { type: () => ID }) listId: string,
    @Args('q', { type: () => String }) q: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listSharesService.searchShareCandidates(user.id, listId, q);
  }
}
