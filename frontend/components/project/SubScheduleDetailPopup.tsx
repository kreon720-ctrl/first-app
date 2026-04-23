'use client';

import React from 'react';
import type { SubSchedule, GanttBarColor } from '@/types/project';

const BAR_COLORS: Record<GanttBarColor, { outer: string; progress: string; text: string }> = {
  indigo:  { outer: '#e0e7ff', progress: '#818cf8', text: '#312e81' },
  blue:    { outer: '#dbeafe', progress: '#60a5fa', text: '#1e3a8a' },
  emerald: { outer: '#d1fae5', progress: '#34d399', text: '#064e3b' },
  amber:   { outer: '#fef3c7', progress: '#fbbf24', text: '#78350f' },
  rose:    { outer: '#ffe4e6', progress: '#fb7185', text: '#881337' },
};

interface Props {
  sub: SubSchedule;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function SubScheduleDetailPopup({ sub, isOwner, onEdit, onDelete, onClose }: Props) {
  const c = BAR_COLORS[sub.color] ?? BAR_COLORS.indigo;

  const handleDelete = () => {
    if (confirm(`"${sub.title}" 세부일정을 삭제하시겠습니까?`)) onDelete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/70 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-dark-elevated dark:border dark:border-dark-border rounded-2xl shadow-xl p-5">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full flex-none"
              style={{ backgroundColor: c.progress }} />
            <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text">{sub.title}</h3>
          </div>
          <button type="button" onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors flex-none ml-2" aria-label="닫기">
            <svg className="w-4 h-4 text-gray-500 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 mb-5 text-sm">
          <div className="flex gap-3">
            <span className="w-20 flex-none text-xs font-medium text-gray-500 dark:text-dark-text-muted pt-0.5">기간</span>
            <span className="text-gray-800 dark:text-dark-text">{sub.startDate} ~ {sub.endDate}</span>
          </div>

          {/* 진행률 바 */}
          <div className="flex gap-3 items-center">
            <span className="w-20 flex-none text-xs font-medium text-gray-500 dark:text-dark-text-muted">진행률</span>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 rounded-full h-2" style={{ backgroundColor: c.outer }}>
                <div className="h-2 rounded-full" style={{ width: `${sub.progress}%`, backgroundColor: c.progress }} />
              </div>
              <span className="text-xs text-gray-700 dark:text-dark-text-muted w-8 text-right">{sub.progress}%</span>
              {sub.isDelayed && (
                <span className="text-xs font-semibold text-red-500">지연</span>
              )}
            </div>
          </div>

          {sub.leader && (
            <div className="flex gap-3">
              <span className="w-20 flex-none text-xs font-medium text-gray-500 dark:text-dark-text-muted pt-0.5">담당자</span>
              <span className="text-gray-800 dark:text-dark-text">{sub.leader}</span>
            </div>
          )}
          {sub.description && (
            <div className="flex gap-3">
              <span className="w-20 flex-none text-xs font-medium text-gray-500 dark:text-dark-text-muted pt-0.5">설명</span>
              <span className="text-gray-800 dark:text-dark-text whitespace-pre-wrap">{sub.description}</span>
            </div>
          )}
          <div className="flex gap-3">
            <span className="w-20 flex-none text-xs font-medium text-gray-500 dark:text-dark-text-muted pt-0.5">등록일</span>
            <span className="text-gray-800 dark:text-dark-text">{new Date(sub.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-center gap-2">
          {isOwner ? (
            <>
              <button type="button" onClick={onEdit}
                className="flex-1 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors">
                수정
              </button>
              <button type="button" onClick={handleDelete}
                className="flex-1 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">
                삭제
              </button>
              <button type="button" onClick={onClose}
                className="flex-1 py-2 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text-muted text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-elevated transition-colors">
                취소
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose}
              className="flex-1 py-2 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text-muted text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-elevated transition-colors">
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
