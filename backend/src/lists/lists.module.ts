import { Module } from '@nestjs/common';
import { ListsService } from './lists.service';
import { ListsResolver } from './lists.resolver';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [UsersModule, TasksModule],
  providers: [ListsService, ListsResolver],
  exports: [ListsService],
})
export class ListsModule {}
