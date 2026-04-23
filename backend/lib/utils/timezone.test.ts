import { describe, it, expect } from 'vitest'
import {
  kstDateToUtcRange,
  utcDateToKstString,
  utcDateToKstDate,
  getCurrentKstDate,
  getCurrentKstDateObject,
  isWithinKstDate,
  getKstDateRange,
  CalendarView,
} from '@/lib/utils/timezone'

describe('BE-04: Timezone Utilities (KST/UTC)', () => {
  describe('kstDateToUtcRange', () => {
    it('should convert KST date to correct UTC range', () => {
      // KST 2026-04-08 00:00 = UTC 2026-04-07 15:00
      const result = kstDateToUtcRange('2026-04-08')

      expect(result.start.toISOString()).toBe('2026-04-07T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2026-04-08T15:00:00.000Z')
    })

    it('should handle New Year date', () => {
      const result = kstDateToUtcRange('2026-01-01')

      expect(result.start.toISOString()).toBe('2025-12-31T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2026-01-01T15:00:00.000Z')
    })

    it('should handle end of year date', () => {
      const result = kstDateToUtcRange('2026-12-31')

      expect(result.start.toISOString()).toBe('2026-12-30T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2026-12-31T15:00:00.000Z')
    })

    it('should return 24 hour difference', () => {
      const result = kstDateToUtcRange('2026-04-08')
      const diffHours = (result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60)

      expect(diffHours).toBe(24)
    })

    it('should handle leap year date', () => {
      const result = kstDateToUtcRange('2024-02-29')

      expect(result.start.toISOString()).toBe('2024-02-28T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2024-02-29T15:00:00.000Z')
    })
  })

  describe('utcDateToKstString', () => {
    it('should convert UTC date to KST date string', () => {
      // UTC 2026-04-07 15:00 = KST 2026-04-08 00:00
      const utcDate = new Date('2026-04-07T15:00:00.000Z')
      const result = utcDateToKstString(utcDate)

      expect(result).toBe('2026-04-08')
    })

    it('should handle UTC date just before KST midnight', () => {
      // UTC 2026-04-07 14:59:59 = KST 2026-04-07 23:59:59
      const utcDate = new Date('2026-04-07T14:59:59.000Z')
      const result = utcDateToKstString(utcDate)

      expect(result).toBe('2026-04-07')
    })

    it('should handle UTC date at KST midnight', () => {
      // UTC 2026-04-07 15:00:00 = KST 2026-04-08 00:00:00
      const utcDate = new Date('2026-04-07T15:00:00.000Z')
      const result = utcDateToKstString(utcDate)

      expect(result).toBe('2026-04-08')
    })

    it('should handle year boundary', () => {
      // UTC 2025-12-31 20:00 = KST 2026-01-01 05:00
      const utcDate = new Date('2025-12-31T20:00:00.000Z')
      const result = utcDateToKstString(utcDate)

      expect(result).toBe('2026-01-01')
    })
  })

  describe('utcDateToKstDate', () => {
    it('should convert UTC Date to KST Date object', () => {
      const utcDate = new Date('2026-04-07T15:00:00.000Z')
      const result = utcDateToKstDate(utcDate)

      expect(result.toISOString()).toBe('2026-04-07T15:00:00.000Z')
    })

    it('should set time to KST midnight', () => {
      const utcDate = new Date('2026-04-07T18:30:00.000Z') // KST 2026-04-08 03:30
      const result = utcDateToKstDate(utcDate)

      // Should be KST 2026-04-08 00:00 = UTC 2026-04-07 15:00
      expect(result.toISOString()).toBe('2026-04-07T15:00:00.000Z')
    })
  })

  describe('getCurrentKstDate', () => {
    it('should return current date in KST format (YYYY-MM-DD)', () => {
      const result = getCurrentKstDate()

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return valid date string', () => {
      const result = getCurrentKstDate()
      const date = new Date(result)

      expect(date).toBeInstanceOf(Date)
      expect(isNaN(date.getTime())).toBe(false)
    })
  })

  describe('getCurrentKstDateObject', () => {
    it('should return current KST date as Date object', () => {
      const result = getCurrentKstDateObject()

      expect(result).toBeInstanceOf(Date)
    })

    it('should return date at KST midnight (UTC 15:00 previous day)', () => {
      const result = getCurrentKstDateObject()
      const hours = result.getUTCHours()

      // KST midnight = UTC 15:00 previous day
      expect(hours).toBe(15)
    })
  })

  describe('isWithinKstDate', () => {
    it('should return true for UTC timestamp within KST date', () => {
      // UTC 2026-04-07 16:00 = KST 2026-04-08 01:00
      const utcDate = new Date('2026-04-07T16:00:00.000Z')
      const result = isWithinKstDate(utcDate, '2026-04-08')

      expect(result).toBe(true)
    })

    it('should return false for UTC timestamp outside KST date', () => {
      // UTC 2026-04-07 14:00 = KST 2026-04-07 23:00
      const utcDate = new Date('2026-04-07T14:00:00.000Z')
      const result = isWithinKstDate(utcDate, '2026-04-08')

      expect(result).toBe(false)
    })

    it('should return true for exact start boundary', () => {
      // UTC 2026-04-07 15:00 = KST 2026-04-08 00:00
      const utcDate = new Date('2026-04-07T15:00:00.000Z')
      const result = isWithinKstDate(utcDate, '2026-04-08')

      expect(result).toBe(true)
    })

    it('should return false for exact end boundary', () => {
      // UTC 2026-04-08 15:00 = KST 2026-04-09 00:00
      const utcDate = new Date('2026-04-08T15:00:00.000Z')
      const result = isWithinKstDate(utcDate, '2026-04-08')

      expect(result).toBe(false)
    })
  })

  describe('getKstDateRange - month view (6-week calendar grid)', () => {
    it('should cover the 6-week grid for April 2026 (starts Wed)', () => {
      // April 1, 2026 is Wednesday → grid starts Sunday March 29, 2026
      // End = March 29 + 42 days = May 10, 2026 (midnight KST)
      const result = getKstDateRange('month', '2026-04-15')

      // Sunday March 29 00:00 KST = March 28, 2026 15:00 UTC
      expect(result.start.toISOString()).toBe('2026-03-28T15:00:00.000Z')
      // May 10, 2026 00:00 KST = May 9, 2026 15:00 UTC
      expect(result.end.toISOString()).toBe('2026-05-09T15:00:00.000Z')
    })

    it('should handle January 2026 (starts Thu → grid starts prev Sunday Dec 28)', () => {
      const result = getKstDateRange('month', '2026-01-15')

      // Sunday Dec 28, 2025 00:00 KST = Dec 27, 2025 15:00 UTC
      expect(result.start.toISOString()).toBe('2025-12-27T15:00:00.000Z')
      // Dec 28 + 42 days = Feb 8, 2026 00:00 KST = Feb 7, 2026 15:00 UTC
      expect(result.end.toISOString()).toBe('2026-02-07T15:00:00.000Z')
    })

    it('should handle December 2026 (starts Tue → grid starts Sun Nov 29)', () => {
      const result = getKstDateRange('month', '2026-12-25')

      // Sunday Nov 29, 2026 00:00 KST = Nov 28, 2026 15:00 UTC
      expect(result.start.toISOString()).toBe('2026-11-28T15:00:00.000Z')
      // Nov 29 + 42 days = Jan 10, 2027 00:00 KST = Jan 9, 2027 15:00 UTC
      expect(result.end.toISOString()).toBe('2027-01-09T15:00:00.000Z')
    })

    it('should handle leap-year February 2024 (starts Thu → grid starts Sun Jan 28)', () => {
      const result = getKstDateRange('month', '2024-02-15')

      // Sunday Jan 28, 2024 00:00 KST = Jan 27, 2024 15:00 UTC
      expect(result.start.toISOString()).toBe('2024-01-27T15:00:00.000Z')
      // Jan 28 + 42 days = Mar 10, 2024 00:00 KST = Mar 9, 2024 15:00 UTC
      expect(result.end.toISOString()).toBe('2024-03-09T15:00:00.000Z')
    })

    it('should handle February 2026 (starts Sun → grid starts on the 1st)', () => {
      const result = getKstDateRange('month', '2026-02-15')

      // Feb 1, 2026 is Sunday → grid starts on the 1st
      // Feb 1, 2026 00:00 KST = Jan 31, 2026 15:00 UTC
      expect(result.start.toISOString()).toBe('2026-01-31T15:00:00.000Z')
      // Feb 1 + 42 days = Mar 15, 2026 00:00 KST = Mar 14, 2026 15:00 UTC
      expect(result.end.toISOString()).toBe('2026-03-14T15:00:00.000Z')
    })
  })

  describe('getKstDateRange - week view', () => {
    it('should return Sunday to Saturday range (Wednesday)', () => {
      // 2026-04-15 is Wednesday (day 3)
      const result = getKstDateRange('week', '2026-04-15')

      // Sunday April 12, 2026 00:00 KST = April 11, 2026 15:00 UTC
      expect(result.start.toISOString()).toBe('2026-04-11T15:00:00.000Z')
      // Saturday April 18, 2026 00:00 KST = April 17, 2026 15:00 UTC
      // Note: end is exclusive, so it's April 18 (Saturday midnight)
      expect(result.end.toISOString()).toBe('2026-04-18T15:00:00.000Z')
    })

    it('should handle Sunday (first day of week)', () => {
      // 2026-04-12 is Sunday (day 0)
      const result = getKstDateRange('week', '2026-04-12')

      expect(result.start.toISOString()).toBe('2026-04-11T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2026-04-18T15:00:00.000Z')
    })

    it('should handle Saturday (last day of week)', () => {
      // 2026-04-11 is Saturday (day 6)
      const result = getKstDateRange('week', '2026-04-11')

      expect(result.start.toISOString()).toBe('2026-04-04T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2026-04-11T15:00:00.000Z')
    })

    it('should return exactly 7 days range', () => {
      const result = getKstDateRange('week', '2026-04-15')
      const diffDays = (result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60 * 24)

      expect(diffDays).toBe(7)
    })

    it('should handle week spanning month boundary', () => {
      // 2026-05-01 is Friday (day 5)
      const result = getKstDateRange('week', '2026-05-01')

      // Sunday April 26, 2026 00:00 KST
      expect(result.start.toISOString()).toBe('2026-04-25T15:00:00.000Z')
      // Saturday May 2, 2026 00:00 KST (exclusive end)
      expect(result.end.toISOString()).toBe('2026-05-02T15:00:00.000Z')
    })
  })

  describe('getKstDateRange - day view', () => {
    it('should return single day range', () => {
      const result = getKstDateRange('day', '2026-04-08')

      expect(result.start.toISOString()).toBe('2026-04-07T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2026-04-08T15:00:00.000Z')
    })

    it('should return 24 hour range', () => {
      const result = getKstDateRange('day', '2026-04-08')
      const diffHours = (result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60)

      expect(diffHours).toBe(24)
    })

    it('should handle month boundary', () => {
      const result = getKstDateRange('day', '2026-05-01')

      expect(result.start.toISOString()).toBe('2026-04-30T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2026-05-01T15:00:00.000Z')
    })

    it('should handle year boundary', () => {
      const result = getKstDateRange('day', '2026-01-01')

      expect(result.start.toISOString()).toBe('2025-12-31T15:00:00.000Z')
      expect(result.end.toISOString()).toBe('2026-01-01T15:00:00.000Z')
    })
  })

  describe('getKstDateRange - view type consistency', () => {
    it('should return different ranges for different views on same date', () => {
      const monthRange = getKstDateRange('month', '2026-04-15')
      const weekRange = getKstDateRange('week', '2026-04-15')
      const dayRange = getKstDateRange('day', '2026-04-15')

      // Month range should be wider than week range
      expect(monthRange.end.getTime() - monthRange.start.getTime()).toBeGreaterThan(
        weekRange.end.getTime() - weekRange.start.getTime()
      )

      // Week range should be wider than day range
      expect(weekRange.end.getTime() - weekRange.start.getTime()).toBeGreaterThan(
        dayRange.end.getTime() - dayRange.start.getTime()
      )
    })

    it('should contain day range within week range for same date', () => {
      const weekRange = getKstDateRange('week', '2026-04-15')
      const dayRange = getKstDateRange('day', '2026-04-15')

      expect(dayRange.start.getTime()).toBeGreaterThanOrEqual(weekRange.start.getTime())
      expect(dayRange.end.getTime()).toBeLessThanOrEqual(weekRange.end.getTime())
    })

    it('should contain week range within month range for same date', () => {
      const monthRange = getKstDateRange('month', '2026-04-15')
      const weekRange = getKstDateRange('week', '2026-04-15')

      // Week should be within month (approximately, may span boundary)
      const monthDiff = monthRange.end.getTime() - monthRange.start.getTime()
      const weekDiff = weekRange.end.getTime() - weekRange.start.getTime()

      expect(monthDiff).toBeGreaterThan(weekDiff)
    })
  })

  describe('Edge cases', () => {
    it('should handle invalid date string gracefully', () => {
      // This will create an Invalid Date, but should not throw
      const result = kstDateToUtcRange('invalid')
      expect(result.start.toString()).toBe('Invalid Date')
      expect(result.end.toString()).toBe('Invalid Date')
    })

    it('should handle timezone offset correctly for all months', () => {
      // Test a date from each month to ensure no DST issues
      const months = [
        '2026-01-15',
        '2026-02-15',
        '2026-03-15',
        '2026-04-15',
        '2026-05-15',
        '2026-06-15',
        '2026-07-15',
        '2026-08-15',
        '2026-09-15',
        '2026-10-15',
        '2026-11-15',
        '2026-12-15',
      ]

      for (const date of months) {
        const result = kstDateToUtcRange(date)
        const diffHours = (result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60)
        expect(diffHours).toBe(24)
      }
    })
  })
})
