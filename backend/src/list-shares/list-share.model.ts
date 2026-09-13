import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ListShareStatus } from '@prisma/client';
import { ListSummary } from '../lists/list-summary.model';
import { PublicUser } from '../users/public-user.model';

registerEnumType(ListShareStatus, { name: 'ListShareStatus' });

@ObjectType()
export class ListShare {
  @Field(() => ID)
  id: string;

  @Field(() => ListShareStatus)
  status: ListShareStatus;

  @Field()
  invitedAt: Date;

  @Field(() => Date, { nullable: true })
  respondedAt: Date | null;

  @Field(() => ListSummary)
  list?: ListSummary;

  @Field(() => PublicUser)
  user?: PublicUser;

  listId: string;
  userId: string;
}
