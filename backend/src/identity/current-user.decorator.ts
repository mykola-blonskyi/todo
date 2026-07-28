import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import { Identity } from './identity.types';

// Reads the Identity that IdentityGuard already resolved and attached to the
// request - this decorator never re-parses headers itself, the guard is the
// single place that does (and is required to run first).
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const req = GqlExecutionContext.create(context).getContext<{
      req: Request;
    }>().req;
    return (req as Request & { identity: Identity }).identity;
  },
);
