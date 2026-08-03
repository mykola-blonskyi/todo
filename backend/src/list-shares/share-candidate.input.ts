import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ShareCandidateInput {
  @Field(() => ID)
  hubUserId: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  image: string | null;
}
