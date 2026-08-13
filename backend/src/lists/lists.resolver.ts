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
import { TasksService } from '../tasks/tasks.service';
import { CommentsService } from '../comments/comments.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver(() => List)
export class ListsResolver {
  constructor(
    private readonly listsService: ListsService,
    private readonly usersService: UsersService,
    private readonly tasksService: TasksService,
    private readonly commentsService: CommentsService,
  ) {}

  @ResolveField()
  tasks(@Parent() list: List) {
    return this.tasksService.tasksForList(list.id);
  }

  @ResolveField(() => Boolean)
  async isOwner(@Parent() list: List, @CurrentUser() identity: Identity) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return list.ownerId === user.id;
  }

  @ResolveField()
  collaborators(@Parent() list: List) {
    return this.listsService.acceptedCollaborators(list.id);
  }

  @ResolveField()
  comments(@Parent() list: List) {
    return this.commentsService.commentsForList(list.id);
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

  @Mutation(() => List)
  async renameList(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
    @Args('title') title: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listsService.renameList(user.id, id, title);
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
