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
import { ListCategoryAssignmentsService } from '../list-category-assignments/list-category-assignments.service';
import { Category } from '../categories/category.model';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver(() => List)
export class ListsResolver {
  constructor(
    private readonly listsService: ListsService,
    private readonly usersService: UsersService,
    private readonly tasksService: TasksService,
    private readonly commentsService: CommentsService,
    private readonly categoryAssignmentsService: ListCategoryAssignmentsService,
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

  @ResolveField(() => Category, { nullable: true })
  async myCategory(@Parent() list: List, @CurrentUser() identity: Identity) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.categoryAssignmentsService.myCategoryForList(user.id, list.id);
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
