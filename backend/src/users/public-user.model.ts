import { Field, ID, ObjectType } from '@nestjs/graphql';

// Another User, as seen by someone who shares a List, a ListTemplate or a
// Comment thread with them. Deliberately not `User`: that type also carries
// locale, theme, palette, layout and the Google Calendar connection state,
// which are the person's own business and were readable by every
// collaborator through List.collaborators, ListShare.user and
// Comment.author.
@ObjectType()
export class PublicUser {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  image?: string | null;
}
