import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import { Identity } from './identity.types';
import { parseIdentity } from './parse-identity';

// Reads the trusted identity headers the frontend forwards after validating
// the session against the hub - the backend is internal-only (ADR-003) and
// never verifies a JWT itself. A missing header means either a misconfigured
// caller or a network-boundary bypass, so this fails loudly, not gracefully.
//
// Registered globally (APP_GUARD in AppModule), so it must no-op for non-GraphQL
// routes (the REST OAuth callback in the calendar-sync ticket, health checks) -
// only GraphQL operations carry identity requirements.
@Injectable()
export class IdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType<GqlContextType>() !== 'graphql') {
      return true;
    }

    const req = GqlExecutionContext.create(context).getContext<{
      req: Request;
    }>().req;

    const identity = parseIdentity(req);
    if (!identity) {
      throw new UnauthorizedException('Missing trusted identity headers');
    }

    (req as Request & { identity: Identity }).identity = identity;

    return true;
  }
}
