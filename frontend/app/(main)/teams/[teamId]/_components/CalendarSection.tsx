'use client';

import React from 'react';
import { CalendarView } from '@/components/schedule/CalendarView';
import { ScheduleForm } from '@/components/schedule/ScheduleForm';
import { ScheduleDetailModal } from '@/components/schedule/ScheduleDetailModal';
import type { Schedule, ScheduleCreateInput, ScheduleUpdateInput, CalendarView as CalendarViewType } from '@/types/schedule';
import type { PostIt } from '@/types/postit';
import type { ScheduleColor } from '@/types/schedule';

interface CalendarSectionProps {
  teamId: string;
  currentDate: Date;
  selectedDate: string;
  calendarView: CalendarViewType;
  schedules: Schedule[];
  postits: PostIt[];
  currentUserId: string | undefined;
  isLeader: boolean;
  compact?: boolean;
  selectedPostitColor: ScheduleColor | null;
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
  onPostitColorSelect: (color: ScheduleColor | null) => void;
  onPostitDelete: (id: string, date: string) => void;
  onPostitContentChange: (id: string, content: string) => void;
  onViewChange: (view: 'month' | 'week' | 'day' | 'project') => void;
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
  onCreateSchedule: (defaultDate?: string) => void;
  onScheduleClick: (schedule: Schedule) => void;
  onCreateModalClose: () => void;
  onCreateSubmit: (data: ScheduleCreateInput | ScheduleUpdateInput) => void;
  onDetailClose: () => void;
  onDetailEdit: () => void;
  onDelete: () => void;
  onEditModalClose: () => void;
  onEditSubmit: (data: ScheduleCreateInput | ScheduleUpdateInput) => void;
}

export function CalendarSection({
  teamId,
  currentDate,
  selectedDate,
  calendarView,
  schedules,
  postits,
  currentUserId,
  isLeader,
  compact = false,
  selectedPostitColor,
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
  onPostitColorSelect,
  onPostitDelete,
  onPostitContentChange,
  onViewChange,
  onDateChange,
  onDateClick,
  onCreateSchedule,
  onScheduleClick,
  onCreateModalClose,
  onCreateSubmit,
  onDetailClose,
  onDetailEdit,
  onDelete,
  onEditModalClose,
  onEditSubmit,
}: CalendarSectionProps) {

  function getKSTTimeStrings(dateStr: string): { startAt: string; endAt: string } {
    const now = new Date();
    const kstHour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
    const endHour = (kstHour + 1) % 24;
    const endDate = endHour === 0 ? (() => {
      const d = new Date(dateStr);
      d.setUTCDate(d.getUTCDate() + 1);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    })() : dateStr;
    return {
      startAt: `${dateStr}T${String(kstHour).padStart(2, '0')}:00`,
      endAt: `${endDate}T${String(endHour).padStart(2, '0')}:00`,
    };
  }

  return (
    <>
      <CalendarView
        currentDate={currentDate}
        view={calendarView}
        schedules={schedules}
        canCreateSchedule={true}
        compact={compact}
        postits={postits}
        currentUserId={currentUserId}
        selectedPostitColor={selectedPostitColor}
        onPostitColorSelect={onPostitColorSelect}
        onPostitDelete={onPostitDelete}
        onPostitContentChange={onPostitContentChange}
        onViewChange={onViewChange}
        onDateChange={onDateChange}
        onDateClick={onDateClick}
        onCreateSchedule={onCreateSchedule}
        onScheduleClick={onScheduleClick}
        teamId={teamId}
        isLeader={isLeader}
      />

      {/* 일정 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 dark:bg-black/70 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-dark-elevated dark:border dark:border-dark-border rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">일정 등록</h2>
              <button
                type="button"
                onClick={onCreateModalClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors duration-150"
                aria-label="닫기"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ScheduleForm
              mode="create"
              initialData={scheduleDefaultDate ? {
                id: '', teamId, title: '', description: null,
                ...getKSTTimeStrings(scheduleDefaultDate),
                createdBy: '', creatorName: null, createdAt: '', updatedAt: '',
              } : undefined}
              onSubmit={onCreateSubmit}
              onCancel={onCreateModalClose}
              isPending={createScheduleIsPending}
              error={createScheduleError}
            />
          </div>
        </div>
      )}

      {/* 일정 상세/수정/삭제 모달 */}
      <ScheduleDetailModal
        isOpen={showDetailModal}
        schedule={selectedSchedule}
        currentUserId={currentUserId ?? null}
        onClose={onDetailClose}
        onEdit={onDetailEdit}
        onDelete={onDelete}
        isDeleting={deleteScheduleIsPending}
      />

      {showEditModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 dark:bg-black/70 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-dark-elevated dark:border dark:border-dark-border rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">일정 수정</h2>
              <button
                type="button"
                onClick={onEditModalClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors duration-150"
                aria-label="닫기"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ScheduleForm
              mode="edit"
              initialData={selectedSchedule}
              onSubmit={onEditSubmit}
              onCancel={onEditModalClose}
              isPending={updateScheduleIsPending}
              error={updateScheduleError}
            />
          </div>
        </div>
      )}
    </>
  );
}
