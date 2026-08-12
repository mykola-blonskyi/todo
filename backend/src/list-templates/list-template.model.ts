import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ListTemplateRecurrenceType, ListTemplateStatus } from '@prisma/client';

registerEnumType(ListTemplateRecurrenceType, {
  name: 'ListTemplateRecurrenceType',
});
registerEnumType(ListTemplateStatus, { name: 'ListTemplateStatus' });

@ObjectType()
export class ListTemplate {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => [String])
  taskTitles: string[];

  @Field(() => ListTemplateRecurrenceType)
  recurrenceType: ListTemplateRecurrenceType;

  @Field(() => [Int])
  weekDays: number[];

  @Field(() => Int, { nullable: true })
  dayOfMonth: number | null;

  @Field(() => Int, { nullable: true })
  intervalDays: number | null;

  @Field()
  timezone: string;

  @Field(() => ListTemplateStatus)
  status: ListTemplateStatus;

  @Field(() => Date, { nullable: true })
  lastSpawnedAt: Date | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  ownerId: string;
}
