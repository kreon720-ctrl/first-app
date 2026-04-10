'use client';

import React, { useState } from 'react';
import { ScheduleCreateInput, ScheduleUpdateInput, Schedule } from '@/types/schedule';
import { Button } from '@/components/common/Button';

interface ScheduleFormProps {
  mode: 'create' | 'edit';
  initialData?: Schedule;
  onSubmit: (data: ScheduleCreateInput | ScheduleUpdateInput) => void;
  onCancel: () => void;
  isPending?: boolean;
  error?: string | null;
}

interface FormErrors {
  title?: string;
  startAt?: string;
  endAt?: string;
  general?: string;
}

const MAX_TITLE_LENGTH = 200;

export function ScheduleForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
  error,
}: ScheduleFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [startDate, setStartDate] = useState(
    initialData?.startAt ? initialData.startAt.slice(0, 16) : ''
  );
  const [endDate, setEndDate] = useState(
    initialData?.endAt ? initialData.endAt.slice(0, 16) : ''
  );
  const [errors, setErrors] = useState<FormErrors>(() => (error ? { general: error } : {}));

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = '제목은 필수입니다.';
    } else if (title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `제목은 최대 ${MAX_TITLE_LENGTH}자까지 입력 가능합니다.`;
    }

    if (!startDate) {
      newErrors.startAt = '시작 일시는 필수입니다.';
    }

    if (!endDate) {
      newErrors.endAt = '종료 일시는 필수입니다.';
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      newErrors.endAt = '종료 시각은 시작 시각 이후여야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: ScheduleCreateInput | ScheduleUpdateInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      startAt: new Date(startDate).toISOString(),
      endAt: new Date(endDate).toISOString(),
    };

    onSubmit(data);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full bg-white">
      {/* Title */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="text-sm font-medium text-gray-700">
          제목 <span className="text-error-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="일정 제목을 입력하세요"
          maxLength={MAX_TITLE_LENGTH}
          disabled={isPending}
          className={`w-full border rounded-xl bg-white px-4 py-2.5 text-base font-normal text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.title
              ? 'border-error-500 focus:ring-error-500 bg-error-50'
              : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
          }`}
        />
        <div className="flex items-center justify-between">
          {errors.title ? (
            <p className="text-sm font-normal text-error-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.title}
            </p>
          ) : (
            <span />
          )}
          <p className="text-xs text-gray-400">{title.length} / {MAX_TITLE_LENGTH}자</p>
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="text-sm font-medium text-gray-700">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명을 입력하세요 (선택)"
          rows={3}
          disabled={isPending}
          className="w-full border border-gray-300 rounded-xl bg-white px-4 py-2.5 text-sm font-normal text-gray-800 placeholder:text-gray-400 shadow-sm resize-none transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Start Date */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="text-sm font-medium text-gray-700">
          시작 일시 <span className="text-error-500">*</span>
        </label>
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            if (errors.startAt) {
              setErrors((prev) => ({ ...prev, startAt: undefined }));
            }
          }}
          disabled={isPending}
          className={`w-full border rounded-xl bg-white px-4 py-2.5 text-base font-normal text-gray-900 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.startAt
              ? 'border-error-500 focus:ring-error-500 bg-error-50'
              : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
          }`}
        />
        {errors.startAt && (
          <p className="text-sm font-normal text-error-500">{errors.startAt}</p>
        )}
      </div>

      {/* End Date */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="text-sm font-medium text-gray-700">
          종료 일시 <span className="text-error-500">*</span>
        </label>
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            if (errors.endAt) {
              setErrors((prev) => ({ ...prev, endAt: undefined }));
            }
          }}
          disabled={isPending}
          className={`w-full border rounded-xl bg-white px-4 py-2.5 text-base font-normal text-gray-900 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.endAt
              ? 'border-error-500 focus:ring-error-500 bg-error-50'
              : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
          }`}
        />
        {errors.endAt && (
          <p className="text-sm font-normal text-error-500">{errors.endAt}</p>
        )}
      </div>

      {/* General error */}
      {errors.general && (
        <div className="mb-5 p-3 bg-error-50 border border-error-500 rounded-xl">
          <p className="text-sm font-normal text-error-500">{errors.general}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isPending}
        >
          취소
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
        >
          {isPending ? '저장 중...' : mode === 'create' ? '생성' : '저장'}
        </Button>
      </div>
    </form>
  );
}
