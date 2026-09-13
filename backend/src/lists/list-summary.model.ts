import { Field, ID, ObjectType } from '@nestjs/graphql';

// The List an invite points at, as much of it as the invitee may see. A
// pending or declined invitee has no access to the List itself (Rule 3,
// and lists.service.ts's requireAccess), so ListShare.list cannot be a
// `List` - that let an invitee read tasks, comments and collaborators of a
// List they had not accepted.
@ObjectType()
export class ListSummary {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;
}
