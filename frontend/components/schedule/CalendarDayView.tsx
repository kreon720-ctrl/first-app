'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime, formatDateKorean } from '@/lib/utils/timezone';

export const HOUR_PX = 56;
const MIN_COL_WIDTH_PCT = 20; // 5개 초과 시 컬럼당 최소 너비(%)
const MAX_INLINE_COLS = 5;    // 이 수를 초과하면 가로 스크롤 적용

interface CalendarDayViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
  onScheduleClick?: (schedule: Schedule) => void;
}

export interface LayoutItem {
  schedule: Schedule;
  column: number;
  totalColumns: number;
  startMin: number; // KST 기준 자정부터의 분
  endMin: number;   // KST 기준 자정부터의 분 (최소 startMin + 15)
}

/** UTC 타임스탬프 → KST 자정부터의 분 */
export function getKSTMinutes(utcDateStr: string): number {
  const kst = utcToKST(new Date(utcDateStr));
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
}

/** KST 기준으로 날짜만 추출한 Date(UTC midnight) */
function scheduleToDay(utcDate: Date): Date {
  const kst = utcToKST(utcDate);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

/**
 * 일정 목록을 받아 각 일정의 column, totalColumns, startMin/endMin 을 반환합니다.
 *
 * 너비 규칙 (하루 전체 일정 수 N 기준)
 *   N=1 → 100%,  N=2 → 50%,  N=3 → 33%,  N=4 → 25%,  N=5 → 20%
 *   N≥6 → 컬럼당 20% (가로 스크롤)
 *
 * 컬럼 배정: 시작 시각 오름차순 정렬 후 인덱스 순서대로 0, 1, 2, ...
 */
export function computeLayout(schedules: Schedule[]): LayoutItem[] {
  if (schedules.length === 0) return [];

  const totalColumns = schedules.length;

  const sorted = [...schedules].sort((a, b) => {
    const diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    if (diff !== 0) return diff;
    // 같은 시작 시각 → 긴 일정 먼저
    return new Date(b.endAt).getTime() - new Date(a.endAt).getTime();
  });

  return sorted.map((schedule, index) => {
    const startMin = getKSTMinutes(schedule.startAt);
    const rawEnd = getKSTMinutes(schedule.endAt);
    const endMin = Math.max(rawEnd, startMin + 15); // 최소 15분 높이 보장
    return { schedule, column: index, totalColumns, startMin, endMin };
  });
}

export function CalendarDayView({
  currentDate,
  schedules = [],
  onScheduleClick,
}: CalendarDayViewProps) {
  const targetDay = useMemo(
    () => new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate())),
    [currentDate]
  );

  // 당일 시작~종료하는 일정만 추출 (다일 일정 제외)
  const timedSchedules = useMemo(
    () =>
      schedules.filter(s => {
        const startDay = scheduleToDay(new Date(s.startAt));
        const endDay = scheduleToDay(new Date(s.endAt));
        return startDay.getTime() === endDay.getTime() && startDay.getTime() === targetDay.getTime();
      }),
    [schedules, targetDay]
  );

  const layoutItems = useMemo(() => computeLayout(timedSchedules), [timedSchedules]);

  const maxConcurrentCols = useMemo(
    () => (layoutItems.length > 0 ? Math.max(...layoutItems.map(i => i.totalColumns)) : 1),
    [layoutItems]
  );

  const needsHScroll = maxConcurrentCols > MAX_INLINE_COLS;

  // 자동 스크롤: 가장 이른 일정 1시간 전, 없으면 08:00
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!timelineRef.current) return;
    if (timedSchedules.length > 0) {
      const minMin = Math.min(...timedSchedules.map(s => getKSTMinutes(s.startAt)));
      const scrollHour = Math.max(0, Math.floor(minMin / 60) - 1);
      timelineRef.current.scrollTop = scrollHour * HOUR_PX;
    } else {
      timelineRef.current.scrollTop = 8 * HOUR_PX;
    }
  }, [timedSchedules]);

  return (
    <div className="w-full">
      {/* 날짜 헤더 */}
      <div className="mb-4 pb-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{formatDateKorean(currentDate)}</h3>
        <p className="text-sm text-gray-500 mt-1">일정 {timedSchedules.length}개</p>
      </div>

      {/* 타임라인 세로 스크롤 */}
      <div
        ref={timelineRef}
        className="border border-gray-200 rounded-lg bg-white overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        <div className="flex" style={{ height: `${24 * HOUR_PX}px` }}>
          {/* 시간 레이블 컬럼 */}
          <div className="flex-shrink-0 w-14 border-r border-gray-200">
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="border-b border-gray-100 flex items-start px-1 pt-1"
                style={{ height: `${HOUR_PX}px` }}
              >
                <span className="text-xs text-gray-400 leading-none">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* 일정 영역 (필요 시 가로 스크롤) */}
          <div
            className="flex-1 relative"
            style={{ overflowX: needsHScroll ? 'auto' : 'hidden' }}
          >
            {/* 시간 구분선 */}
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-gray-100 pointer-events-none"
                style={{ top: `${hour * HOUR_PX}px`, height: `${HOUR_PX}px` }}
              />
            ))}

            {/* 일정 컨테이너 (5개 초과 시 최소 너비 확장) */}
            <div
              className="absolute inset-0"
              style={{
                minWidth: needsHScroll ? `${maxConcurrentCols * MIN_COL_WIDTH_PCT}%` : '100%',
              }}
            >
              {layoutItems.map(({ schedule, column, totalColumns, startMin, endMin }) => {
                const top = (startMin / 60) * HOUR_PX;
                const durationHeight = Math.max(((endMin - startMin) / 60) * HOUR_PX, 22);
                
                // Calculate height needed for text content
                const colWidthPct =
                  totalColumns > MAX_INLINE_COLS ? MIN_COL_WIDTH_PCT : 100 / totalColumns;
                // Estimate chars per line based on column width percentage
                const estimatedCharsPerLine = Math.max(10, Math.floor((colWidthPct / 100) * 60));
                const titleLines = Math.ceil(schedule.title.length / estimatedCharsPerLine);
                const descLines = schedule.description ? Math.ceil(schedule.description.length / estimatedCharsPerLine) : 0;
                const textHeight = 16 * titleLines + 16 + (descLines > 0 ? 14 * descLines + 4 : 0) + 8; // padding
                
                const height = Math.max(durationHeight, textHeight);
                const leftPct = column * colWidthPct;

                return (
                  <div
                    key={schedule.id}
                    className="absolute px-0.5"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${leftPct}%`,
                      width: `${colWidthPct}%`,
                    }}
                  >
                    <div
                      onClick={() => onScheduleClick?.(schedule)}
                      className="w-full h-full bg-primary-100 text-primary-800 text-xs px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary-200 transition-colors duration-150 break-words border-l-2 border-primary-400"
                      title={schedule.title}
                    >
                      <div className="font-semibold break-words leading-tight">{schedule.title}</div>
                      <div className="text-primary-600 text-[10px]">
                        {formatTime(new Date(schedule.startAt))} ~ {formatTime(new Date(schedule.endAt))}
                      </div>
                      {schedule.description && (
                        <div className="text-gray-600 text-[10px] break-words mt-0.5">
                          {schedule.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
