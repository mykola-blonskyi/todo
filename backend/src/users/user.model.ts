import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserLayout, UserLocale, UserPalette, UserTheme } from '@prisma/client';

registerEnumType(UserLocale, { name: 'UserLocale' });
registerEnumType(UserTheme, { name: 'UserTheme' });
registerEnumType(UserPalette, { name: 'UserPalette' });
registerEnumType(UserLayout, { name: 'UserLayout' });

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

  // Three independent appearance axes: light/dark mode, colour palette and
  // app layout - each switchable on its own from the frontend's Settings.
  @Field(() => UserTheme)
  theme: UserTheme;

  @Field(() => UserPalette)
  palette: UserPalette;

  @Field(() => UserLayout)
  layout: UserLayout;

  @Field(() => Boolean)
  googleCalendarConnected?: boolean;
}
