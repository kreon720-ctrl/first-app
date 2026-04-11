'use client';

import React from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime } from '@/lib/utils/timezone';

interface CalendarMonthViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
  onScheduleClick?: (schedule: Schedule) => void;
}

export function CalendarMonthView({ currentDate, schedules = [], selectedDate, onDateClick, onScheduleClick }: CalendarMonthViewProps) {
  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth();

  // Get first day of month (UTC)
  const firstDay = new Date(Date.UTC(year, month, 1));
  // Get last day of month (UTC)
  const lastDay = new Date(Date.UTC(year, month + 1, 0));

  // Get starting date (previous month days to fill grid) - UTC
  const startDate = new Date(firstDay);
  startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay());

  // Generate calendar days (6 weeks to cover all cases)
  const weeks: Date[][] = [];
  const current = new Date(startDate);

  for (let week = 0; week < 6; week++) {
    const days: Date[] = [];
    for (let day = 0; day < 7; day++) {
      days.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    weeks.push(days);

    // Stop if we've passed the last day of the month
    if (current > lastDay) {
      break;
    }
  }

  const isToday = (date: Date): boolean => {
    const now = new Date();
    // Get today in KST (UTC+9)
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return date.getUTCFullYear() === kstNow.getUTCFullYear() &&
           date.getUTCMonth() === kstNow.getUTCMonth() &&
           date.getUTCDate() === kstNow.getUTCDate();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return date.getUTCFullYear() === selectedDate.getUTCFullYear() &&
           date.getUTCMonth() === selectedDate.getUTCMonth() &&
           date.getUTCDate() === selectedDate.getUTCDate();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getUTCMonth() === month;
  };

  // utcToKST shifts by +9h → must use getUTC* to read KST components without double-shift
  const scheduleToDay = (utcDate: Date): Date => {
    const kst = utcToKST(utcDate);
    return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  };

  // Check if schedule is a same-day event (starts and ends on the same KST day)
  const isSameDaySchedule = (schedule: Schedule): boolean => {
    const sStart = scheduleToDay(new Date(schedule.startAt));
    const sEnd = scheduleToDay(new Date(schedule.endAt));
    return sStart.getTime() === sEnd.getTime();
  };

  const handleDateClick = (date: Date) => {
    onDateClick?.(date);
  };

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  // For a given week, assign schedules to rows based on overlap
  // Returns { schedule, row, colStart, colEnd }[]
  const getSchedulesForWeek = (weekDays: Date[]): {
    schedule: Schedule;
    row: number;
    colStart: number;
    colEnd: number;
  }[] => {
    // weekDays are UTC dates representing KST calendar days
    // Calculate KST-based week boundaries
    // weekDays[0] is Sunday, weekDays[6] is Saturday (in KST)
    const kstWeekStart = new Date(weekDays[0]);
    kstWeekStart.setUTCHours(0, 0, 0, 0);
    const kstWeekEnd = new Date(weekDays[6]);
    kstWeekEnd.setUTCHours(23, 59, 59, 999);

    // Filter schedules that overlap with this week (KST)
    const weekSchedules = schedules.filter(schedule => {
      const sStart = scheduleToDay(new Date(schedule.startAt));
      const sEnd = scheduleToDay(new Date(schedule.endAt));
      return sStart <= kstWeekEnd && sEnd >= kstWeekStart;
    });

    // Sort: multi-day schedules first, then same-day schedules
    // Within each group, sort by start date
    weekSchedules.sort((a, b) => {
      const aStart = scheduleToDay(new Date(a.startAt)).getTime();
      const bStart = scheduleToDay(new Date(b.startAt)).getTime();
      const aEnd = scheduleToDay(new Date(a.endAt)).getTime();
      const bEnd = scheduleToDay(new Date(b.endAt)).getTime();
      
      const aIsMultiDay = aStart !== aEnd;
      const bIsMultiDay = bStart !== bEnd;
      
      // Multi-day schedules come first
      if (aIsMultiDay !== bIsMultiDay) {
        return aIsMultiDay ? -1 : 1;
      }
      
      // Within same group, sort by start date
      if (aStart !== bStart) return aStart - bStart;
      
      // If same start date, longer duration first for multi-day, shorter first for same-day
      return aIsMultiDay ? (bEnd - bStart) - (aEnd - aStart) : (aEnd - aStart) - (bEnd - bStart);
    });

    // Assign rows (interval coloring / greedy algorithm)
    const rows: { end: Date; count: number }[] = [];
    const result: { schedule: Schedule; row: number; colStart: number; colEnd: number }[] = [];

    for (const schedule of weekSchedules) {
      const sStart = scheduleToDay(new Date(schedule.startAt));
      const sEnd = scheduleToDay(new Date(schedule.endAt));

      // Clamp to week boundaries
      const clampedStart = sStart < kstWeekStart ? kstWeekStart : sStart;
      const clampedEnd = sEnd > kstWeekEnd ? kstWeekEnd : sEnd;

      // Find first available row
      let assignedRow = -1;
      for (let r = 0; r < rows.length; r++) {
        if (rows[r].end < clampedStart) {
          assignedRow = r;
          rows[r].end = clampedEnd;
          break;
        }
      }
      if (assignedRow === -1) {
        assignedRow = rows.length;
        rows.push({ end: clampedEnd, count: 0 });
      }
      rows[assignedRow].count++;

      // Calculate grid column (1-indexed, 7 days)
      const dayIndexStart = Math.max(0, Math.round((clampedStart.getTime() - kstWeekStart.getTime()) / (1000 * 60 * 60 * 24)));
      const dayIndexEnd = Math.min(6, Math.round((clampedEnd.getTime() - kstWeekStart.getTime()) / (1000 * 60 * 60 * 24)));
      const colStart = dayIndexStart + 1;
      const colEnd = Math.min(7, dayIndexEnd + 1);

      result.push({ schedule, row: assignedRow, colStart, colEnd });
    }

    return result;
  };

  const SCHEDULE_ROW_HEIGHT = 20;
  const SCHEDULE_ROW_GAP = 4;

  const rowTop = (row: number): number => 32 + row * (SCHEDULE_ROW_HEIGHT + SCHEDULE_ROW_GAP);
  const weekHeight = (maxRows: number): string => `calc(80px + ${maxRows * SCHEDULE_ROW_HEIGHT + Math.max(0, maxRows - 1) * SCHEDULE_ROW_GAP}px)`;

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-1 ${
              index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col gap-1.5">
        {weeks.map((week, weekIndex) => {
          const weekScheduleRows = getSchedulesForWeek(week);
          const maxRows = weekScheduleRows.length > 0 ? Math.max(...weekScheduleRows.map(r => r.row)) + 1 : 0;
          const cellHeight = weekHeight(maxRows);

          return (
            <div key={weekIndex} className="relative">
              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1.5" style={{ gridTemplateRows: `minmax(${cellHeight}, auto)` }}>
                {week.map((date, dayIndex) => {
                  const today = isToday(date);
                  const selected = isSelected(date);
                  const currentMonthDay = isCurrentMonth(date);

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => handleDateClick(date)}
                      className={`
                        relative p-2 rounded-lg border transition-all duration-150 flex flex-col
                        ${today
                          ? 'border-orange-500 ring-1 ring-orange-400'
                          : selected
                            ? 'bg-white border-primary-500 ring-2 ring-primary-500'
                            : !currentMonthDay
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-white border-gray-200'
                        }
                        hover:border-gray-300 hover:shadow-sm
                      `}
                    >
                      {/* Date number */}
                      <div className={`
                        text-sm font-medium mb-1 flex-shrink-0
                        ${today
                          ? 'text-black font-bold'
                          : !currentMonthDay
                            ? 'text-gray-400'
                            : dayIndex === 0
                              ? 'text-error-500'
                              : dayIndex === 6
                                ? 'text-primary-500'
                                : 'text-gray-700'
                        }
                      `}>
                        {date.getUTCDate()}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Schedule bars overlay */}
              {weekScheduleRows.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {weekScheduleRows.map(({ schedule, row, colStart, colEnd }) => {
                    const startDayIdx = colStart - 1;
                    const startDayDate = week[startDayIdx];
                    const isStartDayToday = isToday(startDayDate);
                    const span = colEnd - colStart + 1;
                    // Percentage-based positioning: each cell is 1/7 ≈ 14.285%
                    const leftPct = `${(colStart - 1) * (100 / 7)}%`;
                    const widthPct = `${span * (100 / 7)}%`;

                    return (
                      <div
                        key={`bar-${schedule.id}-${weekIndex}`}
                        className="absolute"
                        style={{
                          left: leftPct,
                          width: widthPct,
                          top: `${rowTop(row)}px`,
                          pointerEvents: 'auto',
                        }}
                      >
                        <div
                          className={`
                            text-xs px-1 py-0.5 truncate text-center cursor-pointer hover:opacity-75 transition-opacity bg-primary-100 text-primary-800 rounded
                          `}
                          title={schedule.title}
                          onClick={(e) => { e.stopPropagation(); onScheduleClick?.(schedule); }}
                        >
                          {isSameDaySchedule(schedule) && (
                            <span className="font-medium opacity-75">{formatTime(new Date(schedule.startAt))} </span>
                          )}
                          {schedule.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
