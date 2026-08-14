import { Module } from '@nestjs/common';
import { ListsService } from './lists.service';
import { ListsResolver } from './lists.resolver';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { CommentsModule } from '../comments/comments.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { ListCategoryAssignmentsModule } from '../list-category-assignments/list-category-assignments.module';

@Module({
  imports: [
    UsersModule,
    TasksModule,
    CommentsModule,
    GoogleCalendarModule,
    ListCategoryAssignmentsModule,
  ],
  providers: [ListsService, ListsResolver],
  exports: [ListsService],
})
export class ListsModule {}
