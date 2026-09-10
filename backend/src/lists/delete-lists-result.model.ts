import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DeleteListsResult {
  @Field(() => [ID])
  deletedIds: string[];

  @Field(() => [ID])
  failedIds: string[];
}
