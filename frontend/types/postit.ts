import { ScheduleColor } from './schedule';

export interface PostIt {
  id: string;
  teamId: string;
  createdBy: string;
  creatorName: string | null;
  date: string;          // 'YYYY-MM-DD' (KST)
  color: ScheduleColor;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostItCreateInput {
  date: string;          // 'YYYY-MM-DD'
  color: ScheduleColor;
}

export interface PostItListResponse {
  postits: PostIt[];
}
