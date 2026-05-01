'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime, formatDateKorean } from '@/lib/utils/timezone';

export const HOUR_PX = 56;
const MIN_COL_WIDTH_PCT = 20; // 5개 초과 시 컬럼당 최소 너비(%)
const MAX_INLINE_COLS = 5;    // 이 수를 초과하면 가로 스크롤 적용

// 텍스트 높이 추정 상수 (한글 기준)
const TITLE_CHAR_W = 12;  // text-xs 한글 문자 평균 px 너비
const DESC_CHAR_W  = 10;  // text-[10px] 한글 문자 평균 px 너비
const TITLE_LINE_H = 16;
const DESC_LINE_H  = 13;
const TIME_LINE_H  = 14;
const BAR_PADDING  = 6;
const GAP_PX       = 2;

function estimateTextHeight(schedule: Schedule, barWidthPx: number): number {
  const inner = Math.max(1, barWidthPx - 12);
  const titleCPL = Math.max(1, Math.floor(inner / TITLE_CHAR_W));
  const titleLines = Math.max(1, Math.ceil(schedule.title.length / titleCPL));
  let h = titleLines * TITLE_LINE_H + TIME_LINE_H + BAR_PADDING;
  if (schedule.description) {
    const descCPL = Math.max(1, Math.floor(inner / DESC_CHAR_W));
    const descLines = Math.max(1, Math.ceil(schedule.description.length / descCPL));
    h += descLines * DESC_LINE_H + 4;
  }
  return h;
}

// 색상별 Tailwind 클래스 매핑
const COLOR_CLASSES: Record<NonNullable<Schedule['color']>, { bg: string; text: string; border: string; hover: string; textLight: string }> = {
  indigo: { bg: 'bg-indigo-100 dark:bg-[#6366F1]', text: 'text-indigo-800 dark:text-white', border: 'border-indigo-400 dark:border-[#6366F1]', hover: 'hover:bg-indigo-200 dark:hover:brightness-110', textLight: 'text-indigo-600 dark:text-white/80' },
  blue: { bg: 'bg-blue-100 dark:bg-[#6366F1]', text: 'text-blue-800 dark:text-white', border: 'border-blue-400 dark:border-[#6366F1]', hover: 'hover:bg-blue-200 dark:hover:brightness-110', textLight: 'text-blue-600 dark:text-white/80' },
  emerald: { bg: 'bg-emerald-100 dark:bg-[#10B981]', text: 'text-emerald-800 dark:text-white', border: 'border-emerald-400 dark:border-[#10B981]', hover: 'hover:bg-emerald-200 dark:hover:brightness-110', textLight: 'text-emerald-600 dark:text-white/80' },
  amber: { bg: 'bg-amber-100 dark:bg-[#FFB800]', text: 'text-amber-800 dark:text-gray-900', border: 'border-amber-400 dark:border-[#FFB800]', hover: 'hover:bg-amber-200 dark:hover:brightness-110', textLight: 'text-amber-600 dark:text-gray-900/70' },
  rose: { bg: 'bg-rose-100 dark:bg-[#EF4444]', text: 'text-rose-800 dark:text-white', border: 'border-rose-400 dark:border-[#EF4444]', hover: 'hover:bg-rose-200 dark:hover:brightness-110', textLight: 'text-rose-600 dark:text-white/80' },
};

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
 * 너비 규칙 (실제로 겹치는 일정 수 기준)
 *   겹치지 않는 일정 → 각각 100% 너비 (column=0)
 *   겹치는 일정 N개 → 각각 100/N % 너비
 *   totalColumns > 5 → 컬럼당 20% (가로 스크롤)
 *
 * 컬럼 배정: 시작 시각 오름차순 정렬 후, 겹치지 않는 첫 번째 빈 컬럼에 배정
 */
