'use client';

import React from 'react';
import type { ProjectSchedule, GanttBarColor } from '@/types/project';

// Color display for the badge
const GANTT_COLOR_DISPLAY: Record<GanttBarColor, { bg: string; border: string; label: string }> = {
  indigo:  { bg: '#c7d2fe', border: '#6366f1', label: '인디고' },
  blue:    { bg: '#bfdbfe', border: '#3b82f6', label: '파랑' },
  emerald: { bg: '#a7f3d0', border: '#10b981', label: '에메랄드' },
  amber:   { bg: '#fde68a', border: '#f59e0b', label: '황금' },
  rose:    { bg: '#fecdd3', border: '#f43f5e', label: '로즈' },
  violet:  { bg: '#ddd6fe', border: '#8b5cf6', label: '보라' },
  cyan:    { bg: '#a5f3fc', border: '#06b6d4', label: '하늘' },
  pink:    { bg: '#fbcfe8', border: '#ec4899', label: '핑크' },
};

interface ProjectScheduleDetailModalProps {
  isOpen: boolean;
  schedule: ProjectSchedule | null;
  currentUserId: string;
  phaseName?: string;
  onClose: () => void;
  onEdit: (schedule: ProjectSchedule) => void;
  onDelete: (schedule: ProjectSchedule) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <span className="w-24 flex-none text-xs font-medium text-gray-500 pt-0.5">{label}</span>
      <span className="flex-1 text-sm text-gray-800">{value}</span>
    </div>
  );
}

export function ProjectScheduleDetailModal({
  isOpen,
  schedule,
  currentUserId,
  phaseName,
  onClose,
  onEdit,
  onDelete,
}: ProjectScheduleDetailModalProps) {
  if (!isOpen || !schedule) return null;

  const isOwner = schedule.createdBy === currentUserId;
  const colorInfo = GANTT_COLOR_DISPLAY[schedule.color] ?? GANTT_COLOR_DISPLAY.indigo;

  const handleDelete = () => {
    if (confirm('이 일정을 삭제하시겠습니까?')) {
      onDelete(schedule);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full flex-none"
              style={{ backgroundColor: colorInfo.bg, border: `2px solid ${colorInfo.border}` }}
            />
            <h2 className="text-lg font-semibold text-gray-900 leading-snug">{schedule.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-none ml-2"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="mb-5">
          <DetailRow
            label="기간"
            value={`${schedule.startDate} ~ ${schedule.endDate}`}
          />
          {phaseName && (
            <DetailRow label="단계" value={phaseName} />
          )}
          <DetailRow
            label="진행률"
            value={
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${schedule.progress}%`,
                      backgroundColor: colorInfo.border,
                    }}
                  />
                </div>
                <span className="text-sm text-gray-700">{schedule.progress}%</span>
              </div>
            }
          />
          {schedule.leader && (
            <DetailRow label="프로젝트 리더" value={schedule.leader} />
          )}
          {schedule.description && (
            <DetailRow
              label="설명"
              value={
                <span className="whitespace-pre-wrap text-sm text-gray-700">
                  {schedule.description}
                </span>
              }
            />
          )}
          <DetailRow
            label="색상"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: colorInfo.bg, border: `1.5px solid ${colorInfo.border}` }}
                />
                {colorInfo.label}
              </span>
            }
          />
          <DetailRow
            label="등록일"
            value={new Date(schedule.createdAt).toLocaleDateString('ko-KR')}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(schedule)}
                className="flex-1 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                수정
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
