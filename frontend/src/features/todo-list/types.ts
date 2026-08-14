import type { Collaborator } from '@features/list-sharing';
import type { Comment } from '@features/comments';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  comments: Comment[];
}

export interface ListDetailData {
  id: string;
  title: string;
  dueDate: string | null;
  isOwner: boolean;
  tasks: Task[];
  collaborators: Collaborator[];
  templateId: string | null;
  comments: Comment[];
  myCategory: { id: string; name: string } | null;
}
