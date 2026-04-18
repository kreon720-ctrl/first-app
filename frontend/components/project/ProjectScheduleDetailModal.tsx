'use client';

import React from 'react';
import type { ProjectSchedule, GanttBarColor } from '@/types/project';
import { useAuthStore } from '@/store/authStore';
import { SubScheduleCreateModal } from './SubScheduleCreateModal';
import { SubScheduleDetailPopup } from './SubScheduleDetailPopup';
import { SubScheduleTimeline } from './SubScheduleTimeline';
import { useSubScheduleEditor } from './useSubScheduleEditor';

// ── 색상 정의 ──
const GANTT_COLOR_DISPLAY: Record<GanttBarColor, { bg: string; border: string; label: string }> = {
  indigo:  { bg: '#c7d2fe', border: '#6366f1', label: '인디고' },
  blue:    { bg: '#bfdbfe', border: '#3b82f6', label: '파랑' },
  emerald: { bg: '#a7f3d0', border: '#10b981', label: '에메랄드' },
  amber:   { bg: '#fde68a', border: '#f59e0b', label: '황금' },
  rose:    { bg: '#fecdd3', border: '#f43f5e', label: '로즈' },
};

// ── Props ──
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

// ── Main Modal ──
export function ProjectScheduleDetailModal({
  isOpen,
  schedule,
  currentUserId,
  phaseName,
  onClose,
  onEdit,
  onDelete,
}: ProjectScheduleDetailModalProps) {
  const currentUserName = useAuthStore(s => s.currentUser?.name ?? '');

  const editor = schedule
    ? useSubScheduleEditor({ schedule, currentUserId })
    : null;

  if (!isOpen || !schedule) return null;

  // editor will always be non-null here since schedule is non-null
  const {
    subSchedules,
    showCreate,
    editingSub,
    viewingSub,
    setViewingSub,
    handleCreateSub,
    handleUpdateSub,
    handleDeleteSub,
    openCreate,
    openEdit,
    closeCreate,
  } = editor!;

  const isOwner   = schedule.createdBy === currentUserId;
  const colorInfo = GANTT_COLOR_DISPLAY[schedule.color] ?? GANTT_COLOR_DISPLAY.indigo;

  const handleDeleteSchedule = () => {
    if (confirm('이 일정을 삭제하시겠습니까?')) onDelete(schedule);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-[90vw] max-w-5xl bg-white rounded-2xl shadow-xl flex flex-col h-[63vh] overflow-x-hidden">

          {/* 타이틀 */}
          <div className="flex items-start justify-between px-6 pt-5 pb-0 flex-none">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex-none"
                style={{ backgroundColor: colorInfo.bg, border: `2px solid ${colorInfo.border}` }} />
              <h2 className="text-lg font-semibold text-gray-900 leading-snug">{schedule.title}</h2>
            </div>
            <button type="button" onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-none ml-2" aria-label="닫기">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 본문 */}
          <div className="flex flex-1 min-h-0 mt-4">

            {/* 좌측: 상세 정보 */}
            <div className="w-72 flex-none flex flex-col px-6 pb-5">
              <div className="flex-1 overflow-y-auto">
                <DetailRow label="기간" value={`${schedule.startDate} ~ ${schedule.endDate}`} />
                {phaseName && <DetailRow label="단계" value={phaseName} />}
                <DetailRow
                  label="진행률"
                  value={
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                        <div className="h-2 rounded-full"
                          style={{ width: `${schedule.progress}%`, backgroundColor: colorInfo.border }} />
                      </div>
                      <span className="text-sm text-gray-700">
                        {schedule.progress}%
                        {schedule.isDelayed && <span className="ml-1 text-red-500 text-xs">(지연)</span>}
                      </span>
                    </div>
                  }
                />
                {schedule.leader && <DetailRow label="일정 담당자" value={schedule.leader} />}
                {schedule.description && (
                  <DetailRow label="설명"
                    value={<span className="whitespace-pre-wrap text-sm text-gray-700">{schedule.description}</span>} />
                )}
                <DetailRow
                  label="색상"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: colorInfo.bg, border: `1.5px solid ${colorInfo.border}` }} />
                      {colorInfo.label}
                    </span>
                  }
                />
                <DetailRow label="등록일" value={new Date(schedule.createdAt).toLocaleDateString('ko-KR')} />
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-4 flex-none">
                {isOwner ? (
                  <>
                    <button type="button" onClick={() => onEdit(schedule)}
                      className="flex-1 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors">
                      수정
                    </button>
                    <button type="button" onClick={handleDeleteSchedule}
                      className="flex-1 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">
                      삭제
                    </button>
                    <button type="button" onClick={onClose}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                      닫기
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={onClose}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                    닫기
                  </button>
                )}
              </div>
            </div>

            {/* 구분선 */}
            <div className="w-px bg-gray-200 flex-none my-2" />

            {/* 우측: 타임라인 */}
            <SubScheduleTimeline
              scheduleStartDate={schedule.startDate}
              scheduleEndDate={schedule.endDate}
              subSchedules={subSchedules}
              onSubClick={setViewingSub}
              onAddClick={openCreate}
            />
          </div>
        </div>
      </div>

      {/* 세부일정 생성/수정 모달 */}
      {showCreate && (
        <SubScheduleCreateModal
          mode={editingSub ? 'edit' : 'create'}
          parentSchedule={schedule}
          subSchedule={editingSub}
          currentUserName={currentUserName}
          onSubmit={editingSub ? handleUpdateSub : handleCreateSub}
          onCancel={closeCreate}
        />
      )}

      {/* 세부일정 상세 팝업 */}
      {viewingSub && (
        <SubScheduleDetailPopup
          sub={viewingSub}
          isOwner={viewingSub.createdBy === currentUserId}
          onEdit={() => openEdit(viewingSub)}
          onDelete={() => handleDeleteSub(viewingSub)}
          onClose={() => setViewingSub(null)}
        />
      )}
    </>
  );
}
