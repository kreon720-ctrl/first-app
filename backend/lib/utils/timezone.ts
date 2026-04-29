/**
 * KST (UTC+9) timezone utilities
 * Used for converting between client-side KST dates and server-side UTC timestamps
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000 // 9 hours in milliseconds

/**
 * Convert KST date string (YYYY-MM-DD) to UTC Date range
 * 
 * @param kstDate - KST date string in YYYY-MM-DD format
 * @returns Object with start and end Date objects in UTC
 * 
 * @example
 * // KST 2026-04-08 → UTC range
 * kstDateToUtcRange('2026-04-08')
 * // Returns: { start: 2026-04-07T15:00:00.000Z, end: 2026-04-08T15:00:00.000Z }
 */
export function kstDateToUtcRange(kstDate: string): { start: Date; end: Date } {
  // Parse as KST midnight
  const start = new Date(`${kstDate}T00:00:00+09:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  
  return { start, end }
}

/**
 * Convert UTC Date to KST date string (YYYY-MM-DD)
 * 
 * @param utcDate - UTC Date object
 * @returns KST date string in YYYY-MM-DD format
 * 
 * @example
 * utcDateToKstString(new Date('2026-04-07T15:00:00.000Z'))
 * // Returns: '2026-04-08'
 */
export function utcDateToKstString(utcDate: Date): string {
  const kstTime = new Date(utcDate.getTime() + KST_OFFSET_MS)
  return kstTime.toISOString().split('T')[0]
}

/**
 * Convert UTC Date to KST Date object (time set to midnight KST)
 * 
 * @param utcDate - UTC Date object
 * @returns Date object representing KST date
 */
export function utcDateToKstDate(utcDate: Date): Date {
  const kstTime = new Date(utcDate.getTime() + KST_OFFSET_MS)
  return new Date(`${kstTime.toISOString().split('T')[0]}T00:00:00+09:00`)
}

/**
 * Get current KST date string (YYYY-MM-DD)
 */
export function getCurrentKstDate(): string {
  const now = new Date()
  return utcDateToKstString(now)
}

/**
 * Get current KST Date object
 */
export function getCurrentKstDateObject(): Date {
  const now = new Date()
  return new Date(`${getCurrentKstDate()}T00:00:00+09:00`)
}

/**
 * Check if a UTC timestamp falls within a KST date
 * 
 * @param utcDate - UTC Date to check
 * @param kstDate - KST date string (YYYY-MM-DD)
 * @returns true if utcDate falls within the KST date
 */
export function isWithinKstDate(utcDate: Date, kstDate: string): boolean {
  const { start, end } = kstDateToUtcRange(kstDate)
  const time = utcDate.getTime()
  return time >= start.getTime() && time < end.getTime()
}

export type CalendarView = 'month' | 'week' | 'day'

/**
 * Get KST date range for calendar view (month/week/day)
 * 
 * @param view - Calendar view type: 'month', 'week', or 'day'
 * @param baseDate - Base date for calculation (KST date string YYYY-MM-DD)
 * @returns Object with start and end Date objects in UTC
 * 
 * @example
 * // Get month-grid range for April 2026 (6-week calendar grid, Sunday..Saturday)
 * // April 1, 2026 is Wednesday → grid starts on Sunday March 29.
 * getKstDateRange('month', '2026-04-15')
 * // Returns: { start: 2026-03-28T15:00:00.000Z, end: 2026-05-09T15:00:00.000Z }
 *
 * @example
 * // Get week range (Sunday to Saturday) for April 15, 2026
 * getKstDateRange('week', '2026-04-15')
 * // Returns: { start: 2026-04-11T15:00:00.000Z, end: 2026-04-18T15:00:00.000Z }
 * 
 * @example
 * // Get day range for April 15, 2026
 * getKstDateRange('day', '2026-04-15')
 * // Returns: { start: 2026-04-14T15:00:00.000Z, end: 2026-04-15T15:00:00.000Z }
 */
export function getKstDateRange(
  view: CalendarView,
  baseDate: string
): { start: Date; end: Date } {
  // baseDate 는 항상 KST 캘린더의 'YYYY-MM-DD'. 컨테이너 로컬 TZ 영향을 받지 않도록
  // 문자열을 직접 파싱해 KST 좌표(year/month/date) 추출. (예전: baseKst.getDate() 가
  // 컨테이너 TZ=UTC 일 때 KST 4/29 → UTC 4/28 로 1일 어긋나는 버그가 있었음.)
  const [year, monthOneBased, date] = baseDate.split('-').map(Number)
  const month = monthOneBased - 1

  // Helper: build a UTC Date from a KST calendar date (y, m=0-indexed, d)
  // Date.UTC handles overflow/underflow (e.g. d=-4 correctly wraps to previous month)
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000
  const kstMidnight = (y: number, m: number, d: number): Date =>
    new Date(Date.UTC(y, m, d) - KST_OFFSET_MS)

  switch (view) {
    case 'month': {
      // Month calendar grid: the frontend (CalendarMonthView) renders a fixed
      // 6-week grid starting on the Sunday on or before the 1st. Return the
      // same range so schedules on overflow days (prev/next month) appear in
      // their grid cells.
      const firstOfMonthDow = new Date(Date.UTC(year, month, 1)).getUTCDay()
      const start = kstMidnight(year, month, 1 - firstOfMonthDow)
      const end = new Date(start.getTime() + 42 * 24 * 60 * 60 * 1000)
      return { start, end }
    }

    case 'week': {
      // Sunday to Saturday (KST). dayOfWeek 는 KST 캘린더 날짜의 요일이며,
      // 같은 KST 자정 시각의 UTC 표현에서 추출하면 TZ 무관.
      const dayOfWeek = new Date(Date.UTC(year, month, date)).getUTCDay()
      const start = kstMidnight(year, month, date - dayOfWeek)
      const end = kstMidnight(year, month, date + (7 - dayOfWeek))
      return { start, end }
    }

    case 'day':
    default: {
      // Single day (KST midnight to midnight)
      const start = kstMidnight(year, month, date)
      const end = kstMidnight(year, month, date + 1)
      return { start, end }
    }
  }
}
