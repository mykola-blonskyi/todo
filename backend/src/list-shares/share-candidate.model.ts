import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ShareCandidate {
  @Field(() => ID)
  hubUserId: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  image: string | null;
}
