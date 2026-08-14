import { Module } from '@nestjs/common';
import { ListCategoryAssignmentsService } from './list-category-assignments.service';
import { ListCategoryAssignmentsResolver } from './list-category-assignments.resolver';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [ListCategoryAssignmentsService, ListCategoryAssignmentsResolver],
})
export class ListCategoryAssignmentsModule {}
