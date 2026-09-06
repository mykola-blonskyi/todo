import type { LayoutViews } from '../types';
import { Shell } from './Shell';
import { ListsPage } from './ListsPage';
import { ListDetailPage } from './ListDetailPage';
import { TemplatesPage } from './TemplatesPage';
import { TemplateFormPage } from './TemplateFormPage';
import { CategoriesPage } from './CategoriesPage';
import { SettingsPage } from './SettingsPage';
import { LoginPage } from './LoginPage';

export const notebook: LayoutViews = {
  Shell,
  ListsPage,
  ListDetailPage,
  TemplatesPage,
  TemplateFormPage,
  CategoriesPage,
  SettingsPage,
  LoginPage,
};
