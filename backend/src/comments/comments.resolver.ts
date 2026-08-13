import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { Comment } from './comment.model';
import { CommentsService } from './comments.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';

@Resolver(() => Comment)
export class CommentsResolver {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly usersService: UsersService,
  ) {}

  @Mutation(() => Comment)
  async addComment(
    @CurrentUser() identity: Identity,
    @Args('body') body: string,
    @Args('taskId', { type: () => ID, nullable: true }) taskId?: string,
    @Args('listId', { type: () => ID, nullable: true }) listId?: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.commentsService.addComment(user.id, taskId, listId, body);
  }
}
