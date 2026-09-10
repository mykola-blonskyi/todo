import type { ComponentType, ReactNode } from 'react';
import type { Appearance } from '@features/preferences';
import type { Category } from '@features/categories';
import type { Collaborator, PendingInvite } from '@features/list-sharing';
import type { ListDetailData } from '@features/todo-list';
import type { ListTemplate } from '@features/list-templates';

// ─── Data shapes shared by every layout ─────────────────────────────────────

export interface TaskOverview {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
}

// Everything the overview screens need about a List without opening it:
// progress, due date, category, people. Fetched once per request by
// layouts/data.ts and shared between the shell (nav counts) and the page.
export interface ListOverview {
  id: string;
  title: string;
  dueDate: string | null;
  updatedAt: string;
  templateId: string | null;
  // Spawn time of the List. For a template-spawned one (templateId set) this
  // is its Occurrence date - what the overview renders to tell sibling
  // Occurrences apart.
  createdAt: string;
  isOwner: boolean;
  myCategory: { id: string; name: string } | null;
  tasks: TaskOverview[];
  collaborators: Collaborator[];
}

export interface TemplateOverview {
  id: string;
  title: string;
  status: 'active' | 'paused';
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  googleCalendarConnected: boolean;
}

// What a shell needs to draw its navigation. null on unauthenticated pages
// (login), where there is no identity to load it for.
export interface NavData {
  user: CurrentUser;
  lists: ListOverview[];
  categories: Category[];
  pendingInvites: PendingInvite[];
  templates: TemplateOverview[];
}

// URL-driven category filter on the overview (same query params the
// pre-layouts CategoryFilter used: ?categoryId=… / ?uncategorized=true).
export interface CategoryFilterState {
  categoryId: string | null;
  uncategorizedOnly: boolean;
}

// ─── Per-page props ─────────────────────────────────────────────────────────

export interface ShellProps {
  locale: string;
  appearance: Appearance;
  nav: NavData | null;
  children: ReactNode;
}

export interface ListsPageProps {
  nav: NavData;
  // Already filtered by `filter` - layouts render what they get.
  lists: ListOverview[];
  filter: CategoryFilterState;
}

export interface ListDetailPageProps {
  nav: NavData;
  list: ListDetailData;
}

export interface TemplatesPageProps {
  nav: NavData;
  templates: ListTemplate[];
}

export interface TemplateFormPageProps {
  nav: NavData;
  // undefined → "new template" form
  template?: ListTemplate;
  templates: ListTemplate[];
}

export interface CategoriesPageProps {
  nav: NavData;
  categories: Category[];
}

export interface SettingsPageProps {
  nav: NavData;
  locale: string;
  appearance: Appearance;
  googleCalendarBanner: 'connected' | 'error' | null;
}

export interface LoginPageProps {
  locale: string;
  appearance: Appearance;
  callbackUrl?: string;
}

// One entry per layout in layouts/registry.ts. Every layout implements every
// screen (the whole UX changes, not just the skin - see the layouts ADR).
export interface LayoutViews {
  Shell: ComponentType<ShellProps>;
  ListsPage: ComponentType<ListsPageProps>;
  ListDetailPage: ComponentType<ListDetailPageProps>;
  TemplatesPage: ComponentType<TemplatesPageProps>;
  TemplateFormPage: ComponentType<TemplateFormPageProps>;
  CategoriesPage: ComponentType<CategoriesPageProps>;
  SettingsPage: ComponentType<SettingsPageProps>;
  LoginPage: ComponentType<LoginPageProps>;
}
