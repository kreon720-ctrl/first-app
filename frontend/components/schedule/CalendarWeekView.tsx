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
  // Get start of week (Sunday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  // Generate week days
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return date.getFullYear() === selectedDate.getFullYear() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getDate() === selectedDate.getDate();
  };

  // Calendar grid dates are local-midnight — strip time with local accessors
  const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Schedule UTC strings: utcToKST shifts by +9h, so getUTC* gives the correct KST components.
  // Must NOT use getDate/getMonth (local accessors) on utcToKST results — that applies +9h twice.
  const scheduleToDay = (utcDate: Date): Date => {
    const kst = utcToKST(utcDate);
    return new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
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

  // Auto-scroll to 08:00 on mount
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = 8 * 56; // 56px per hour row
    }
  }, []);

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
                ${today ? 'bg-primary-500 text-white' : ''}
                ${sel && !today ? 'ring-2 ring-primary-500' : ''}
                hover:bg-gray-50
              `}
            >
              <span className={`text-xs font-medium mb-1 ${today ? 'text-white' : index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-600'}`}>
                {weekdays[index]}
              </span>
              <span className={`text-lg font-semibold ${today ? 'text-white' : 'text-gray-800'}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* All-day / multi-day events section */}
      {(() => {
        const allDaySchedules = schedules.filter(isMultiDay);
        if (allDaySchedules.length === 0) return null;
        return (
          <div className="border border-gray-200 rounded-lg bg-gray-50 mb-2">
            <div className="flex border-b border-gray-200">
              <div className={`${TIME_COL_WIDTH} flex-shrink-0 p-2 text-xs text-gray-400 text-right`}>종일</div>
              {weekDays.map((date) => {
                const dayMulti = allDaySchedules.filter(s => {
                  const target = toDay(date);
                  const startDay = scheduleToDay(new Date(s.startAt));
                  const endDay = scheduleToDay(new Date(s.endAt));
                  return target >= startDay && target <= endDay;
                });
                return (
                  <div key={date.toISOString()} className="flex-1 border-l border-gray-200 p-1 min-h-[28px]">
                    {dayMulti.map((schedule) => (
                      <div
                        key={schedule.id}
                        onClick={() => onScheduleClick?.(schedule)}
                        className="text-xs bg-primary-200 text-primary-900 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary-300 transition-colors mb-0.5"
                        title={schedule.title}
                      >
                        {schedule.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
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
