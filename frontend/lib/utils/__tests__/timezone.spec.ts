import { describe, it, expect } from 'vitest';
import {
  utcToKST,
  kstToUTC,
  getTodayKST,
  formatDate,
  formatDateKorean,
  formatTime,
  formatDateTimeKorean,
  getMonthRangeUTC,
  getWeekRangeUTC,
  getDayRangeUTC,
  parseDate,
  addDays,
  addMonths,
  KST_OFFSET_MINUTES,
} from '@/lib/utils/timezone';

describe('Timezone Utilities', () => {
  describe('KST_OFFSET_MINUTES', () => {
    it('should be 540 minutes (9 hours)', () => {
      expect(KST_OFFSET_MINUTES).toBe(540);
    });
  });

  describe('utcToKST', () => {
    it('should convert UTC date to KST date', () => {
      // UTC 2026-04-09 00:00:00 = KST 2026-04-09 09:00:00
      const utcDate = new Date('2026-04-09T00:00:00Z');
      const kstDate = utcToKST(utcDate);
      
      // KST is 9 hours ahead, so 00:00 UTC = 09:00 KST
      const kstHour = kstDate.getUTCHours();
      expect(kstHour).toBe(9);
    });

    it('should convert ISO string to KST date', () => {
      // UTC 2026-04-09 15:00:00 = KST 2026-04-10 00:00:00
      const kstDate = utcToKST('2026-04-09T15:00:00Z');
      // Should be midnight next day (00:00 KST)
      expect(kstDate.getUTCHours()).toBe(0);
      expect(kstDate.getUTCDate()).toBe(10);
    });
  });

  describe('kstToUTC', () => {
    it('should convert KST date to UTC date', () => {
      // KST 2026-04-09 09:00:00 = UTC 2026-04-09 00:00:00
      // Create a date that represents KST time
      const kstDate = new Date('2026-04-09T09:00:00');
      const utcDate = kstToUTC(kstDate);
      
      // Should be 9 hours earlier (00:00)
      expect(utcDate.getHours()).toBe(kstDate.getHours() - 9);
    });
  });

  describe('getTodayKST', () => {
    it('should return today date in YYYY-MM-DD format', () => {
      const today = getTodayKST();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(today).toMatch(dateRegex);
    });

    it('should return valid date', () => {
      const today = getTodayKST();
      const date = new Date(today);
      expect(date instanceof Date).toBe(true);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2026-04-09T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2026-04-09');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2026-01-05T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2026-01-05');
    });
  });

  describe('formatDateKorean', () => {
    it('should format date to Korean locale string', () => {
      const date = new Date('2026-04-09T12:00:00Z');
      const formatted = formatDateKorean(date);
      expect(formatted).toContain('년');
      expect(formatted).toContain('월');
      expect(formatted).toContain('일');
    });

    it('should include weekday', () => {
      const date = new Date('2026-04-09T00:00:00Z'); // April 9, 2026 is Thursday
      const formatted = formatDateKorean(date);
      expect(formatted).toContain('(목)');
    });
  });

  describe('formatTime', () => {
    it('should format UTC time to KST HH:MM', () => {
      // When in KST timezone, UTC 03:30 becomes KST 12:30
      // But the Date object is created in local timezone, so we test the conversion logic
      const date = new Date(Date.UTC(2026, 3, 9, 3, 30, 0)); // April 9, 2026 03:30 UTC
      const formatted = formatTime(date);
      // In KST (UTC+9), this should be 12:30
      expect(formatted).toBe('12:30');
    });

    it('should pad single-digit hours and minutes', () => {
      const date = new Date(Date.UTC(2026, 3, 9, 0, 5, 0)); // April 9, 2026 00:05 UTC
      const formatted = formatTime(date);
      // In KST (UTC+9), this should be 09:05
      expect(formatted).toBe('09:05');
    });
  });

  describe('formatDateTimeKorean', () => {
    it('should format datetime with date and time', () => {
      const date = new Date('2026-04-09T03:30:00Z');
      const formatted = formatDateTimeKorean(date);
      expect(formatted).toContain('년');
      expect(formatted).toContain(':');
    });
  });

  describe('getMonthRangeUTC', () => {
    it('should return start and end of month in UTC', () => {
      const range = getMonthRangeUTC(2026, 4);
      
      expect(range.startAt).toBeDefined();
      expect(range.endAt).toBeDefined();
      
      const start = new Date(range.startAt);
      const end = new Date(range.endAt);
      
      // April 1st 00:00 KST
      expect(start.getUTCMonth()).toBe(2); // March (because of KST offset)
      expect(end.getUTCMonth()).toBe(3); // April
    });
  });

  describe('getWeekRangeUTC', () => {
    it('should return start and end of week in UTC', () => {
      const date = new Date('2026-04-09T12:00:00Z'); // Thursday
      const range = getWeekRangeUTC(date);
      
      expect(range.startAt).toBeDefined();
      expect(range.endAt).toBeDefined();
      
      const start = new Date(range.startAt);
      const end = new Date(range.endAt);
      
      // Should be 7 days apart
      const diffTime = end.getTime() - start.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });
  });

  describe('getDayRangeUTC', () => {
    it('should return start and end of day in UTC', () => {
      const date = new Date('2026-04-09T12:00:00Z');
      const range = getDayRangeUTC(date);
      
      expect(range.startAt).toBeDefined();
      expect(range.endAt).toBeDefined();
      
      const start = new Date(range.startAt);
      const end = new Date(range.endAt);
      
      // Should be 1 day apart
      const diffTime = end.getTime() - start.getTime();
      const diffHours = diffTime / (1000 * 60 * 60);
      expect(diffHours).toBe(24);
    });
  });

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD string to Date', () => {
      const date = parseDate('2026-04-09');
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(3); // April (0-indexed)
      expect(date.getUTCDate()).toBe(9);
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const date = new Date('2026-04-09T00:00:00Z');
      const result = addDays(date, 5);
      expect(result.getUTCDate()).toBe(14);
    });

    it('should handle negative days', () => {
      const date = new Date('2026-04-09T00:00:00Z');
      const result = addDays(date, -5);
      expect(result.getUTCDate()).toBe(4);
    });

    it('should accept string date', () => {
      const result = addDays('2026-04-09', 1);
      expect(result).toBeDefined();
    });
  });

  describe('addMonths', () => {
    it('should add months to date', () => {
      const date = new Date('2026-04-09T00:00:00Z');
      const result = addMonths(date, 2);
      expect(result.getUTCMonth()).toBe(5); // June
    });

    it('should handle year overflow', () => {
      const date = new Date('2026-11-09T00:00:00Z');
      const result = addMonths(date, 3);
      expect(result.getUTCFullYear()).toBe(2027);
      expect(result.getUTCMonth()).toBe(1); // February
    });
  });
});
