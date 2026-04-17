'use client';

import React, { useState, useEffect } from 'react';
import type {
  Project,
  ProjectSchedule,
  ProjectScheduleCreateInput,
  GanttBarColor,
} from '@/types/project';
import { GANTT_BAR_COLORS } from '@/types/project';
import { useAuthStore } from '@/store/authStore';

// Tailwind static swatch classes (same pattern as ScheduleForm)
const GANTT_COLOR_SWATCH: Record<GanttBarColor, string> = {
  indigo:  'bg-indigo-500',
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
};

interface ProjectScheduleModalProps {
  mode: 'create' | 'edit';
  project: Project;
  schedule?: ProjectSchedule | null;
  onSubmit: (input: ProjectScheduleCreateInput) => void;
  onCancel: () => void;
}

export function ProjectScheduleModal({
  mode,
  project,
  schedule,
  onSubmit,
  onCancel,
}: ProjectScheduleModalProps) {
  const currentUserName = useAuthStore(s => s.currentUser?.name ?? '');

  const [title, setTitle] = useState('');
  const [color, setColor] = useState<GanttBarColor>('indigo');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [leader, setLeader] = useState('');
  const [progress, setProgress] = useState(0);
  const [phaseId, setPhaseId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate when editing
  useEffect(() => {
    if (mode === 'edit' && schedule) {
      setTitle(schedule.title);
      setColor(schedule.color);
      setStartDate(schedule.startDate);
      setEndDate(schedule.endDate);
      setDescription(schedule.description);
      setLeader(schedule.leader);
      setProgress(schedule.progress);
      setPhaseId(schedule.phaseId);
    } else {
      // Default phase to first phase
      if (project.phases.length > 0) {
        setPhaseId(project.phases[0].id);
      }
      // Default dates to project dates
      setStartDate(project.startDate);
      setEndDate(project.endDate);
      // Default leader to current user
      setLeader(currentUserName);
    }
  }, [mode, schedule, project]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = '일정명을 입력해주세요.';
    if (!startDate) newErrors.startDate = '시작일을 입력해주세요.';
    if (!endDate) newErrors.endDate = '종료일을 입력해주세요.';
    if (startDate && endDate && startDate > endDate) {
      newErrors.endDate = '종료일은 시작일 이후여야 합니다.';
    }
    if (!phaseId) newErrors.phaseId = '단계를 선택해주세요.';
    if (progress < 0 || progress > 100) newErrors.progress = '진행률은 0~100 사이여야 합니다.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      color,
      startDate,
      endDate,
      description: description.trim(),
      leader: leader.trim(),
      progress,
      phaseId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? '프로젝트 일정 생성' : '프로젝트 일정 수정'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 일정명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              일정명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정명을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* 색상 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
            <div className="flex items-center gap-3">
              {GANTT_BAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`${c} 색상`}
                  aria-pressed={color === c}
                  className={`w-4 h-4 rounded-full ${GANTT_COLOR_SWATCH[c]} transition-all duration-150 ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 기간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              기간 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={project.startDate}
                max={project.endDate}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-gray-500 text-sm">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={project.startDate}
                max={project.endDate}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>}
            {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>}
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정 설명을 입력하세요"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* 일정 담당자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">일정 담당자</label>
            <input
              type="text"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              placeholder="리더명을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* 진행률 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">진행률</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) =>
                    setProgress(Math.min(100, Math.max(0, Number(e.target.value))))
                  }
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            {errors.progress && <p className="mt-1 text-xs text-red-500">{errors.progress}</p>}
          </div>

          {/* 단계 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              단계 <span className="text-red-500">*</span>
            </label>
            {project.phases.length === 0 ? (
              <p className="text-xs text-gray-400">
                프로젝트에 단계가 없습니다. 먼저 프로젝트 단계를 생성하세요.
              </p>
            ) : (
              <select
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">단계 선택</option>
                {project.phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </select>
            )}
            {errors.phaseId && <p className="mt-1 text-xs text-red-500">{errors.phaseId}</p>}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-colors"
            >
              {mode === 'create' ? '생성' : '수정'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
