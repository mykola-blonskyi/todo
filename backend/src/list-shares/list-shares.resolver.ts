import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListShare } from './list-share.model';
import { ListsService } from '../lists/lists.service';
import { UsersService } from '../users/users.service';
import { ListSharesService } from './list-shares.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { ShareCandidateInput } from './share-candidate.input';
import { ShareCandidate } from './share-candidate.model';

@Resolver(() => ListShare)
export class ListSharesResolver {
  constructor(
    private readonly listsService: ListsService,
    private readonly usersService: UsersService,
    private readonly listSharesService: ListSharesService,
  ) {}

  @ResolveField()
  list(@Parent() listShare: ListShare) {
    return this.listsService.listById(listShare.listId);
  }

  @ResolveField()
  user(@Parent() listShare: ListShare) {
    return this.usersService.userById(listShare.userId);
  }

  @Query(() => [ShareCandidate])
  async searchShareCandidates(
    @CurrentUser() identity: Identity,
    @Args('listId', { type: () => ID }) listId: string,
    @Args('q', { type: () => String }) q: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listSharesService.searchShareCandidates(user.id, listId, q);
  }

  @Mutation(() => ListShare)
  async inviteToList(
    @CurrentUser() identity: Identity,
    @Args('listId', { type: () => ID }) listId: string,
    @Args('candidate', { type: () => ShareCandidateInput })
    candidate: ShareCandidateInput,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listSharesService.invite(user.id, listId, candidate);
  }

  @Query(() => [ListShare])
  async pendingInvites(@CurrentUser() identity: Identity) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listSharesService.pendingInvites(user.id);
  }

  @Mutation(() => ListShare)
  async acceptInvite(
    @CurrentUser() identity: Identity,
    @Args('shareId', { type: () => ID }) shareId: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listSharesService.acceptInvite(user.id, shareId);
  }

  @Mutation(() => ListShare)
  async declineInvite(
    @CurrentUser() identity: Identity,
    @Args('shareId', { type: () => ID }) shareId: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listSharesService.declineInvite(user.id, shareId);
  }
}
