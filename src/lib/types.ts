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
  editable: boolean;
}

export type GoalTimeframe = "short" | "medium" | "long";
export type GoalStatus = "active" | "completed" | "paused";

export interface Goal {
  id: string;
  title: string;
  timeframe: GoalTimeframe;
  description: string;
  projects: string[]; // linked Obsidian project names
  status: GoalStatus;
  createdAt: string;
}

export interface GoalsFile {
  goals: Goal[];
}
