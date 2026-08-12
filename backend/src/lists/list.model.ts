import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Task } from '../tasks/task.model';
import { User } from '../users/user.model';

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

  @Field(() => [Task])
  tasks?: Task[];

  @Field(() => Boolean)
  isOwner?: boolean;

  @Field(() => [User])
  collaborators?: User[];

  // Provenance only - set if this List was spawned by a ListTemplate
  // Occurrence (knowledge/domain-model.md List.templateId), null for a
  // manually-created List. Cleared, not cascaded, if the template is later
  // deleted (business-rules.md Rule 17).
  @Field(() => ID, { nullable: true })
  templateId: string | null;

  ownerId: string;
}
