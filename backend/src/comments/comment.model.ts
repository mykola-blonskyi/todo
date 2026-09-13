import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PublicUser } from '../users/public-user.model';

@ObjectType()
export class Comment {
  @Field(() => ID)
  id: string;

  @Field()
  body: string;

  @Field()
  createdAt: Date;

  @Field(() => PublicUser)
  author?: PublicUser;

  authorId: string;
  taskId: string | null;
  listId: string | null;
}
