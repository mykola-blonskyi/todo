import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<{ log: [{ emit: 'event'; level: 'query' }] }>
  implements OnModuleInit, OnModuleDestroy
{
  // Inert until something calls $on('query', ...) - the DataLoader batching
  // e2e test (TODO-47) uses this to assert query counts stay flat as fan-out
  // size grows.
  constructor() {
    super({ log: [{ emit: 'event', level: 'query' }] });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
