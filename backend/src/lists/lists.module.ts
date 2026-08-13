import { Module } from '@nestjs/common';
import { ListsService } from './lists.service';
import { ListsResolver } from './lists.resolver';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [UsersModule, TasksModule, CommentsModule],
  providers: [ListsService, ListsResolver],
  exports: [ListsService],
})
export class ListsModule {}
