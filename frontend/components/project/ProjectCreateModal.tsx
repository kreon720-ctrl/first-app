'use client';

import React, { useState, useEffect } from 'react';
import type { Project, ProjectCreateInput } from '@/types/project';

interface ProjectCreateModalProps {
  mode: 'create' | 'edit';
  project?: Project | null;
  onSubmit: (input: ProjectCreateInput) => void;
  onCancel: () => void;
}

interface PhaseEntry {
  tempId: string;
  name: string;
}

let tempIdCounter = 0;
function makeTempId(): string {
  return `temp-${++tempIdCounter}`;
}

export function ProjectCreateModal({
  mode,
  project,
  onSubmit,
  onCancel,
}: ProjectCreateModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [manager, setManager] = useState('');
  const [phases, setPhases] = useState<PhaseEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate fields when editing
  useEffect(() => {
    if (mode === 'edit' && project) {
      setName(project.name);
      setStartDate(project.startDate);
      setEndDate(project.endDate);
      setProgress(project.progress);
      setManager(project.manager);
      setPhases(
        project.phases.map((p) => ({ tempId: p.id, name: p.name }))
      );
    }
  }, [mode, project]);

  const addPhase = () => {
    setPhases((prev) => [...prev, { tempId: makeTempId(), name: '' }]);
  };

  const removePhase = (tempId: string) => {
    setPhases((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const updatePhase = (tempId: string, value: string) => {
    setPhases((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, name: value } : p))
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = '프로젝트명을 입력해주세요.';
    if (!startDate) newErrors.startDate = '시작일을 입력해주세요.';
    if (!endDate) newErrors.endDate = '종료일을 입력해주세요.';
    if (startDate && endDate && startDate > endDate) {
      newErrors.endDate = '종료일은 시작일 이후여야 합니다.';
    }
    if (progress < 0 || progress > 100) newErrors.progress = '진행률은 0~100 사이여야 합니다.';

    for (const phase of phases) {
      if (!phase.name.trim()) {
        newErrors.phases = '단계명을 모두 입력해주세요.';
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      startDate,
      endDate,
      progress,
      manager: manager.trim(),
      phases: phases
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim() })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? '프로젝트 생성' : '프로젝트 수정'}
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
          {/* 프로젝트명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              프로젝트명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트명을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
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
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-gray-500 text-sm">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>}
            {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>}
          </div>

          {/* 진행률 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              진행률
            </label>
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
                  onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            {errors.progress && <p className="mt-1 text-xs text-red-500">{errors.progress}</p>}
          </div>

          {/* 관리자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              관리자
            </label>
            <input
              type="text"
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              placeholder="관리자명을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* 프로젝트 단계 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">프로젝트 단계</label>
              <button
                type="button"
                onClick={addPhase}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                단계 추가
              </button>
            </div>

            {phases.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2 border border-dashed border-gray-200 rounded-lg">
                단계를 추가하세요.
              </p>
            )}

            <div className="space-y-2">
              {phases.map((phase, idx) => (
                <div key={phase.tempId} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-5 text-right flex-none">{idx + 1}.</span>
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(phase.tempId, e.target.value)}
                    placeholder={`단계 ${idx + 1} 이름`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => removePhase(phase.tempId)}
                    className="flex-none p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="단계 삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {errors.phases && <p className="mt-1 text-xs text-red-500">{errors.phases}</p>}
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
