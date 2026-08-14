import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Category } from './category.model';
import { CategoriesService } from './categories.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver(() => Category)
export class CategoriesResolver {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => [Category])
  async myCategories(@CurrentUser() identity: Identity) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.categoriesService.myCategories(user.id);
  }

  @Mutation(() => Category)
  async createCategory(
    @CurrentUser() identity: Identity,
    @Args('name') name: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.categoriesService.createCategory(user.id, name);
  }

  @Mutation(() => Category)
  async renameCategory(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
    @Args('name') name: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.categoriesService.renameCategory(user.id, id, name);
  }

  @Mutation(() => Boolean)
  async deleteCategory(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.categoriesService.deleteCategory(user.id, id);
  }
}
