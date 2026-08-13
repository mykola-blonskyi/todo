import {
  Args,
  ID,
  Mutation,
  Parent,
  Resolver,
  ResolveField,
} from '@nestjs/graphql';
import { Task } from './task.model';
import { TasksService } from './tasks.service';
import { UsersService } from '../users/users.service';
import { CommentsService } from '../comments/comments.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver(() => Task)
export class TasksResolver {
  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly commentsService: CommentsService,
  ) {}

  @ResolveField()
  comments(@Parent() task: Task) {
    return this.commentsService.commentsForTask(task.id);
  }

  @Mutation(() => Task)
  async createTask(
    @CurrentUser() identity: Identity,
    @Args('listId', { type: () => ID }) listId: string,
    @Args('title') title: string,
    @Args('dueDate', { type: () => Date, nullable: true }) dueDate?: Date,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.tasksService.createTask(user.id, listId, title, dueDate);
  }

  @Mutation(() => Task)
  async toggleTaskDone(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.tasksService.toggleTaskDone(user.id, id);
  }

  @Mutation(() => Task)
  async updateTask(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
    @Args('title', { nullable: true }) title?: string,
    @Args('dueDate', { type: () => Date, nullable: true })
    dueDate?: Date | null,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.tasksService.updateTask(user.id, id, { title, dueDate });
  }

  @Mutation(() => Boolean)
  async deleteTask(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.tasksService.deleteTask(user.id, id);
  }

  @Mutation(() => [Task])
  async reorderTasks(
    @CurrentUser() identity: Identity,
    @Args('listId', { type: () => ID }) listId: string,
    @Args('taskIds', { type: () => [ID] }) taskIds: string[],
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.tasksService.reorderTasks(user.id, listId, taskIds);
  }
}
