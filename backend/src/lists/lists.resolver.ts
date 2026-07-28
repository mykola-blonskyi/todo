import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { List } from './list.model';
import { ListsService } from './lists.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver(() => List)
export class ListsResolver {
  constructor(
    private readonly listsService: ListsService,
    private readonly usersService: UsersService,
  ) {}

  @Mutation(() => List)
  async createList(
    @CurrentUser() identity: Identity,
    @Args('title') title: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.createList(user.id, title);
  }

  @Query(() => [List])
  async myLists(@CurrentUser() identity: Identity) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.myLists(user.id);
  }

  @Query(() => List)
  async list(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.list(user.id, id);
  }
}
