import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Task } from '../tasks/task.model';

@ObjectType()
export class List {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [Task])
  tasks?: Task[];
}
