import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { ListCategoryAssignmentsService } from './list-category-assignments.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver()
export class ListCategoryAssignmentsResolver {
  constructor(
    private readonly assignmentsService: ListCategoryAssignmentsService,
    private readonly usersService: UsersService,
  ) {}

  @Mutation(() => Boolean)
  async assignListCategory(
    @CurrentUser() identity: Identity,
    @Args('listId', { type: () => ID }) listId: string,
    @Args('categoryId', { type: () => ID }) categoryId: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.assignmentsService.assignListCategory(
      user.id,
      listId,
      categoryId,
    );
  }

  @Mutation(() => Boolean)
  async unassignListCategory(
    @CurrentUser() identity: Identity,
    @Args('listId', { type: () => ID }) listId: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.assignmentsService.unassignListCategory(user.id, listId);
  }
}
