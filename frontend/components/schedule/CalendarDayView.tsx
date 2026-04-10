'use client';

import React from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime, formatDateKorean } from '@/lib/utils/timezone';

interface CalendarDayViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
}

export function CalendarDayView({ currentDate, schedules = [], selectedDate, onDateClick }: CalendarDayViewProps) {
  const kstDate = utcToKST(currentDate);

  const getSchedulesForDay = (): Schedule[] => {
    return schedules.filter(schedule => {
      const scheduleStart = utcToKST(new Date(schedule.startAt));
      const scheduleEnd = utcToKST(new Date(schedule.endAt));
      
      return kstDate >= scheduleStart && kstDate <= scheduleEnd;
    });
  };

  const daySchedules = getSchedulesForDay();

  // Sort by start time
  daySchedules.sort((a, b) => {
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  return (
    <div className="w-full">
      {/* Date header */}
      <div className="mb-4 pb-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {formatDateKorean(kstDate)}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          일정 {daySchedules.length}개
        </p>
      </div>

      {/* Schedule list */}
      {daySchedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-500">일정이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {daySchedules.map((schedule) => {
            const startTime = utcToKST(new Date(schedule.startAt));
            const endTime = utcToKST(new Date(schedule.endAt));

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-150"
              >
                <div className="flex items-start gap-3">
                  {/* Time column */}
                  <div className="flex-shrink-0 w-24">
                    <div className="text-sm font-medium text-gray-900">
                      {formatTime(startTime)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(endTime)}
                    </div>
                  </div>

                  {/* Schedule info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-gray-800 truncate">
                      {schedule.title}
                    </h4>
                    {schedule.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {schedule.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
