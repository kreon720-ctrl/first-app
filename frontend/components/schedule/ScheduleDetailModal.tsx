'use client';

import React from 'react';
import { Schedule } from '@/types/schedule';
import { Button } from '@/components/common/Button';

interface ScheduleDetailModalProps {
  isOpen: boolean;
  schedule: Schedule | null;
  currentUserId: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function ScheduleDetailModal({
  isOpen,
  schedule,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  isDeleting = false,
}: ScheduleDetailModalProps) {
  if (!isOpen || !schedule) return null;

  // 일정을 등록한 사람만 수정/삭제 가능
  const canEditOrDelete = currentUserId === schedule.createdBy;

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative z-50 w-full max-w-md bg-white dark:bg-dark-elevated dark:border dark:border-dark-border rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text truncate">
            {schedule.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors duration-150"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="text-sm font-medium text-gray-500 dark:text-dark-text-muted mb-1 block">설명</label>
          <p className="text-base font-normal text-gray-800 dark:text-dark-text leading-relaxed">
            {schedule.description || '-'}
          </p>
        </div>

        {/* Start Date */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-500 dark:text-dark-text-muted mb-1 block">시작 일시</label>
          <p className="text-base font-normal text-gray-800 dark:text-dark-text">
            {formatDate(schedule.startAt)}
          </p>
        </div>

        {/* End Date */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-500 dark:text-dark-text-muted mb-1 block">종료 일시</label>
          <p className="text-base font-normal text-gray-800 dark:text-dark-text">
            {formatDate(schedule.endAt)}
          </p>
        </div>

        {/* Creator */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-500 dark:text-dark-text-muted mb-1 block">등록자</label>
          <p className="text-base font-normal text-gray-800 dark:text-dark-text">
            {schedule.creatorName || '알 수 없음'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
          {canEditOrDelete && (
            <>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={onEdit}
              >
                수정
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
