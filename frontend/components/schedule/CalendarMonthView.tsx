'use client';

import React from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST } from '@/lib/utils/timezone';

interface CalendarMonthViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
}

export function CalendarMonthView({ currentDate, schedules = [], selectedDate, onDateClick }: CalendarMonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month
  const firstDay = new Date(year, month, 1);
  // Get last day of month
  const lastDay = new Date(year, month + 1, 0);
  
  // Get starting date (previous month days to fill grid)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Generate calendar days (6 weeks to cover all cases)
  const weeks: Date[][] = [];
  const current = new Date(startDate);
  
  for (let week = 0; week < 6; week++) {
    const days: Date[] = [];
    for (let day = 0; day < 7; day++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(days);
    
    // Stop if we've passed the last day of the month
    if (current > lastDay) {
      break;
    }
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

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month;
  };

  const getSchedulesForDate = (date: Date): Schedule[] => {
    return schedules.filter(schedule => {
      const scheduleStart = utcToKST(new Date(schedule.startAt));
      const scheduleEnd = utcToKST(new Date(schedule.endAt));
      
      return date >= scheduleStart && date <= scheduleEnd;
    });
  };

  const handleDateClick = (date: Date) => {
    onDateClick?.(date);
  };

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((date, dayIndex) => {
              const today = isToday(date);
              const selected = isSelected(date);
              const currentMonthDay = isCurrentMonth(date);
              const daySchedules = getSchedulesForDate(date);
              const hasSchedules = daySchedules.length > 0;

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  className={`
                    relative min-h-[80px] p-2 rounded-lg border transition-all duration-150
                    ${!currentMonthDay ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}
                    ${selected ? 'ring-2 ring-primary-500 border-primary-500' : ''}
                    ${today ? 'bg-primary-500 text-white border-primary-500' : ''}
                    hover:border-gray-300 hover:shadow-sm
                  `}
                >
                  {/* Date number */}
                  <div className={`
                    text-sm font-medium mb-1
                    ${!currentMonthDay ? 'text-gray-400' : today ? 'text-white' : 'text-gray-700'}
                    ${dayIndex === 0 && !today ? 'text-error-500' : ''}
                    ${dayIndex === 6 && !today ? 'text-primary-500' : ''}
                  `}>
                    {date.getDate()}
                  </div>

                  {/* Schedule indicators */}
                  {hasSchedules && (
                    <div className="flex flex-col gap-0.5">
                      {daySchedules.slice(0, 3).map((schedule, idx) => (
                        <div
                          key={idx}
                          className={`
                            text-xs truncate px-1 py-0.5 rounded
                            ${today ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-800'}
                          `}
                        >
                          {schedule.title}
                        </div>
                      ))}
                      {daySchedules.length > 3 && (
                        <div className={`
                          text-xs ${today ? 'text-white' : 'text-gray-500'}
                        `}>
                          +{daySchedules.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
