// Schedule types

export type CalendarView = 'month' | 'week' | 'day';

export interface Schedule {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleCreateInput {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
}

export type ScheduleUpdateInput = Partial<ScheduleCreateInput>;

export interface ScheduleQueryParams {
  view?: CalendarView;
  date?: string; // YYYY-MM-DD
}

export interface ScheduleListResponse {
  schedules: Schedule[];
  view: CalendarView;
  date: string;
}
