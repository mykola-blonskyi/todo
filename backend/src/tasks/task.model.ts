import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Comment } from '../comments/comment.model';

@ObjectType()
export class Task {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  done: boolean;

  @Field(() => Date, { nullable: true })
  dueDate: Date | null;

  @Field(() => Int)
  position: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [Comment])
  comments?: Comment[];
}
