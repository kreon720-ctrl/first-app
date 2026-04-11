'use client';

import React, { useRef, useEffect } from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime, formatDateKorean } from '@/lib/utils/timezone';

interface CalendarDayViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
  onScheduleClick?: (schedule: Schedule) => void;
}

export function CalendarDayView({ currentDate, schedules = [], selectedDate, onDateClick, onScheduleClick }: CalendarDayViewProps) {
  const kstDate = utcToKST(currentDate);

  // utcToKST shifts by +9h → use getUTC* to get KST date components without double-shift
  const scheduleToDay = (utcDate: Date): Date => {
    const kst = utcToKST(utcDate);
    return new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  };

  // targetDay: kstDate already has +9h applied, use getUTC* for KST date
  const targetDay = new Date(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate());

  // Only single-day schedules that both start and end today (KST)
  const timedSchedules = schedules.filter(schedule => {
    const startDay = scheduleToDay(new Date(schedule.startAt));
    const endDay = scheduleToDay(new Date(schedule.endAt));
    return (
      startDay.getTime() === targetDay.getTime() &&
      endDay.getTime() === targetDay.getTime()
    );
  });

  // utcToKST adds +9h so getUTCHours() equals KST hours
  const getKSTHour = (utcDate: Date): number =>
    utcToKST(utcDate).getUTCHours();

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = 8 * 56;
    }
  }, []);

  return (
    <div className="w-full">
      {/* Date header */}
      <div className="mb-4 pb-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {formatDateKorean(kstDate)}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          일정 {timedSchedules.length}개
        </p>
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="border border-gray-200 rounded-lg bg-white overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        {Array.from({ length: 24 }, (_, hour) => {
          const hourSchedules = timedSchedules.filter(s =>
            getKSTHour(new Date(s.startAt)) === hour
          );
          return (
            <div key={hour} className="flex border-b border-gray-100 min-h-[56px]">
              <div className="w-14 flex-shrink-0 border-r border-gray-200 px-1 pt-1 text-xs text-gray-400">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="flex-1 relative">
                {hourSchedules.map((schedule, idx) => (
                  <div
                    key={`${schedule.id}-${idx}`}
                    onClick={() => onScheduleClick?.(schedule)}
                    className="absolute inset-x-1 top-0.5 bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded cursor-pointer hover:bg-primary-200 transition-colors duration-150 z-10"
                    style={{ minHeight: '52px' }}
                    title={schedule.title}
                  >
                    <div className="font-medium truncate">{schedule.title}</div>
                    <div className="text-primary-600 text-[10px] mt-0.5">
                      {formatTime(new Date(schedule.startAt))} ~ {formatTime(new Date(schedule.endAt))}
                    </div>
                    {schedule.description && (
                      <div className="text-gray-600 text-[10px] mt-0.5 line-clamp-1">{schedule.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
