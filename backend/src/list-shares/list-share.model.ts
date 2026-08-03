import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ListShareStatus } from '@prisma/client';
import { List } from '../lists/list.model';
import { User } from '../users/user.model';

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

  @Field(() => List)
  list?: List;

  @Field(() => User)
  user?: User;

  listId: string;
  userId: string;
}
