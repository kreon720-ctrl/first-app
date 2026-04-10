import { describe, it, expect, beforeEach } from 'vitest';
import { useTeamStore } from '@/store/teamStore';

describe('Team Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const today = new Date();
    useTeamStore.setState({
      selectedTeamId: null,
      selectedDate: today.toISOString().split('T')[0],
      calendarView: 'month',
    });
  });

  it('should have initial state', () => {
    const state = useTeamStore.getState();
    expect(state.selectedTeamId).toBeNull();
    expect(state.selectedDate).toBeDefined();
    expect(state.calendarView).toBe('month');
  });

  describe('setSelectedTeamId', () => {
    it('should set selected team ID', () => {
      const teamId = 'test-team-id';
      useTeamStore.getState().setSelectedTeamId(teamId);

      const state = useTeamStore.getState();
      expect(state.selectedTeamId).toBe(teamId);
    });
  });

  describe('setSelectedDate', () => {
    it('should set selected date', () => {
      const date = '2026-04-15';
      useTeamStore.getState().setSelectedDate(date);

      const state = useTeamStore.getState();
      expect(state.selectedDate).toBe(date);
    });
  });

  describe('setCalendarView', () => {
    it('should set calendar view to week', () => {
      useTeamStore.getState().setCalendarView('week');

      const state = useTeamStore.getState();
      expect(state.calendarView).toBe('week');
    });

    it('should set calendar view to day', () => {
      useTeamStore.getState().setCalendarView('day');

      const state = useTeamStore.getState();
      expect(state.calendarView).toBe('day');
    });

    it('should set calendar view to month', () => {
      useTeamStore.getState().setCalendarView('month');

      const state = useTeamStore.getState();
      expect(state.calendarView).toBe('month');
    });
  });

  describe('resetSelectedDate', () => {
    it('should reset date to today', () => {
      // First set a different date
      useTeamStore.getState().setSelectedDate('2026-01-01');

      // Then reset
      useTeamStore.getState().resetSelectedDate();

      const state = useTeamStore.getState();
      const today = new Date();
      const expectedToday = today.toISOString().split('T')[0];
      expect(state.selectedDate).toBe(expectedToday);
    });
  });
});