export function computeLayout(schedules: Schedule[]): LayoutItem[] {
  if (schedules.length === 0) return [];

  const sorted = [...schedules].sort((a, b) => {
    const diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    if (diff !== 0) return diff;
    // 같은 시작 시각 → 긴 일정 먼저
    return new Date(b.endAt).getTime() - new Date(a.endAt).getTime();
  });

  const items: LayoutItem[] = sorted.map(schedule => {
    const startMin = getKSTMinutes(schedule.startAt);
    const rawEnd = getKSTMinutes(schedule.endAt);
    const endMin = Math.max(rawEnd, startMin + 15); // 최소 15분 높이 보장
    return { schedule, column: 0, totalColumns: 1, startMin, endMin };
  });

  // 그리디 컬럼 배정: columnEnds[c] = 컬럼 c에 마지막으로 배정된 일정의 endMin
  const columnEnds: number[] = [];
  for (const item of items) {
    const freeCol = columnEnds.findIndex(end => end <= item.startMin);
    if (freeCol !== -1) {
      item.column = freeCol;
      columnEnds[freeCol] = item.endMin;
    } else {
      item.column = columnEnds.length;
      columnEnds.push(item.endMin);
    }
  }

  // 각 일정의 totalColumns = 자신과 겹치는 일정 중 가장 큰 column 인덱스 + 1
  for (let i = 0; i < items.length; i++) {
    let maxCol = items[i].column;
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const a = items[i];
      const b = items[j];
      if (b.startMin < a.endMin && b.endMin > a.startMin) {
        maxCol = Math.max(maxCol, b.column);
      }
    }
    items[i].totalColumns = maxCol + 1;
  }

  return items;
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

  // 이벤트 영역 너비 측정 (ResizeObserver)
  const [eventAreaWidth, setEventAreaWidth] = useState(600);
  const eventAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!eventAreaRef.current) return;
    const ro = new ResizeObserver(entries => {
      setEventAreaWidth(entries[0].contentRect.width);
    });
    ro.observe(eventAreaRef.current);
    return () => ro.disconnect();
  }, []);

  // 동적 행 높이 계산 (2-pass)
  const { rowHeights, rowTops, totalHeight } = useMemo(() => {
    const heights = Array<number>(24).fill(HOUR_PX);

    // Pass 1: 1시간짜리 이벤트
    for (const { schedule, totalColumns, startMin, endMin } of layoutItems) {
      const startH = Math.floor(startMin / 60);
      const endH   = Math.ceil(endMin / 60);
      if (endH - startH === 1) {
        const colWPct = totalColumns > MAX_INLINE_COLS ? MIN_COL_WIDTH_PCT : 100 / totalColumns;
        const barW    = eventAreaWidth * colWPct / 100;
        heights[startH] = Math.max(heights[startH], estimateTextHeight(schedule, barW));
      }
    }

    // Pass 2: 여러 시간대에 걸친 이벤트
    for (const { schedule, totalColumns, startMin, endMin } of layoutItems) {
      const startH = Math.floor(startMin / 60);
      const endH   = Math.min(23, Math.ceil(endMin / 60) - 1);
      if (endH <= startH) continue;
      let available = 0;
      for (let h = startH; h <= endH; h++) available += heights[h];
      const colWPct = totalColumns > MAX_INLINE_COLS ? MIN_COL_WIDTH_PCT : 100 / totalColumns;
      const barW    = eventAreaWidth * colWPct / 100;
      const textH   = estimateTextHeight(schedule, barW);
      if (textH > available) heights[endH] += textH - available;
    }

    const tops: number[] = [];
    let acc = 0;
    for (let h = 0; h < 24; h++) { tops.push(acc); acc += heights[h]; }
    return { rowHeights: heights, rowTops: tops, totalHeight: acc };
  }, [layoutItems, eventAreaWidth]);

  // KST 분 → 픽셀 위치
  const minToPixels = (min: number): number => {
    const h = Math.min(23, Math.floor(min / 60));
    const m = min % 60;
    return rowTops[h] + (m / 60) * rowHeights[h];
  };

  // 자동 스크롤: 가장 이른 일정 1시간 전, 없으면 08:00
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!timelineRef.current) return;
    if (timedSchedules.length > 0) {
      const minMin = Math.min(...timedSchedules.map(s => getKSTMinutes(s.startAt)));
      const scrollHour = Math.max(0, Math.floor(minMin / 60) - 1);
      timelineRef.current.scrollTop = rowTops[scrollHour];
    } else {
      timelineRef.current.scrollTop = rowTops[8];
    }
  }, [timedSchedules, rowTops]);

  return (
    <div className="w-full">
      {/* 날짜 헤더 */}
      <div className="mb-4 pb-3 border-b border-gray-200 dark:border-dark-border">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">{formatDateKorean(currentDate)}</h3>
        <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">일정 {timedSchedules.length}개</p>
      </div>

      {/* 타임라인 세로 스크롤 */}
      <div
        ref={timelineRef}
        className="border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        <div className="flex" style={{ height: `${totalHeight}px` }}>
          {/* 시간 레이블 컬럼 */}
          <div className="flex-shrink-0 w-14 border-r border-gray-200 dark:border-dark-border relative">
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-gray-100 dark:border-dark-border flex items-start px-1 pt-1"
                style={{ top: `${rowTops[hour]}px`, height: `${rowHeights[hour]}px` }}
              >
                <span className="text-xs text-gray-400 dark:text-dark-text-disabled leading-none">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* 일정 영역 (필요 시 가로 스크롤) */}
          <div
            ref={eventAreaRef}
            className="flex-1 relative"
            style={{ overflowX: needsHScroll ? 'auto' : 'hidden' }}
          >
            {/* 시간 구분선 */}
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-gray-100 dark:border-dark-border pointer-events-none"
                style={{ top: `${rowTops[hour]}px`, height: `${rowHeights[hour]}px` }}
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
                const colWidthPct = totalColumns > MAX_INLINE_COLS ? MIN_COL_WIDTH_PCT : 100 / totalColumns;
                const leftPct    = column * colWidthPct;
                const top        = minToPixels(startMin) + GAP_PX;
                const durationH  = Math.max(minToPixels(Math.min(endMin, 24 * 60)) - top - GAP_PX, 22);
                const barW       = eventAreaWidth * colWidthPct / 100;
                const textH      = estimateTextHeight(schedule, barW);
                const height     = Math.max(durationH, textH, 22);

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
                      className={`w-full h-full overflow-hidden ${COLOR_CLASSES[schedule.color ?? 'indigo'].bg} ${COLOR_CLASSES[schedule.color ?? 'indigo'].text} text-[11px] md:text-xs px-1.5 py-0.5 rounded cursor-pointer ${COLOR_CLASSES[schedule.color ?? 'indigo'].hover} transition-colors duration-150 break-words border-l-2 ${COLOR_CLASSES[schedule.color ?? 'indigo'].border}`}
                      title={schedule.title}
                    >
                      <div className="font-semibold break-words leading-tight">{schedule.title}</div>
                      <div className={`${COLOR_CLASSES[schedule.color ?? 'indigo'].textLight} text-[10px]`}>
                        {formatTime(new Date(schedule.startAt))} ~ {formatTime(new Date(schedule.endAt))}
                      </div>
                      {schedule.description && (
                        <div className={`${COLOR_CLASSES[schedule.color ?? 'indigo'].textLight} text-[10px] break-words mt-0.5`}>
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
