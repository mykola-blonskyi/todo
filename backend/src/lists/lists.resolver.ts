import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { List } from './list.model';
import { ListsService } from './lists.service';
import { UsersService } from '../users/users.service';
import { Category } from '../categories/category.model';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { Loaders } from '../graphql/loaders.decorator';
import type { GqlLoaders } from '../graphql/loaders';

@Resolver(() => List)
export class ListsResolver {
  constructor(
    private readonly listsService: ListsService,
    private readonly usersService: UsersService,
  ) {}

  @ResolveField()
  tasks(@Parent() list: List, @Loaders() loaders: GqlLoaders) {
    return loaders.tasksByListId.load(list.id);
  }

  @ResolveField(() => Boolean)
  async isOwner(
    @Parent() list: List,
    @CurrentUser() identity: Identity,
    @Loaders() loaders: GqlLoaders,
  ) {
    const user = await loaders.currentUser.load(identity.identitySub);
    return list.ownerId === user.id;
  }

  @ResolveField()
  collaborators(@Parent() list: List, @Loaders() loaders: GqlLoaders) {
    return loaders.acceptedCollaboratorsByListId.load(list.id);
  }

  @ResolveField()
  comments(@Parent() list: List, @Loaders() loaders: GqlLoaders) {
    return loaders.commentsByListId.load(list.id);
  }

  @ResolveField(() => Category, { nullable: true })
  myCategory(@Parent() list: List, @Loaders() loaders: GqlLoaders) {
    return loaders.myCategoryByListId.load(list.id);
  }

  @Mutation(() => List)
  async createList(
    @CurrentUser() identity: Identity,
    @Args('title') title: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.createList(user.id, title);
  }

  @Query(() => [List])
  async myLists(
    @CurrentUser() identity: Identity,
    @Args('categoryId', { type: () => ID, nullable: true }) categoryId?: string,
    @Args('uncategorizedOnly', { type: () => Boolean, nullable: true })
    uncategorizedOnly?: boolean,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.myLists(user.id, categoryId, uncategorizedOnly);
  }

  @Query(() => List)
  async list(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.list(user.id, id);
  }

  @Mutation(() => List)
  async renameList(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
    @Args('title') title: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.renameList(user.id, id, title);
  }

  @Mutation(() => List)
  async updateListDueDate(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
    @Args('dueDate', { type: () => Date, nullable: true })
    dueDate?: Date | null,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.updateListDueDate(user.id, id, dueDate ?? null);
  }

  @Mutation(() => Boolean)
  async deleteList(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.deleteList(user.id, id);
  }
}
