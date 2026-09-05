import { UnauthorizedException } from '@nestjs/common';
import DataLoader from 'dataloader';
import type { Request } from 'express';
import type { Category, Comment, List, Task, User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { TasksService } from '../tasks/tasks.service';
import { ListsService } from '../lists/lists.service';
import { ListTemplatesService } from '../list-templates/list-templates.service';
import { CommentsService } from '../comments/comments.service';
import { ListCategoryAssignmentsService } from '../list-category-assignments/list-category-assignments.service';
import { parseIdentity } from '../identity/parse-identity';

export interface GqlLoaders {
  tasksByListId: DataLoader<string, Task[]>;
  acceptedCollaboratorsByListId: DataLoader<string, User[]>;
  templateCollaboratorsByTemplateId: DataLoader<string, User[]>;
  listById: DataLoader<string, List | null>;
  userById: DataLoader<string, User | null>;
  currentUser: DataLoader<string, User>;
  commentsByTaskId: DataLoader<string, Comment[]>;
  commentsByListId: DataLoader<string, Comment[]>;
  myCategoryByListId: DataLoader<string, Category | null>;
}

export interface GqlContext {
  req: Request;
  loaders: GqlLoaders;
}

interface LoaderServices {
  usersService: UsersService;
  tasksService: TasksService;
  listsService: ListsService;
  listTemplatesService: ListTemplatesService;
  commentsService: CommentsService;
  categoryAssignmentsService: ListCategoryAssignmentsService;
}

export function createLoaders(
  req: Request,
  {
    usersService,
    tasksService,
    listsService,
    listTemplatesService,
    commentsService,
    categoryAssignmentsService,
  }: LoaderServices,
): GqlLoaders {
  // Keyed by identitySub, but the batch function ignores the keys' values -
  // it always re-parses the identity from req itself, the same trust
  // boundary as IdentityGuard (never trust caller-supplied data as an
  // identity to upsert, see TODO-46). The key only exists so DataLoader's
  // per-request cache collapses N identical isOwner-triggered upserts (and,
  // now, myCategoryByListId's lookup below) into one shared upsert - every
  // key in a single request is the same caller anyway.
  //
  // Must parse identity lazily, at .load()-time, not eagerly here: the
  // Apollo context factory (where createLoaders runs) executes before
  // Nest's guard chain (IdentityGuard) runs per-resolver, so headers
  // aren't guaranteed validated yet at this point. By the time any
  // resolver body calls .load(), IdentityGuard has already run for that
  // field, so this re-parse is defense-in-depth, not the primary error
  // path.
  const currentUser = new DataLoader<string, User>(
    async (identitySubs: readonly string[]) => {
      const identity = parseIdentity(req);
      if (!identity) {
        throw new UnauthorizedException('Missing trusted identity headers');
      }
      const user = await usersService.findOrCreateByIdentity(identity);
      return identitySubs.map(() => user);
    },
  );

  return {
    tasksByListId: new DataLoader(async (listIds: readonly string[]) => {
      const byListId = await tasksService.tasksByListIds([...listIds]);
      return listIds.map((id) => byListId.get(id) ?? []);
    }),

    acceptedCollaboratorsByListId: new DataLoader(
      async (listIds: readonly string[]) => {
        const byListId = await listsService.acceptedCollaboratorsByListIds([
          ...listIds,
        ]);
        return listIds.map((id) => byListId.get(id) ?? []);
      },
    ),

    templateCollaboratorsByTemplateId: new DataLoader(
      async (templateIds: readonly string[]) => {
        const byTemplateId =
          await listTemplatesService.templateCollaboratorsByTemplateIds([
            ...templateIds,
          ]);
        return templateIds.map((id) => byTemplateId.get(id) ?? []);
      },
    ),

    listById: new DataLoader(async (ids: readonly string[]) => {
      const byId = await listsService.listsByIds([...ids]);
      return ids.map((id) => byId.get(id) ?? null);
    }),

    userById: new DataLoader(async (ids: readonly string[]) => {
      const byId = await usersService.usersByIds([...ids]);
      return ids.map((id) => byId.get(id) ?? null);
    }),

    currentUser,

    commentsByTaskId: new DataLoader(async (taskIds: readonly string[]) => {
      const byTaskId = await commentsService.commentsByTaskIds([...taskIds]);
      return taskIds.map((id) => byTaskId.get(id) ?? []);
    }),

    commentsByListId: new DataLoader(async (listIds: readonly string[]) => {
      const byListId = await commentsService.commentsByListIds([...listIds]);
      return listIds.map((id) => byListId.get(id) ?? []);
    }),

    // Reuses the currentUser loader rather than re-resolving identity
    // itself - a request fetching both isOwner and myCategory on the same
    // Lists should still only upsert the caller's shadow User row once.
    myCategoryByListId: new DataLoader(async (listIds: readonly string[]) => {
      const identity = parseIdentity(req);
      if (!identity) {
        throw new UnauthorizedException('Missing trusted identity headers');
      }
      const user = await currentUser.load(identity.identitySub);
      const byListId = await categoryAssignmentsService.myCategoriesByListIds(
        user.id,
        [...listIds],
      );
      return listIds.map((id) => byListId.get(id) ?? null);
    }),
  };
}
