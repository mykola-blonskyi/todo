import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BulkDeleteResult {
  @Field(() => [ID])
  deletedIds: string[];

  @Field(() => [ID])
  failedIds: string[];
}
