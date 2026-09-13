import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Without this Nest never runs onModuleDestroy on SIGTERM, so the Prisma
  // pool is not drained and in-flight requests are cut mid-redeploy.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}

// A rejected bootstrap must exit non-zero: the container healthcheck and
// restart policy key off the exit code, not off a logged rejection.
bootstrap().catch((error) => {
  console.error('Nest bootstrap failed:', error);
  process.exit(1);
});
