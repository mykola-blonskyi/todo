import { Module } from '@nestjs/common';
import { HubClientService } from './hub-client.service';

@Module({
  providers: [HubClientService],
  exports: [HubClientService],
})
export class HubModule {}
