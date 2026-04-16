import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  getProjectWeeks,
  groupWeeksByMonth,
  getWeekOfMonth,
  getWeekIndex,
  isMonthBoundary,
} from '../ganttUtils';

describe('ganttUtils', () => {
  describe('getWeekStart', () => {
    it('returns Sunday for a Wednesday', () => {
      // 2026-04-15 is a Wednesday
      const result = getWeekStart('2026-04-15');
      // Sunday of that week is 2026-04-12
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(3); // April = 3 (0-indexed)
      expect(result.getUTCDate()).toBe(12);
      expect(result.getUTCDay()).toBe(0); // Sunday
    });

    it('returns the same day for a Sunday', () => {
      // 2026-04-12 is a Sunday
      const result = getWeekStart('2026-04-12');
      expect(result.getUTCDate()).toBe(12);
      expect(result.getUTCDay()).toBe(0);
    });

    it('returns Sunday for a Saturday', () => {
      // 2026-04-18 is a Saturday
      const result = getWeekStart('2026-04-18');
      expect(result.getUTCDate()).toBe(12);
      expect(result.getUTCDay()).toBe(0);
    });

    it('handles month boundaries correctly', () => {
      // 2026-05-01 is a Friday → Sunday is 2026-04-26
      const result = getWeekStart('2026-05-01');
      expect(result.getUTCMonth()).toBe(3); // April
      expect(result.getUTCDate()).toBe(26);
    });
  });

  describe('getProjectWeeks', () => {
    it('returns at least one week for single-week project', () => {
      const weeks = getProjectWeeks('2026-04-13', '2026-04-17');
      expect(weeks.length).toBeGreaterThanOrEqual(1);
      // All should be Sundays
      weeks.forEach((w) => expect(w.getUTCDay()).toBe(0));
    });

    it('returns correct number of weeks for multi-month project', () => {
      // Jan 1 to Mar 31 spans ~13 weeks
      const weeks = getProjectWeeks('2026-01-01', '2026-03-31');
      expect(weeks.length).toBeGreaterThan(10);
      expect(weeks.length).toBeLessThan(16);
    });

    it('first week contains startDate', () => {
      const start = '2026-04-15';
      const weeks = getProjectWeeks(start, '2026-05-15');
      const startDate = new Date(start + 'T00:00:00Z');
      expect(weeks[0] <= startDate).toBe(true);
      const nextWeek = new Date(weeks[0]);
      nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
      expect(nextWeek > startDate).toBe(true);
    });

    it('last week contains endDate', () => {
      const end = '2026-05-15';
      const weeks = getProjectWeeks('2026-04-01', end);
      const endDate = new Date(end + 'T00:00:00Z');
      const lastWeek = weeks[weeks.length - 1];
      expect(lastWeek <= endDate).toBe(true);
      const nextWeek = new Date(lastWeek);
      nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
      expect(nextWeek > endDate).toBe(true);
    });

    it('all returned dates are Sundays', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-06-30');
      weeks.forEach((w) => {
        expect(w.getUTCDay()).toBe(0);
      });
    });

    it('weeks are in ascending order with 7-day intervals', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-03-31');
      for (let i = 1; i < weeks.length; i++) {
        const diff = (weeks[i].getTime() - weeks[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        expect(diff).toBe(7);
      }
    });
  });

  describe('groupWeeksByMonth', () => {
    it('groups weeks into correct months', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-03-31');
      const groups = groupWeeksByMonth(weeks);

      expect(groups.length).toBeGreaterThanOrEqual(3);
      const months = groups.map((g) => g.month);
      expect(months).toContain(1); // January
      expect(months).toContain(2); // February
      expect(months).toContain(3); // March
    });

    it('each group has at least one week', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-06-30');
      const groups = groupWeeksByMonth(weeks);
      groups.forEach((g) => {
        expect(g.weeks.length).toBeGreaterThan(0);
        expect(g.weekIndices.length).toBeGreaterThan(0);
      });
    });

    it('weekIndices reference valid positions in weeks array', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-03-31');
      const groups = groupWeeksByMonth(weeks);

      groups.forEach((g) => {
        g.weekIndices.forEach((idx) => {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(weeks.length);
        });
      });
    });

    it('all weeks are covered exactly once', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-06-30');
      const groups = groupWeeksByMonth(weeks);
      const allIndices = groups.flatMap((g) => g.weekIndices).sort((a, b) => a - b);

      expect(allIndices.length).toBe(weeks.length);
      allIndices.forEach((idx, i) => {
        expect(idx).toBe(i);
      });
    });

    it('returns empty array for empty weeks', () => {
      const groups = groupWeeksByMonth([]);
      expect(groups).toEqual([]);
    });
  });

  describe('getWeekOfMonth', () => {
    it('returns 1 for the first week of the month', () => {
      // The first Sunday that is "in" April via Thursday rule
      // April 2026 starts on Wednesday (2026-04-01)
      // Week of 2026-03-29 (Sunday) → Thursday = 2026-04-02 → April → week 1
      const firstWeekSunday = new Date(Date.UTC(2026, 2, 29)); // March 29 2026
      expect(getWeekOfMonth(firstWeekSunday)).toBe(1);
    });

    it('returns 2 for the second week', () => {
      // Second week in April: Sunday 2026-04-05 → Thursday 2026-04-09 → April week 2
      const week2 = new Date(Date.UTC(2026, 3, 5));
      expect(getWeekOfMonth(week2)).toBe(2);
    });

    it('returns 1 for January first week', () => {
      // Jan 2026 starts on Thursday
      // Week starting 2025-12-28 (Sunday) → Thursday = 2026-01-01 → January → week 1
      const firstWeek = new Date(Date.UTC(2025, 11, 28));
      expect(getWeekOfMonth(firstWeek)).toBe(1);
    });

    it('always returns a positive number', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-12-31');
      weeks.forEach((w) => {
        const result = getWeekOfMonth(w);
        expect(result).toBeGreaterThan(0);
      });
    });
  });

  describe('getWeekIndex', () => {
    it('returns 0 for a date in the first week', () => {
      const weeks = getProjectWeeks('2026-04-01', '2026-06-30');
      // startDate itself should be in week 0
      const idx = getWeekIndex(weeks, '2026-04-01');
      expect(idx).toBe(0);
    });

    it('returns correct index for a date in the middle', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-12-31');
      // 2026-02-01 should be around week 4-5
      const idx = getWeekIndex(weeks, '2026-02-01');
      expect(idx).toBeGreaterThan(2);
      expect(idx).toBeLessThan(10);
    });

    it('returns 0 for empty weeks array', () => {
      expect(getWeekIndex([], '2026-01-01')).toBe(0);
    });

    it('returns last index for date after all weeks', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-03-31');
      const idx = getWeekIndex(weeks, '2030-01-01');
      expect(idx).toBe(weeks.length - 1);
    });

    it('returns 0 for date before first week', () => {
      const weeks = getProjectWeeks('2026-04-01', '2026-06-30');
      const idx = getWeekIndex(weeks, '2020-01-01');
      expect(idx).toBe(0);
    });

    it('date within a week maps to that week start index', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-12-31');
      // Find index for Wednesday of week 5
      const week5Start = weeks[5];
      const wednesday = new Date(week5Start);
      wednesday.setUTCDate(week5Start.getUTCDate() + 3);
      const dateStr = `${wednesday.getUTCFullYear()}-${String(wednesday.getUTCMonth() + 1).padStart(2, '0')}-${String(wednesday.getUTCDate()).padStart(2, '0')}`;

      const idx = getWeekIndex(weeks, dateStr);
      expect(idx).toBe(5);
    });
  });

  describe('isMonthBoundary', () => {
    it('returns true for the first week index of each month group', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-06-30');
      const groups = groupWeeksByMonth(weeks);

      groups.forEach((group) => {
        const firstIdx = group.weekIndices[0];
        expect(isMonthBoundary(groups, firstIdx)).toBe(true);
      });
    });

    it('returns false for non-boundary week indices', () => {
      const weeks = getProjectWeeks('2026-01-01', '2026-06-30');
      const groups = groupWeeksByMonth(weeks);

      // Find a group with more than one week
      const bigGroup = groups.find((g) => g.weekIndices.length > 1);
      if (bigGroup) {
        // The second week index in the group should NOT be a boundary
        const secondIdx = bigGroup.weekIndices[1];
        expect(isMonthBoundary(groups, secondIdx)).toBe(false);
      }
    });

    it('returns false for empty groups array', () => {
      expect(isMonthBoundary([], 0)).toBe(false);
      expect(isMonthBoundary([], 5)).toBe(false);
    });

    it('index 0 is a boundary (first week)', () => {
      const weeks = getProjectWeeks('2026-04-01', '2026-06-30');
      const groups = groupWeeksByMonth(weeks);
      // The very first week (index 0) must be the first week of some month
      expect(isMonthBoundary(groups, 0)).toBe(true);
    });
  });
});
