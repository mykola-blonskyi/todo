import { join } from 'path';
import { Prisma } from '@prisma/client';
import { HttpException, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
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

// @nestjs/apollo maps 400, 401, 403 and 422 to Apollo codes itself and leaves
// everything else as INTERNAL_SERVER_ERROR, so a "List not found" reached the
// caller indistinguishable from a real fault - which is why the frontend used
// to render every GraphQL failure on a list page as "not found".
const STATUS_CODES: Record<number, string> = {
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

const PRISMA_CODES: Record<string, { code: string; message: string }> = {
  P2002: { code: 'CONFLICT', message: 'That already exists' },
  P2025: { code: 'NOT_FOUND', message: 'Not found' },
};

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
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
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
            const mapped = STATUS_CODES[originalError.getStatus()];
            return mapped
              ? {
                  ...formattedError,
                  extensions: { ...formattedError.extensions, code: mapped },
                }
              : formattedError;
          }

          if (
            originalError instanceof Prisma.PrismaClientKnownRequestError &&
            PRISMA_CODES[originalError.code]
          ) {
            const { code, message } = PRISMA_CODES[originalError.code];
            return { message, extensions: { code } };
          }

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
