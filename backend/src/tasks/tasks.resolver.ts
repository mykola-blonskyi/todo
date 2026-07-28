import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { Task } from './task.model';
import { TasksService } from './tasks.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver(() => Task)
export class TasksResolver {
  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
  ) {}

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
}
