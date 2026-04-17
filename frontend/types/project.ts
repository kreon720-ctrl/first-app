// Project Gantt types

export type GanttBarColor = 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose';
export const GANTT_BAR_COLORS: GanttBarColor[] = ['indigo', 'blue', 'emerald', 'amber', 'rose'];

export interface ProjectPhase {
  id: string;
  name: string;
  order: number;
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  progress: number;  // 0-100
  manager: string;
  phases: ProjectPhase[];
  createdBy: string;
  createdAt: string;
}

export interface ProjectSchedule {
  id: string;
  projectId: string;
  teamId: string;
  title: string;
  color: GanttBarColor;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description: string;
  leader: string;
  progress: number;
  isDelayed: boolean;
  phaseId: string;
  createdBy: string;
  createdAt: string;
}

export interface ProjectCreateInput {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  manager: string;
  phases: { name: string }[];
}

export interface ProjectScheduleCreateInput {
  title: string;
  color: GanttBarColor;
  startDate: string;
  endDate: string;
  description: string;
  leader: string;
  progress: number;
  isDelayed: boolean;
  phaseId: string;
}
