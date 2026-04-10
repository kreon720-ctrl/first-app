'use client';

import React from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime } from '@/lib/utils/timezone';

interface CalendarWeekViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
}

export function CalendarWeekView({ currentDate, schedules = [], selectedDate, onDateClick }: CalendarWeekViewProps) {
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
      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((date, index) => {
          const today = isToday(date);
          const selected = isSelected(date);
          
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleDateClick(date)}
              className={`
                flex flex-col items-center py-2 px-1 rounded-lg transition-all duration-150
                ${today ? 'bg-primary-500 text-white' : ''}
                ${selected && !today ? 'ring-2 ring-primary-500' : ''}
                hover:bg-gray-50
              `}
            >
              <span className={`
                text-xs font-medium mb-1
                ${today ? 'text-white' : index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-600'}
              `}>
                {weekdays[index]}
              </span>
              <span className={`
                text-lg font-semibold
                ${today ? 'text-white' : 'text-gray-800'}
              `}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline view */}
      <div className="border border-gray-200 rounded-lg bg-white">
        {/* Hours */}
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="flex border-b border-gray-100 min-h-[60px]">
            <div className="w-16 flex-shrink-0 border-r border-gray-200 p-2 text-xs text-gray-500">
              {String(hour).padStart(2, '0')}:00
            </div>
            <div className="flex-1 relative">
              {/* Render schedules for each day */}
              {weekDays.map((date, dayIndex) => {
                const daySchedules = getSchedulesForDate(date).filter(schedule => {
                  const scheduleStart = utcToKST(new Date(schedule.startAt));
                  return scheduleStart.getHours() === hour;
                });

                return daySchedules.map((schedule, idx) => (
                  <div
                    key={`${date.toISOString()}-${idx}`}
                    className="absolute left-0 right-0 mx-1 bg-primary-100 text-primary-800 text-xs p-1 rounded truncate"
                    style={{
                      top: '2px',
                      height: '56px',
                    }}
                  >
                    {schedule.title}
                  </div>
                ));
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
