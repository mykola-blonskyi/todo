import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

// The hub's /api/auth/project-members endpoint checks the caller's own
// .blonskyi.dev session (its auth() reads the session cookie from the
// request) - unlike the x-user-id/x-user-email identity headers (ADR-003,
// locally trusted once forwarded), this one hub call needs the caller's
// real browser session forwarded through, since it's the hub's own session
// state being validated, not ours. See TODO-54.
export const HubSessionCookie = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const req = GqlExecutionContext.create(context).getContext<{
      req: Request;
    }>().req;

    const cookie = req.headers.cookie;
    if (!cookie) {
      throw new UnauthorizedException('Missing session cookie');
    }

    return cookie;
  },
);
