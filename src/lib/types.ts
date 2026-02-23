export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type TaskAssignee = "raul" | "serman";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: TaskAssignee;
  project?: string;
  filePath: string;
  lineNumber: number;
  editable: boolean; // true only for tasks in Mission Control Tasks.md
}
