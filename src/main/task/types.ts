export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const TASK_STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDateTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  dueDateTime: string;
}

export interface StatusPresentation {
  label: string;
  colour: string;
}

const PRESENTATION: Record<TaskStatus, StatusPresentation> = {
  PENDING: { label: 'Pending', colour: 'grey' },
  IN_PROGRESS: { label: 'In progress', colour: 'blue' },
  COMPLETED: { label: 'Completed', colour: 'green' },
  CANCELLED: { label: 'Cancelled', colour: 'red' },
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as string[]).includes(value);
}

export function statusPresentation(status: TaskStatus): StatusPresentation {
  return PRESENTATION[status];
}

export function statusOptions(selected?: string): { value: TaskStatus; text: string; checked: boolean }[] {
  return TASK_STATUSES.map(status => ({
    value: status,
    text: PRESENTATION[status].label,
    checked: status === selected,
  }));
}
