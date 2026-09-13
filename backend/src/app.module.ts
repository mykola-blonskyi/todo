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
import { UsersService } from './users/users.service';
import { TasksModule } from './tasks/tasks.module';
import { TasksService } from './tasks/tasks.service';
import { ListsModule } from './lists/lists.module';
import { ListsService } from './lists/lists.service';
import { IdentityGuard } from './identity/identity.guard';
import { ListSharesModule } from './list-shares/list-shares.module';
import { ListTemplatesModule } from './list-templates/list-templates.module';
import { ListTemplatesService } from './list-templates/list-templates.service';
import { OccurrencesModule } from './occurrences/occurrences.module';
import { HubModule } from './hub/hub.module';
import { CommentsModule } from './comments/comments.module';
import { CommentsService } from './comments/comments.service';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { CategoriesModule } from './categories/categories.module';
import { ListCategoryAssignmentsModule } from './list-category-assignments/list-category-assignments.module';
import { ListCategoryAssignmentsService } from './list-category-assignments/list-category-assignments.service';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { createLoaders } from './graphql/loaders';
import type { Request } from 'express';

const CLIENT_FAULT_CODES = new Set([
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'BAD_USER_INPUT',
  'BAD_REQUEST',
  'OPERATION_RESOLUTION_FAILURE',
  'PERSISTED_QUERY_NOT_FOUND',
  'PERSISTED_QUERY_NOT_SUPPORTED',
]);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [
        UsersModule,
        TasksModule,
        ListsModule,
        ListTemplatesModule,
        CommentsModule,
        ListCategoryAssignmentsModule,
      ],
      inject: [
        UsersService,
        TasksService,
        ListsService,
        ListTemplatesService,
        CommentsService,
        ListCategoryAssignmentsService,
      ],
      useFactory: (
        usersService: UsersService,
        tasksService: TasksService,
        listsService: ListsService,
        listTemplatesService: ListTemplatesService,
        commentsService: CommentsService,
        categoryAssignmentsService: ListCategoryAssignmentsService,
      ): ApolloDriverConfig => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        context: ({ req }: { req: Request }) => ({
          req,
          loaders: createLoaders(req, {
            usersService,
            tasksService,
            listsService,
            listTemplatesService,
            commentsService,
            categoryAssignmentsService,
          }),
        }),
        formatError(
          formattedError: GraphQLFormattedError,
          error: unknown,
        ): GraphQLFormattedError {
          const originalError =
            error instanceof GraphQLError ? error.originalError : undefined;

          if (originalError instanceof HttpException) {
            return formattedError;
          }

          // Apollo raises these before a resolver ever runs, and each one
          // describes the caller's own request. Masking them cost the caller
          // the reason their query was rejected and logged a stack per typo.
          if (CLIENT_FAULT_CODES.has(String(formattedError.extensions?.code))) {
            return formattedError;
          }

          console.error('Unhandled GraphQL error:', originalError ?? error);

          return {
            message: 'Internal server error',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          };
        },
      }),
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
    ListCategoryAssignmentsModule,
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
