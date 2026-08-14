import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { GqlContext, GqlLoaders } from './loaders';

// Mirrors current-user.decorator.ts's pattern - reads the per-request
// loaders built in the Apollo context factory (see app.module.ts).
export const Loaders = createParamDecorator(
  (_data: unknown, context: ExecutionContext): GqlLoaders => {
    return GqlExecutionContext.create(context).getContext<GqlContext>().loaders;
  },
);
