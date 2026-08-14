import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Task } from '../tasks/task.model';
import { User } from '../users/user.model';
import { Comment } from '../comments/comment.model';
import { Category } from '../categories/category.model';

@ObjectType()
export class List {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  // Date-only semantics, no time-of-day - same convention as Task.dueDate.
  // Used only to gate/date Google Calendar sync (business-rules.md Rule 8).
  @Field(() => Date, { nullable: true })
  dueDate: Date | null;

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

  @Field(() => [Comment])
  comments?: Comment[];

  // The caller's own Category for this List, if any - per-User, independent
  // of any other User's assignment on the same shared List (Rule 22).
  @Field(() => Category, { nullable: true })
  myCategory?: Category | null;

  // Provenance only - set if this List was spawned by a ListTemplate
  // Occurrence (knowledge/domain-model.md List.templateId), null for a
  // manually-created List. Cleared, not cascaded, if the template is later
  // deleted (business-rules.md Rule 17).
  @Field(() => ID, { nullable: true })
  templateId: string | null;

  ownerId: string;
}
