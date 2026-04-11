// Team Store - manages team-related state

import { create } from 'zustand';
import { CalendarView } from '@/types/schedule';

interface TeamState {
  selectedTeamId: string | null;
  selectedDate: string; // YYYY-MM-DD
  calendarView: CalendarView;

  // Actions
  setSelectedTeamId: (teamId: string) => void;
  setSelectedDate: (date: string) => void;
  setCalendarView: (view: CalendarView) => void;
  resetSelectedDate: () => void;
}

// Get today's date in KST (UTC+9)
const getTodayKST = (): string => {
  const now = new Date();
  const kstOffset = 9 * 60; // 9 hours in minutes
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + kstOffset * 60000);
  return kst.toISOString().split('T')[0];
};

export const useTeamStore = create<TeamState>((set) => ({
  selectedTeamId: null,
  selectedDate: getTodayKST(),
  calendarView: 'month',

  setSelectedTeamId: (teamId: string) => {
    set({ selectedTeamId: teamId });
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },

  setCalendarView: (view: CalendarView) => {
    set({ calendarView: view, selectedDate: getTodayKST() });
  },

  resetSelectedDate: () => {
    set({ selectedDate: getTodayKST() });
  },
}));
