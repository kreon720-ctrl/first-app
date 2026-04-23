'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ProjectSchedule, SubSchedule, SubScheduleCreateInput, GanttBarColor } from '@/types/project';
import { GANTT_BAR_COLORS } from '@/types/project';
import { useTeamDetail } from '@/hooks/query/useTeams';

// Static swatch classes (Tailwind v4)
const SWATCH: Record<GanttBarColor, string> = {
  indigo:  'bg-indigo-500',
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
};

interface Props {
  mode: 'create' | 'edit';
  parentSchedule: ProjectSchedule;
  subSchedule?: SubSchedule | null;
  currentUserName: string;
  teamId: string;
  onSubmit: (input: SubScheduleCreateInput) => void;
  onCancel: () => void;
}

export function SubScheduleCreateModal({
  mode,
  parentSchedule,
  subSchedule,
  currentUserName,
  teamId,
  onSubmit,
  onCancel,
}: Props) {
  const { data: teamDetail } = useTeamDetail(teamId);
  const members = teamDetail?.members ?? [];

  const [title, setTitle]           = useState('');
  const [color, setColor]           = useState<GanttBarColor>('indigo');
  const [startDate, setStartDate]   = useState(parentSchedule.startDate);
  const [endDate, setEndDate]       = useState(parentSchedule.endDate);
  const [description, setDescription] = useState('');
  const [leader, setLeader]         = useState(currentUserName);
  const [progress, setProgress]     = useState(0);
  const [isDelayed, setIsDelayed]   = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMemberPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMemberPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMemberPicker]);

  useEffect(() => {
    if (mode === 'edit' && subSchedule) {
      setTitle(subSchedule.title);
      setColor(subSchedule.color);
      setStartDate(subSchedule.startDate);
      setEndDate(subSchedule.endDate);
      setDescription(subSchedule.description);
      setLeader(subSchedule.leader);
      setProgress(subSchedule.progress);
      setIsDelayed(subSchedule.isDelayed ?? false);
    } else {
      setTitle('');
      setColor('indigo');
      setStartDate(parentSchedule.startDate);
      setEndDate(parentSchedule.endDate);
      setDescription('');
      setLeader(currentUserName);
      setProgress(0);
      setIsDelayed(false);
    }
    setErrors({});
  }, [mode, subSchedule?.id]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = '일정명을 입력해주세요.';
    if (!startDate) e.startDate = '시작일을 입력해주세요.';
    if (!endDate) e.endDate = '종료일을 입력해주세요.';
    if (startDate && endDate && startDate > endDate) e.endDate = '종료일은 시작일 이후여야 합니다.';
    if (startDate < parentSchedule.startDate) e.startDate = '상위 일정 시작일 이전입니다.';
    if (endDate > parentSchedule.endDate) e.endDate = '상위 일정 종료일 이후입니다.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({ title: title.trim(), color, startDate, endDate,
               description: description.trim(), leader: leader.trim(), progress, isDelayed });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? '세부일정 생성' : '세부일정 수정'}
          </h2>
          <button type="button" onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="닫기">
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
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="세부 일정명을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* 색상 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
            <div className="flex items-center gap-3">
              {GANTT_BAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  aria-label={`${c} 색상`} aria-pressed={color === c}
                  className={`w-5 h-5 rounded-full ${SWATCH[c]} transition-all duration-150 ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`} />
              ))}
            </div>
          </div>

          {/* 기간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              기간 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                min={parentSchedule.startDate} max={parentSchedule.endDate}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <span className="text-gray-500 text-sm">~</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                min={parentSchedule.startDate} max={parentSchedule.endDate}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>}
            {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>}
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="세부 일정 설명을 입력하세요" rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>

          {/* 일정 담당자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">일정 담당자</label>
            <div className="relative flex gap-2" ref={pickerRef}>
              <input type="text" value={leader} onChange={e => setLeader(e.target.value)}
                placeholder="담당자명을 입력하세요"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button
                type="button"
                onClick={() => setShowMemberPicker((v) => !v)}
                className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors whitespace-nowrap"
              >
                찾기
              </button>
              {showMemberPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400">팀원이 없습니다.</p>
                  ) : (
                    members.map((m) => (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => { setLeader(m.name); setShowMemberPicker(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-800">{m.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          m.role === 'LEADER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>{m.role === 'LEADER' ? '리더' : '멤버'}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 진행률 + 지연 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">진행률</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={progress}
                onChange={e => setProgress(Number(e.target.value))} className="flex-1" />
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={100} value={progress}
                  onChange={e => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDelayed}
                  onChange={e => setIsDelayed(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-500 accent-red-500 cursor-pointer"
                />
                <span className="text-sm text-red-500 font-medium">지연</span>
              </label>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button type="submit"
              className="flex-1 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors">
              {mode === 'create' ? '생성' : '수정'}
            </button>
            <button type="button" onClick={onCancel}
              className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
