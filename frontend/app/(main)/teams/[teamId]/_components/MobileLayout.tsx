'use client';

import React from 'react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { AIAssistantPanel } from '@/components/ai-assistant/AIAssistantPanel';
import { CalendarSection } from './CalendarSection';
import type { Schedule, ScheduleCreateInput, ScheduleUpdateInput, CalendarView as CalendarViewType } from '@/types/schedule';

type MobileTab = 'calendar' | 'chat' | 'ai-assistant';

interface MobileLayoutProps {
  teamId: string;
  teamName: string;
  currentDate: Date;
  selectedDate: string;
  calendarView: CalendarViewType;
  schedules: Schedule[];
  isLeader: boolean;
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onViewChange: (view: 'month' | 'week' | 'day' | 'project') => void;
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
  onCreateSchedule: (defaultDate?: string) => void;
  onScheduleClick: (schedule: Schedule) => void;
  showCreateModal: boolean;
  showEditModal: boolean;
  showDetailModal: boolean;
  scheduleDefaultDate: string;
  selectedSchedule: Schedule | null;
  createScheduleIsPending: boolean;
  createScheduleError: string | null;
  updateScheduleIsPending: boolean;
  updateScheduleError: string | null;
  deleteScheduleIsPending: boolean;
  onCreateModalClose: () => void;
  onCreateSubmit: (data: ScheduleCreateInput | ScheduleUpdateInput) => void;
  onDetailClose: () => void;
  onDetailEdit: () => void;
  onDelete: () => void;
  onEditModalClose: () => void;
  onEditSubmit: (data: ScheduleCreateInput | ScheduleUpdateInput) => void;
}

export function MobileLayout({
  teamId,
  teamName,
  currentDate,
  selectedDate,
  calendarView,
  schedules,
  isLeader,
  activeTab,
  onTabChange,
  onViewChange,
  onDateChange,
  onDateClick,
  onCreateSchedule,
  onScheduleClick,
  showCreateModal,
  showEditModal,
  showDetailModal,
  scheduleDefaultDate,
  selectedSchedule,
  createScheduleIsPending,
  createScheduleError,
  updateScheduleIsPending,
  updateScheduleError,
  deleteScheduleIsPending,
  onCreateModalClose,
  onCreateSubmit,
  onDetailClose,
  onDetailEdit,
  onDelete,
  onEditModalClose,
  onEditSubmit,
}: MobileLayoutProps) {
  return (
    <>
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 bg-white dark:border-dark-border dark:bg-dark-surface">
        <button
          type="button"
          onClick={() => onTabChange('calendar')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
            activeTab === 'calendar'
              ? 'text-primary-600 border-primary-500 dark:text-dark-accent dark:border-dark-accent'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-muted dark:hover:text-dark-text'
          }`}
        >
          {/* 캘린더 아이콘 */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9h18" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
          </svg>
          캘린더
        </button>
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
            activeTab === 'chat'
              ? 'text-primary-600 border-primary-500 dark:text-dark-accent dark:border-dark-accent'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-muted dark:hover:text-dark-text'
          }`}
        >
          {/* 채팅 말풍선 아이콘 */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            <circle cx="9" cy="12" r="0.6" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="0.6" fill="currentColor" stroke="none" />
          </svg>
          팀채팅
        </button>
        <button
          type="button"
          onClick={() => onTabChange('ai-assistant')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
            activeTab === 'ai-assistant'
              ? 'text-primary-600 border-primary-500 dark:text-dark-accent dark:border-dark-accent'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-muted dark:hover:text-dark-text'
          }`}
        >
          {/* AI sparkle 아이콘 */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3 13.7 8.3 19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
            <path d="M18 14 18.7 16 21 16.7 18.7 17.3 18 19.3 17.3 17.3 15.3 16.7 17.3 16z" />
            <path d="M5 4 5.5 5.5 7 6 5.5 6.5 5 8 4.5 6.5 3 6 4.5 5.5z" />
          </svg>
          AI 찰떡이
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {/* Calendar tab */}
        <div className={`h-full ${activeTab === 'calendar' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto bg-white">
            <CalendarSection
              teamId={teamId}
              currentDate={currentDate}
              selectedDate={selectedDate}
              calendarView={calendarView}
              schedules={schedules}
              postits={[]}
              currentUserId={undefined}
              isLeader={isLeader}
              compact={true}
              selectedPostitColor={null}
              showCreateModal={showCreateModal}
              showEditModal={showEditModal}
              showDetailModal={showDetailModal}
              scheduleDefaultDate={scheduleDefaultDate}
              selectedSchedule={selectedSchedule}
              createScheduleIsPending={createScheduleIsPending}
              createScheduleError={createScheduleError}
              updateScheduleIsPending={updateScheduleIsPending}
              updateScheduleError={updateScheduleError}
              deleteScheduleIsPending={deleteScheduleIsPending}
              onPostitColorSelect={() => {}}
              onPostitDelete={() => {}}
              onPostitContentChange={() => {}}
              onViewChange={onViewChange}
              onDateChange={onDateChange}
              onDateClick={onDateClick}
              onCreateSchedule={onCreateSchedule}
              onScheduleClick={onScheduleClick}
              onCreateModalClose={onCreateModalClose}
              onCreateSubmit={onCreateSubmit}
              onDetailClose={onDetailClose}
              onDetailEdit={onDetailEdit}
              onDelete={onDelete}
              onEditModalClose={onEditModalClose}
              onEditSubmit={onEditSubmit}
            />
          </div>
        </div>

        {/* Chat tab */}
        <div
          className={`h-[calc(100vh-6rem)] ${activeTab === 'chat' ? 'flex' : 'hidden'} flex-col`}
        >
          <ChatPanel
            teamId={teamId}
            date={selectedDate}
            isLeader={isLeader}
          />
        </div>

        {/* AI 버틀러 tab */}
        <div
          className={`h-[calc(100vh-6rem)] ${activeTab === 'ai-assistant' ? 'flex' : 'hidden'} flex-col`}
        >
          <AIAssistantPanel teamId={teamId} teamName={teamName} />
        </div>
      </div>
    </>
  );
}
