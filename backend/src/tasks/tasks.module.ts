import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksResolver } from './tasks.resolver';
import { UsersModule } from '../users/users.module';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [UsersModule, CommentsModule],
  providers: [TasksService, TasksResolver],
  exports: [TasksService],
})
export class TasksModule {}
