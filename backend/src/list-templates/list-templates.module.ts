import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ListTemplatesService } from './list-templates.service';
import { ListTemplatesResolver } from './list-templates.resolver';

@Module({
  imports: [UsersModule],
  providers: [ListTemplatesService, ListTemplatesResolver],
})
export class ListTemplatesModule {}
