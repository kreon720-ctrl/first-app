'use client';

import React, { useState, useMemo } from 'react';
import { ScheduleCreateInput, ScheduleUpdateInput, Schedule, ScheduleColor, SCHEDULE_COLORS } from '@/types/schedule';
import { Button } from '@/components/common/Button';
import { utcToKST } from '@/lib/utils/timezone';

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

// 색상별 Tailwind 클래스 매핑
const COLOR_CLASSES: Record<ScheduleColor, { bg: string; text: string; border: string; hover: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-400', hover: 'hover:bg-indigo-200', ring: 'ring-indigo-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400', hover: 'hover:bg-blue-200', ring: 'ring-blue-500' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-400', hover: 'hover:bg-emerald-200', ring: 'ring-emerald-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-400', hover: 'hover:bg-amber-200', ring: 'ring-amber-500' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-400', hover: 'hover:bg-rose-200', ring: 'ring-rose-500' },
};

// 색상 팔레트 원형 표시용 색상 (선택된 색상 강조용)
const COLOR_SWATCH_COLORS: Record<ScheduleColor, string> = {
  indigo: 'bg-indigo-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

// 커스텀 날짜/시간 선택기 컴포넌트
interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label: string;
}

function DateTimePicker({ value, onChange, disabled, error, label }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 현재 값 파싱
  const currentDate = value ? new Date(value) : new Date();
  const [selectedDate, setSelectedDate] = useState(currentDate);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const day = selectedDate.getDate();
  const hours = selectedDate.getHours();
  const minutes = selectedDate.getMinutes();

  // 달력 생성
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks: Date[][] = [];
  const current = new Date(startDate);
  for (let week = 0; week < 6; week++) {
    const days: Date[] = [];
    for (let day = 0; day < 7; day++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(days);
    if (current > lastDayOfMonth) break;
  }

  const handleDateClick = (date: Date) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    newDate.setDate(date.getDate());
    setSelectedDate(newDate);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', newValue: number) => {
    const newDate = new Date(selectedDate);
    if (type === 'hours') {
      newDate.setHours(newValue);
    } else {
      newDate.setMinutes(newValue);
    }
    setSelectedDate(newDate);
  };

  const handleApply = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const hours = String(selectedDate.getHours()).padStart(2, '0');
    const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
    onChange(`${year}-${month}-${day}T${hours}:${minutes}`);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    // 닫을 때 원래 값으로 되돌리기
    if (value) {
      setSelectedDate(new Date(value));
    }
  };

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const isSelected = (date: Date) => {
    return date.getFullYear() === selectedDate.getFullYear() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getDate() === selectedDate.getDate();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };

  // 표시용 포맷
  const displayValue = value ? (() => {
    // value is in local datetime format: "YYYY-MM-DDTHH:mm"
    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const d = new Date(year, month - 1, day, hour, minute);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${dd} ${h}:${min}`;
  })() : '';

  return (
    <div className="relative">
      <label className="text-sm font-medium text-gray-700 dark:text-dark-text-muted mb-1.5 block">
        {label} <span className="text-error-500">*</span>
      </label>

      {/* 표시 필드 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={displayValue}
          readOnly
          onClick={() => {
            if (!disabled) {
              if (!isOpen && value) setSelectedDate(new Date(value));
              setIsOpen(!isOpen);
            }
          }}
          placeholder="날짜와 시간을 선택하세요"
          disabled={disabled}
          className={`flex-1 border rounded-xl bg-white dark:bg-dark-surface px-4 py-2.5 text-base font-normal text-gray-900 dark:text-dark-text shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer ${
            error
              ? 'border-error-500 focus:ring-error-500 bg-error-50'
              : 'border-gray-300 dark:border-dark-border focus:ring-primary-500 dark:focus:ring-dark-accent focus:border-transparent'
          }`}
        />
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              if (!isOpen && value) setSelectedDate(new Date(value));
              setIsOpen(!isOpen);
            }
          }}
          disabled={disabled}
          className="px-3 py-2.5 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-elevated disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {error && <p className="text-sm font-normal text-error-500 mt-1">{error}</p>}

      {/* 팝오버 */}
      {isOpen && (
        <>
          {/* 백드롭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
          />
          
          {/* 날짜/시간 선택기 */}
          <div className="absolute z-50 mt-2 bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl p-4 w-80">
            {/* 월 이동 */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text">
                {year}년 {month + 1}월
              </h3>
              <button
                type="button"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-2">
              {weekdays.map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-xs font-medium py-1 ${
                    index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 달력 그리드 */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {weeks.map((week, weekIdx) => (
                week.map((date, dayIdx) => {
                  const today = isToday(date);
                  const selected = isSelected(date);
                  const currentMonth = isCurrentMonth(date);

                  return (
                    <button
                      key={`${weekIdx}-${dayIdx}`}
                      type="button"
                      onClick={() => handleDateClick(date)}
                      className={`
                        p-1.5 text-sm rounded-lg transition-all duration-150
                        ${!currentMonth ? 'text-gray-300' : today ? 'ring-2 ring-orange-500 font-semibold' : selected ? 'bg-primary-100 text-primary-800 font-semibold' : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })
              ))}
            </div>

            {/* 시간 선택 */}
            <div className="border-t border-gray-200 dark:border-dark-border pt-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">시간</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTimeChange('hours', (hours + 1) % 24)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={String(hours).padStart(2, '0')}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 0 && val < 24) {
                          handleTimeChange('hours', val);
                        }
                      }}
                      className="w-14 text-center text-2xl font-semibold border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg py-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleTimeChange('hours', (hours + 23) % 24)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <span className="text-2xl font-semibold text-gray-400 dark:text-dark-text-muted mt-5">:</span>

                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">분</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTimeChange('minutes', (minutes + 1) % 60)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={String(minutes).padStart(2, '0')}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 0 && val < 60) {
                          handleTimeChange('minutes', val);
                        }
                      }}
                      className="w-14 text-center text-2xl font-semibold border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg py-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleTimeChange('minutes', (minutes + 59) % 60)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
              >
                적용
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-xl text-gray-700 dark:text-dark-text-muted hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
  const [color, setColor] = useState<ScheduleColor>(initialData?.color ?? 'indigo');

  // KST 기준으로 현재 시간 계산 (컴포넌트 마운트 시 한 번만 계산)
  const defaultDates = useMemo(() => {
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const startStr = `${kstNow.getUTCFullYear()}-${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}-${String(kstNow.getUTCDate()).padStart(2, '0')}T${String(kstNow.getUTCHours()).padStart(2, '0')}:00`;
    const kstEnd = new Date(kstNow.getTime() + 60 * 60 * 1000);
    const endStr = `${kstEnd.getUTCFullYear()}-${String(kstEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(kstEnd.getUTCDate()).padStart(2, '0')}T${String(kstEnd.getUTCHours()).padStart(2, '0')}:00`;
    return { startStr, endStr };
  }, []);

  const [startDate, setStartDate] = useState(() => {
    if (initialData?.startAt) {
      const kst = utcToKST(new Date(initialData.startAt));
      return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}T${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
    }
    return defaultDates.startStr;
  });
  const [endDate, setEndDate] = useState(() => {
    if (initialData?.endAt) {
      const kst = utcToKST(new Date(initialData.endAt));
      return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}T${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
    }
    return defaultDates.endStr;
  });
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

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endAt = '종료 시각은 시작 시각과 같거나 이후여야 합니다.';
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
      color,
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
    <form onSubmit={handleSubmit} className="w-full bg-white dark:bg-dark-elevated">
      {/* Title */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="text-sm font-medium text-gray-700 dark:text-dark-text-muted">
          제목 <span className="text-error-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="일정 제목을 입력하세요"
          maxLength={MAX_TITLE_LENGTH}
          disabled={isPending}
          className={`w-full border rounded-xl bg-white dark:bg-dark-surface px-4 py-2.5 text-base font-normal text-gray-900 dark:text-dark-text placeholder:text-gray-400 dark:placeholder:text-dark-text-disabled shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:border-transparent focus:dark:ring-dark-accent disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.title
              ? 'border-error-500 focus:ring-error-500 bg-error-50'
              : 'border-gray-300 dark:border-dark-border focus:ring-primary-500 focus:border-transparent'
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

      {/* Color Palette */}
      <div className="flex flex-col gap-2 mb-5">
        <label className="text-sm font-medium text-gray-700 dark:text-dark-text-muted">색상</label>
        <div className="flex items-center gap-3">
          {SCHEDULE_COLORS.map((colorOption) => {
            const isSelected = color === colorOption;
            const swatchColor = COLOR_SWATCH_COLORS[colorOption];
            return (
              <button
                key={colorOption}
                type="button"
                onClick={() => setColor(colorOption)}
                disabled={isPending}
                className={`
                  w-4 h-4 rounded-full ${swatchColor} transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                  ${isSelected ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}
                `}
                title={colorOption}
                aria-label={`${colorOption} 색상 선택`}
              />
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="text-sm font-medium text-gray-700 dark:text-dark-text-muted">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명을 입력하세요 (선택)"
          rows={3}
          disabled={isPending}
          className="w-full border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-surface px-4 py-2.5 text-sm font-normal text-gray-800 dark:text-dark-text placeholder:text-gray-400 dark:placeholder:text-dark-text-disabled shadow-sm resize-none transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-accent focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Start Date */}
      <div className="flex flex-col gap-1.5 mb-5">
        <DateTimePicker
          label="시작 일시"
          value={startDate}
          onChange={(value) => {
            setStartDate(value);
            // 시작 일시를 변경하면 종료 일시도 같은 날짜로 설정하고, 시간은 1시간 뒤로 설정
            const endDateValue = new Date(value);
            endDateValue.setHours(endDateValue.getHours() + 1);
            const endYear = endDateValue.getFullYear();
            const endMonth = String(endDateValue.getMonth() + 1).padStart(2, '0');
            const endDay = String(endDateValue.getDate()).padStart(2, '0');
            const endHours = String(endDateValue.getHours()).padStart(2, '0');
            const endMinutes = String(endDateValue.getMinutes()).padStart(2, '0');
            setEndDate(`${endYear}-${endMonth}-${endDay}T${endHours}:${endMinutes}`);
            if (errors.startAt) {
              setErrors((prev) => ({ ...prev, startAt: undefined }));
            }
            if (errors.endAt) {
              setErrors((prev) => ({ ...prev, endAt: undefined }));
            }
          }}
          disabled={isPending}
          error={errors.startAt}
        />
      </div>

      {/* End Date */}
      <div className="flex flex-col gap-1.5 mb-5">
        <DateTimePicker
          label="종료 일시"
          value={endDate}
          onChange={(value) => {
            setEndDate(value);
            if (errors.endAt) {
              setErrors((prev) => ({ ...prev, endAt: undefined }));
            }
          }}
          disabled={isPending}
          error={errors.endAt}
        />
      </div>

      {/* General error */}
      {errors.general && (
        <div className="mb-5 p-3 bg-error-50 border border-error-500 rounded-xl">
          <p className="text-sm font-normal text-error-500">{errors.general}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
        >
          {isPending ? '저장 중...' : mode === 'create' ? '생성' : '저장'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isPending}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
