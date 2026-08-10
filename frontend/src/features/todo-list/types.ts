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
}
