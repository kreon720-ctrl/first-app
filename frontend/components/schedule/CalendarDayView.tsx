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
 * 일정 목록을 받아 각 일정의 column, totalColumns, top/height 계산에 필요한
 * startMin/endMin 을 반환합니다.
 *
 * 알고리즘
 * 1. 시작 시각 오름차순 정렬 (같으면 긴 일정 우선)
 * 2. 그리디 컬럼 배정: 현재 일정의 startMin ≥ 컬럼의 endMin 이면 해당 컬럼 재사용
 * 3. totalColumns: 해당 일정과 시간이 겹치는 모든 일정의 최대 column + 1
 */
export function computeLayout(schedules: Schedule[]): LayoutItem[] {
  if (schedules.length === 0) return [];

  const sorted = [...schedules].sort((a, b) => {
    const diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    if (diff !== 0) return diff;
    // 같은 시작 → 긴 일정 먼저
    return new Date(b.endAt).getTime() - new Date(a.endAt).getTime();
  });

  interface Assigned {
    schedule: Schedule;
    column: number;
    startMin: number;
    endMin: number;
  }

  const columnEnds: number[] = [];
  const assigned: Assigned[] = [];

  for (const schedule of sorted) {
    const startMin = getKSTMinutes(schedule.startAt);
    const rawEnd = getKSTMinutes(schedule.endAt);
    const endMin = Math.max(rawEnd, startMin + 15); // 최소 15분 높이 보장

    // 빈 컬럼(endMin <= startMin) 중 가장 인덱스가 낮은 것 선택
    let col = columnEnds.findIndex(end => end <= startMin);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(endMin);
    } else {
      columnEnds[col] = endMin;
    }

    assigned.push({ schedule, column: col, startMin, endMin });
  }

  // totalColumns 계산: 겹치는 그룹 내 최대 column + 1
  return assigned.map(item => {
    const overlapping = assigned.filter(
      other => other.startMin < item.endMin && other.endMin > item.startMin
    );
    const maxCol = Math.max(...overlapping.map(o => o.column));
    return { ...item, totalColumns: maxCol + 1 };
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
                const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 22);
                const colWidthPct =
                  totalColumns > MAX_INLINE_COLS ? MIN_COL_WIDTH_PCT : 100 / totalColumns;
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
                      className="w-full h-full bg-primary-100 text-primary-800 text-xs px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary-200 transition-colors duration-150 overflow-hidden border-l-2 border-primary-400"
                      title={schedule.title}
                    >
                      <div className="font-semibold truncate leading-tight">{schedule.title}</div>
                      <div className="text-primary-600 text-[10px]">
                        {formatTime(new Date(schedule.startAt))} ~ {formatTime(new Date(schedule.endAt))}
                      </div>
                      {schedule.description && height >= 56 && (
                        <div className="text-gray-600 text-[10px] line-clamp-1 mt-0.5">
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
