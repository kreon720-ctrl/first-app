'use client';

import React from 'react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { CalendarSection } from './CalendarSection';
import type { Schedule, ScheduleCreateInput, ScheduleUpdateInput, CalendarView as CalendarViewType } from '@/types/schedule';

interface MobileLayoutProps {
  teamId: string;
  currentDate: Date;
  selectedDate: string;
  calendarView: CalendarViewType;
  schedules: Schedule[];
  isLeader: boolean;
  activeTab: 'calendar' | 'chat';
  onTabChange: (tab: 'calendar' | 'chat') => void;
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
      <div className="flex border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => onTabChange('calendar')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-150 ${
            activeTab === 'calendar'
              ? 'text-primary-600 border-primary-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          캘린더
        </button>
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-150 ${
            activeTab === 'chat'
              ? 'text-primary-600 border-primary-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          채팅
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
          className={`h-[calc(100vh-8rem)] ${activeTab === 'chat' ? 'flex' : 'hidden'} flex-col`}
        >
          <ChatPanel
            teamId={teamId}
            date={selectedDate}
            isLeader={isLeader}
          />
        </div>
      </div>
    </>
  );
}
