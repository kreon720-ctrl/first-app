'use client';

import React from 'react';
import { Schedule } from '@/types/schedule';
import { CalendarView as CalendarViewType } from '@/types/schedule';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarDayView } from './CalendarDayView';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate?: Date;
  view: CalendarViewType;
  schedules?: Schedule[];
  onViewChange?: (view: CalendarViewType) => void;
  onDateChange?: (date: Date) => void;
  onDateClick?: (date: Date) => void;
}

export function CalendarView({
  currentDate,
  selectedDate,
  view = 'month',
  schedules = [],
  onViewChange,
  onDateChange,
  onDateClick,
}: CalendarViewProps) {
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    
    onDateChange?.(newDate);
  };

  const formatDateRange = (): string => {
    const year = currentDate.getFullYear();
    
    if (view === 'month') {
      const month = currentDate.getMonth() + 1;
      return `${year}년 ${month}월`;
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startMonth = startOfWeek.getMonth() + 1;
      const endMonth = endOfWeek.getMonth() + 1;
      
      if (startMonth === endMonth) {
        return `${year}년 ${startMonth}월 ${startOfWeek.getDate()}일 ~ ${endOfWeek.getDate()}일`;
      }
      return `${year}년 ${startMonth}월 ~ ${endMonth}월`;
    } else {
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      return `${year}년 ${month}월 ${day}일`;
    }
  };

  const tabs: { id: CalendarViewType; label: string }[] = [
    { id: 'month', label: '월' },
    { id: 'week', label: '주' },
    { id: 'day', label: '일' },
  ];

  const handleDateClick = (date: Date) => {
    onDateClick?.(date);
  };

  return (
    <div className="w-full bg-white">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4 px-2">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateDate('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            aria-label="이전"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">
            {formatDateRange()}
          </h2>
          
          <button
            type="button"
            onClick={() => navigateDate('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            aria-label="다음"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onViewChange?.(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150
                ${view === tab.id
                  ? 'text-primary-600 border-primary-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar content */}
      <div className="px-2">
        {view === 'month' && (
          <CalendarMonthView
            currentDate={currentDate}
            schedules={schedules}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
          />
        )}
        {view === 'week' && (
          <CalendarWeekView
            currentDate={currentDate}
            schedules={schedules}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
          />
        )}
        {view === 'day' && (
          <CalendarDayView
            currentDate={currentDate}
            schedules={schedules}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
          />
        )}
      </div>
    </div>
  );
}
