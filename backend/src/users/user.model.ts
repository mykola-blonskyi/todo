import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserLocale, UserTheme } from '@prisma/client';

registerEnumType(UserLocale, { name: 'UserLocale' });
registerEnumType(UserTheme, { name: 'UserTheme' });

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  image?: string | null;

  @Field(() => UserLocale)
  locale: UserLocale;

  @Field(() => UserTheme)
  theme: UserTheme;

  @Field(() => Boolean)
  googleCalendarConnected?: boolean;
}
