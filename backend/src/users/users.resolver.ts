import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './user.model';
import { UsersService } from './users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { UserLocale, UserTheme } from '@prisma/client';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  me(@CurrentUser() identity: Identity) {
    return this.usersService.findOrCreateByIdentity(identity);
  }

  @Mutation(() => User)
  async updateTheme(
    @CurrentUser() identity: Identity,
    @Args('theme', { type: () => UserTheme }) theme: UserTheme,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.usersService.updateTheme(user.id, theme);
  }

  @Mutation(() => User)
  async updateLocale(
    @CurrentUser() identity: Identity,
    @Args('locale', { type: () => UserLocale }) locale: UserLocale,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.usersService.updateLocale(user.id, locale);
  }
}
