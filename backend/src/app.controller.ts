import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // What the container healthcheck polls. `/` answers from memory, so it went
  // green while the shared Postgres was unreachable and every GraphQL query
  // was failing - a healthcheck that only proves the process is running is a
  // healthcheck that never fires when it matters.
  @Get('health')
  async getHealth(): Promise<{ status: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('database unreachable');
    }
    return { status: 'ok' };
  }
}
