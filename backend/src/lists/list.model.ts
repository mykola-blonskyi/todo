import { Field, ID, ObjectType } from '@nestjs/graphql';

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
}
