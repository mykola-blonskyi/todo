import { join } from 'path';
import { HttpException, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ListsModule } from './lists/lists.module';
import { IdentityGuard } from './identity/identity.guard';
import { ListSharesModule } from './list-shares/list-shares.module';
import { ListTemplatesModule } from './list-templates/list-templates.module';
import { OccurrencesModule } from './occurrences/occurrences.module';
import { HubModule } from './hub/hub.module';
import { CommentsModule } from './comments/comments.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { CategoriesModule } from './categories/categories.module';
import { GraphQLError, GraphQLFormattedError } from 'graphql';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      formatError(
        formattedError: GraphQLFormattedError,
        error: unknown,
      ): GraphQLFormattedError {
        const originalError =
          error instanceof GraphQLError ? error.originalError : undefined;

        if (originalError instanceof HttpException) {
          return formattedError;
        }

        console.error('Unhandled GraphQL error:', originalError ?? error);

        return {
          message: 'Internal server error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      },
    }),
    UsersModule,
    ListsModule,
    ListSharesModule,
    ListTemplatesModule,
    OccurrencesModule,
    HubModule,
    CommentsModule,
    GoogleCalendarModule,
    CategoriesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: IdentityGuard,
    },
  ],
})
export class AppModule {}
