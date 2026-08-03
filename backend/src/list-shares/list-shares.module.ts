import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ListSharesResolver } from './list-shares.resolver';
import { ListSharesService } from './list-shares.service';
import { ListsModule } from '../lists/lists.module';
import { HubModule } from '../hub/hub.module';

@Module({
  imports: [ListsModule, UsersModule, HubModule],
  providers: [ListSharesService, ListSharesResolver],
})
export class ListSharesModule {}
