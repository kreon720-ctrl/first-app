// Gantt chart utility functions

/**
 * Returns the Sunday (start of week) for the week containing dateStr.
 */
export function getWeekStart(dateStr: string): Date {
  const date = new Date(dateStr + 'T00:00:00Z');
  const dayOfWeek = date.getUTCDay(); // 0=Sun, 6=Sat
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() - dayOfWeek);
  return sunday;
}

/**
 * Returns all week starts (Sundays) that cover the project date range.
 * Includes the week containing startDate through the week containing endDate.
 */
export function getProjectWeeks(startDate: string, endDate: string): Date[] {
  const start = getWeekStart(startDate);
  const end = getWeekStart(endDate);

  const weeks: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    weeks.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return weeks;
}

export interface MonthGroup {
  year: number;
  month: number; // 1-12
  weeks: Date[];
  weekIndices: number[]; // global indices into the weeks array
}

/**
 * Groups an array of week start dates by calendar month.
 * A week is assigned to the month that contains its Thursday (ISO convention),
 * or simply the month of the Sunday start — we use the month of the majority day
 * (Thursday of that week = Sunday + 4 days).
 */
export function groupWeeksByMonth(weeks: Date[]): MonthGroup[] {
  const groups: MonthGroup[] = [];

  weeks.forEach((week, idx) => {
    // Use Thursday of that week to determine which month the week "belongs" to
    const thursday = new Date(week);
    thursday.setUTCDate(week.getUTCDate() + 4);

    const year = thursday.getUTCFullYear();
    const month = thursday.getUTCMonth() + 1; // 1-12

    const existing = groups.find((g) => g.year === year && g.month === month);
    if (existing) {
      existing.weeks.push(week);
      existing.weekIndices.push(idx);
    } else {
      groups.push({ year, month, weeks: [week], weekIndices: [idx] });
    }
  });

  return groups;
}

/**
 * Returns the 1-based week-of-month for a given week start (Sunday).
 * Counts how many times that weekday (Sunday) has occurred in the month
 * using the Thursday convention for month assignment.
 */
export function getWeekOfMonth(weekStart: Date): number {
  // Determine the month of this week via Thursday
  const thursday = new Date(weekStart);
  thursday.setUTCDate(weekStart.getUTCDate() + 4);

  const month = thursday.getUTCMonth();
  const year = thursday.getUTCFullYear();

  // Count how many weeks in this month come before or equal to this week
  // Start from the first Sunday on or before the 1st of the month
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstSunday = new Date(firstOfMonth);
  firstSunday.setUTCDate(firstOfMonth.getUTCDate() - firstOfMonth.getUTCDay());

  // Find the Thursday of that first Sunday's week
  const firstThursday = new Date(firstSunday);
  firstThursday.setUTCDate(firstSunday.getUTCDate() + 4);

  // If that Thursday is in a different month, start from the next Sunday
  let cursor = new Date(firstSunday);
  if (firstThursday.getUTCMonth() !== month || firstThursday.getUTCFullYear() !== year) {
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  let weekNum = 0;
  const targetTime = weekStart.getTime();

  while (cursor.getTime() <= targetTime) {
    const cursorThursday = new Date(cursor);
    cursorThursday.setUTCDate(cursor.getUTCDate() + 4);
    if (cursorThursday.getUTCMonth() === month && cursorThursday.getUTCFullYear() === year) {
      weekNum++;
    }
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return Math.max(weekNum, 1);
}

/**
 * Finds the index in weeks[] of the week that contains the given date.
 * Returns the index of the closest week start that is <= dateStr.
 * Falls back to 0 if date is before all weeks, or last index if after all weeks.
 */
export function getWeekIndex(weeks: Date[], dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00Z');

  if (weeks.length === 0) return 0;

  // Find the last week start that is <= target
  let result = 0;
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i] <= target) {
      result = i;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Returns true if the week at weekIdx is the first week of a new month group
 * (i.e., it's a month boundary and should receive a thick left border).
 */
export function isMonthBoundary(monthGroups: MonthGroup[], weekIdx: number): boolean {
  for (const group of monthGroups) {
    if (group.weekIndices.length > 0 && group.weekIndices[0] === weekIdx) {
      return true;
    }
  }
  return false;
}
