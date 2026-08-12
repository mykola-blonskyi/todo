import type { Collaborator } from '@features/list-sharing';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
}

export interface ListDetailData {
  id: string;
  title: string;
  isOwner: boolean;
  tasks: Task[];
  collaborators: Collaborator[];
  templateId: string | null;
}
