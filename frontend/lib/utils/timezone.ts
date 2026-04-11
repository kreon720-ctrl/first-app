// Timezone utilities - UTC to KST conversion and date formatting

/**
 * KST offset in minutes (UTC+9)
 */
export const KST_OFFSET_MINUTES = 9 * 60; // 540 minutes

/**
 * Convert UTC Date/Time to KST Date
 * This function takes a Date object representing UTC time and returns a Date object 
 * that represents the same moment in KST (UTC+9)
 * 
 * @param utcDate - UTC Date object or ISO string
 * @returns Date object representing KST time
 */
export function utcToKST(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  // Create a new date by adding 9 hours to the UTC time
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

/**
 * Convert KST Date to UTC Date
 * This function takes a Date object representing KST time and returns a Date object
 * that represents the same moment in UTC
 * 
 * @param kstDate - KST Date object
 * @returns Date object in UTC
 */
export function kstToUTC(kstDate: Date): Date {
  // Subtract 9 hours from KST to get UTC
  return new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
}

/**
 * Get current date in KST (YYYY-MM-DD format)
 */
export function getTodayKST(): string {
  const now = new Date();
  const kst = utcToKST(now);
  return formatDate(kst);
}

/**
 * Format date to YYYY-MM-DD
 * @param date - Date object
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to Korean locale string
 * @param date - Date object or ISO string
 * @returns Korean formatted date string
 */
export function formatDateKorean(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const kst = utcToKST(d);

  // Use UTC methods on KST-shifted date to get correct KST date components
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[kst.getUTCDay()];

  return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

/**
 * Format time to HH:MM (24-hour format)
 * This function assumes the input date is in UTC and formats it as KST time
 * @param date - Date object or ISO string (in UTC)
 * @returns Formatted time string in KST
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Use getUTCHours and add 9 for KST
  const kstHours = (d.getUTCHours() + 9) % 24;
  const kstMinutes = d.getUTCMinutes();
  
  const hours = String(kstHours).padStart(2, '0');
  const minutes = String(kstMinutes).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format datetime to Korean locale with time
 * @param date - Date object or ISO string
 * @returns Korean formatted datetime string
 */
export function formatDateTimeKorean(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDateKorean(d)} ${formatTime(d)}`;
}

/**
 * Get start and end of month in UTC (for API queries)
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Object with startAt and endAt in ISO string
 */
export function getMonthRangeUTC(year: number, month: number): { startAt: string; endAt: string } {
  // First day of the month in KST
  const startKST = new Date(year, month - 1, 1, 0, 0, 0, 0);
  // First day of next month in KST
  const endKST = new Date(year, month, 1, 0, 0, 0, 0);
  
  // Convert to UTC
  const startUTC = kstToUTC(startKST);
  const endUTC = kstToUTC(endKST);
  
  return {
    startAt: startUTC.toISOString(),
    endAt: endUTC.toISOString(),
  };
}

/**
 * Get start and end of week in UTC (for API queries)
 * @param date - Reference date (KST)
 * @returns Object with startAt and endAt in ISO string
 */
export function getWeekRangeUTC(date: Date | string): { startAt: string; endAt: string } {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Start of week (Sunday) in KST
  const startKST = new Date(d);
  startKST.setDate(d.getDate() - dayOfWeek);
  startKST.setHours(0, 0, 0, 0);
  
  // End of week (Saturday) in KST
  const endKST = new Date(startKST);
  endKST.setDate(startKST.getDate() + 7);
  
  // Convert to UTC
  const startUTC = kstToUTC(startKST);
  const endUTC = kstToUTC(endKST);
  
  return {
    startAt: startUTC.toISOString(),
    endAt: endUTC.toISOString(),
  };
}

/**
 * Get start and end of day in UTC (for API queries)
 * @param date - Reference date (KST)
 * @returns Object with startAt and endAt in ISO string
 */
export function getDayRangeUTC(date: Date | string): { startAt: string; endAt: string } {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Start of day in KST
  const startKST = new Date(d);
  startKST.setHours(0, 0, 0, 0);
  
  // Start of next day in KST
  const endKST = new Date(startKST);
  endKST.setDate(startKST.getDate() + 1);
  
  // Convert to UTC
  const startUTC = kstToUTC(startKST);
  const endUTC = kstToUTC(endKST);
  
  return {
    startAt: startUTC.toISOString(),
    endAt: endUTC.toISOString(),
  };
}

/**
 * Parse YYYY-MM-DD string to Date object
 * @param dateString - YYYY-MM-DD format
 * @returns Date object (treated as UTC midnight)
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Add days to a date
 * @param date - Reference date
 * @param days - Number of days to add
 * @returns New Date object
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const result = new Date(d);
  result.setDate(d.getDate() + days);
  return result;
}

/**
 * Add months to a date
 * @param date - Reference date
 * @param months - Number of months to add
 * @returns New Date object
 */
export function addMonths(date: Date | string, months: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const result = new Date(d);
  result.setMonth(d.getMonth() + months);
  return result;
}
