import { Field, ID, ObjectType } from '@nestjs/graphql';
import { User } from '../users/user.model';

@ObjectType()
export class Comment {
  @Field(() => ID)
  id: string;

  @Field()
  body: string;

  @Field()
  createdAt: Date;

  @Field(() => User)
  author?: User;

  authorId: string;
  taskId: string | null;
  listId: string | null;
}
