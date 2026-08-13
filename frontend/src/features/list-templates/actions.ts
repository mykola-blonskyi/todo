'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from '@shared/lib/i18n/navigation';
import { getLocale } from 'next-intl/server';
import { graphqlFetch } from '@shared/lib/graphql-client';
import type { RecurrenceType } from './types';
import type { ShareCandidate } from '@features/list-sharing';

export interface TemplateFormInput {
  title: string;
  taskTitles: string[];
  recurrenceType: RecurrenceType;
  weekDays?: number[];
  dayOfMonth?: number | null;
  intervalDays?: number | null;
  streakDays?: number | null;
  streakStartDate?: string | null;
  timezone: string;
}

export async function createListTemplateAction(input: TemplateFormInput) {
  const data = await graphqlFetch<{ createListTemplate: { id: string } }>(
    `mutation CreateListTemplate($title: String!, $taskTitles: [String!]!, $recurrenceType: ListTemplateRecurrenceType!, $timezone: String!, $weekDays: [Int!], $dayOfMonth: Int, $intervalDays: Int, $streakDays: Int, $streakStartDate: DateTime) {
      createListTemplate(title: $title, taskTitles: $taskTitles, recurrenceType: $recurrenceType, timezone: $timezone, weekDays: $weekDays, dayOfMonth: $dayOfMonth, intervalDays: $intervalDays, streakDays: $streakDays, streakStartDate: $streakStartDate) { id }
    }`,
    { ...input },
  );

  revalidatePath('/[locale]/templates', 'page');
  const locale = await getLocale();
  redirect({ href: `/templates/${data.createListTemplate.id}`, locale });
}

export async function updateListTemplateAction(
  id: string,
  input: TemplateFormInput,
) {
  await graphqlFetch(
    `mutation UpdateListTemplate($id: ID!, $title: String, $taskTitles: [String!], $recurrenceType: ListTemplateRecurrenceType, $timezone: String, $weekDays: [Int!], $dayOfMonth: Int, $intervalDays: Int, $streakDays: Int, $streakStartDate: DateTime) {
      updateListTemplate(id: $id, title: $title, taskTitles: $taskTitles, recurrenceType: $recurrenceType, timezone: $timezone, weekDays: $weekDays, dayOfMonth: $dayOfMonth, intervalDays: $intervalDays, streakDays: $streakDays, streakStartDate: $streakStartDate) { id }
    }`,
    { ...input, id },
  );

  revalidatePath('/[locale]/templates/[id]', 'page');
}

export async function pauseListTemplateAction(id: string) {
  await graphqlFetch(
    `mutation PauseListTemplate($id: ID!) { pauseListTemplate(id: $id) { id } }`,
    { id },
  );

  revalidatePath('/[locale]/templates', 'page');
  revalidatePath('/[locale]/templates/[id]', 'page');
}

export async function resumeListTemplateAction(id: string) {
  await graphqlFetch(
    `mutation ResumeListTemplate($id: ID!) { resumeListTemplate(id: $id) { id } }`,
    { id },
  );

  revalidatePath('/[locale]/templates', 'page');
  revalidatePath('/[locale]/templates/[id]', 'page');
}

export async function deleteListTemplateAction(id: string) {
  await graphqlFetch(
    `mutation DeleteListTemplate($id: ID!) { deleteListTemplate(id: $id) }`,
    { id },
  );

  revalidatePath('/[locale]/templates', 'page');
  const locale = await getLocale();
  redirect({ href: '/templates', locale });
}

export async function searchTemplateCandidatesAction(
  templateId: string,
  q: string,
): Promise<ShareCandidate[]> {
  if (!q.trim()) {
    return [];
  }

  const data = await graphqlFetch<{
    searchTemplateCandidates: ShareCandidate[];
  }>(
    `query SearchTemplateCandidates($templateId: ID!, $q: String!) {
      searchTemplateCandidates(templateId: $templateId, q: $q) {
        hubUserId
        email
        name
        image
      }
    }`,
    { templateId, q },
  );

  return data.searchTemplateCandidates;
}

export async function addTemplateCollaboratorAction(
  templateId: string,
  candidate: ShareCandidate,
) {
  await graphqlFetch(
    `mutation AddTemplateCollaborator($templateId: ID!, $candidate: ShareCandidateInput!) {
      addTemplateCollaborator(templateId: $templateId, candidate: $candidate) { id }
    }`,
    { templateId, candidate },
  );

  revalidatePath('/[locale]/templates/[id]', 'page');
}

export async function removeTemplateCollaboratorAction(
  templateId: string,
  targetUserId: string,
) {
  await graphqlFetch(
    `mutation RemoveTemplateCollaborator($templateId: ID!, $targetUserId: ID!) {
      removeTemplateCollaborator(templateId: $templateId, targetUserId: $targetUserId)
    }`,
    { templateId, targetUserId },
  );

  revalidatePath('/[locale]/templates/[id]', 'page');
}
