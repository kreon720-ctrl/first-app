'use client';

import React, { useRef, useEffect } from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime } from '@/lib/utils/timezone';

interface CalendarWeekViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
  onScheduleClick?: (schedule: Schedule) => void;
}

export function CalendarWeekView({ currentDate, schedules = [], selectedDate, onDateClick, onScheduleClick }: CalendarWeekViewProps) {
  // Get start of week (Sunday) - use UTC to avoid timezone issues
  const startOfWeek = new Date(currentDate);
  const utcDayOfWeek = startOfWeek.getUTCDay(); // 0=Sunday in UTC
  startOfWeek.setUTCDate(currentDate.getUTCDate() - utcDayOfWeek);

  // Generate week days (using UTC to avoid timezone issues)
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek.getTime());
    day.setUTCDate(startOfWeek.getUTCDate() + i);
    weekDays.push(day);
  }

  const isToday = (date: Date): boolean => {
    const now = new Date();
    // Use UTC methods for consistent comparison
    return date.getUTCFullYear() === now.getUTCFullYear() &&
           date.getUTCMonth() === now.getUTCMonth() &&
           date.getUTCDate() === now.getUTCDate();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    // selectedDate is a Date object from props, compare using UTC
    return date.getUTCFullYear() === selectedDate.getUTCFullYear() &&
           date.getUTCMonth() === selectedDate.getUTCMonth() &&
           date.getUTCDate() === selectedDate.getUTCDate();
  };

  // Calendar grid dates use UTC date components for consistency
  const toDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

  // Schedule UTC strings: utcToKST shifts by +9h, so getUTC* gives the correct KST components.
  // Must NOT use getDate/getMonth (local accessors) on utcToKST results — that applies +9h twice.
  const scheduleToDay = (utcDate: Date): Date => {
    const kst = utcToKST(utcDate);
    return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  };

  // Returns schedules that overlap with a given calendar-grid day
  const getSchedulesForDate = (date: Date): Schedule[] => {
    const target = toDay(date);
    return schedules.filter(schedule => {
      const startDay = scheduleToDay(new Date(schedule.startAt));
      const endDay = scheduleToDay(new Date(schedule.endAt));
      return target >= startDay && target <= endDay;
    });
  };

  // A schedule spans multiple KST calendar days
  const isMultiDay = (schedule: Schedule): boolean => {
    const startDay = scheduleToDay(new Date(schedule.startAt));
    const endDay = scheduleToDay(new Date(schedule.endAt));
    return startDay.getTime() !== endDay.getTime();
  };

  // utcToKST adds +9h, so getUTCHours() equals KST hours
  const getKSTHour = (utcDate: Date): number =>
    utcToKST(utcDate).getUTCHours();

  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll: to 1 hour before the earliest single-day schedule, or 08:00 if none
  useEffect(() => {
    if (!timelineRef.current) return;
    const HOUR_PX = 56;
    const singleDaySchedules = schedules.filter(s => !isMultiDay(s));
    if (singleDaySchedules.length > 0) {
      const minHour = Math.min(...singleDaySchedules.map(s => getKSTHour(new Date(s.startAt))));
      timelineRef.current.scrollTop = Math.max(0, minHour - 1) * HOUR_PX;
    } else {
      timelineRef.current.scrollTop = 8 * HOUR_PX;
    }
  }, [schedules]);

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const TIME_COL_WIDTH = 'w-14';

  return (
    <div className="w-full">
      {/* Week day headers */}
      <div className="flex mb-1">
        <div className={`${TIME_COL_WIDTH} flex-shrink-0`} />
        {weekDays.map((date, index) => {
          const today = isToday(date);
          const sel = isSelected(date);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onDateClick?.(date)}
              className={`
                flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition-all duration-150
                ${today ? 'bg-primary-500 text-white ring-2 ring-primary-300' : ''}
                ${sel && !today ? 'ring-2 ring-primary-500' : ''}
                hover:bg-gray-50
              `}
            >
              <span className={`text-xs font-medium mb-1 ${today ? 'text-white' : index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-600'}`}>
                {weekdays[index]}
              </span>
              <span className={`text-lg font-semibold ${today ? 'text-white' : 'text-gray-800'}`}>
                {date.getUTCDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* All-day / multi-day events section */}
      {(() => {
        const allDaySchedules = schedules
          .filter(isMultiDay)
          .sort((a, b) => {
            const aStart = scheduleToDay(new Date(a.startAt)).getTime();
            const bStart = scheduleToDay(new Date(b.startAt)).getTime();
            if (aStart !== bStart) return aStart - bStart;
            return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
          });
        if (allDaySchedules.length === 0) return null;

        // Use UTC for weekStart to match toDay
        const weekStart = toDay(weekDays[0]);

        const getDayIndex = (date: Date): number => {
          const day = toDay(date);
          const diff = Math.round((day.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
          return Math.max(0, Math.min(6, diff));
        };

        return (
          <div className="border border-gray-200 rounded-lg bg-gray-50 mb-2 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b border-gray-200">
              <div className={`${TIME_COL_WIDTH} p-2 text-xs text-gray-400 text-right`}>종일</div>
              {weekDays.map((date) => (
                <div key={date.toISOString()} className="border-l border-gray-200 min-h-[28px]" />
              ))}
            </div>
            {/* Schedule rows */}
            {allDaySchedules.map((schedule) => {
              const startDay = scheduleToDay(new Date(schedule.startAt));
              const endDay = scheduleToDay(new Date(schedule.endAt));

              const startIdx = getDayIndex(new Date(Math.max(startDay.getTime(), weekStart.getTime())));
              const endIdx = getDayIndex(new Date(Math.min(endDay.getTime(), weekDays[6].getTime())));
              // Grid column: +2 because col 1 is time label (1-indexed)
              const colStart = startIdx + 2;
              const colEnd = endIdx + 3;

              return (
                <div key={schedule.id} className="grid grid-cols-[auto_repeat(7,1fr)] border-b border-gray-100 last:border-b-0">
                  <div className={`${TIME_COL_WIDTH}`} />
                  {/* Time label cell */}
                  <div
                    className="px-1 py-0.5"
                    style={{ gridColumn: `${colStart} / ${colEnd}` }}
                  >
                    <div
                      onClick={() => onScheduleClick?.(schedule)}
                      className="text-xs bg-primary-200 text-primary-900 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary-300 transition-colors"
                      title={schedule.title}
                    >
                      {schedule.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Hourly timeline */}
      <div
        ref={timelineRef}
        className="border border-gray-200 rounded-lg bg-white overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        {/* Hour rows */}
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="flex border-b border-gray-100 min-h-[56px]">
            {/* Time label */}
            <div className={`${TIME_COL_WIDTH} flex-shrink-0 border-r border-gray-200 px-1 pt-1 text-xs text-gray-400`}>
              {String(hour).padStart(2, '0')}:00
            </div>

            {/* One column per day — only single-day schedules */}
            {weekDays.map((date) => {
              const daySchedules = getSchedulesForDate(date).filter(s =>
                !isMultiDay(s) && getKSTHour(new Date(s.startAt)) === hour
              );

              return (
                <div
                  key={date.toISOString()}
                  className={`flex-1 relative border-l border-gray-100 ${isToday(date) ? 'bg-primary-50/30' : ''}`}
                >
                  {daySchedules.map((schedule, idx) => (
                    <div
                      key={`${schedule.id}-${idx}`}
                      onClick={() => onScheduleClick?.(schedule)}
                      className="absolute inset-x-0.5 top-0.5 bg-primary-100 text-primary-800 text-xs px-1 py-0.5 rounded cursor-pointer hover:bg-primary-200 transition-colors duration-150 z-10 overflow-hidden"
                      style={{ minHeight: '52px' }}
                      title={schedule.title}
                    >
                      <div className="font-medium truncate">{schedule.title}</div>
                      <div className="text-primary-600 text-[10px]">
                        {formatTime(new Date(schedule.startAt))} ~ {formatTime(new Date(schedule.endAt))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
