'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime } from '@/lib/utils/timezone';
import { ScheduleTooltip } from './ScheduleTooltip';
import { PostItCard } from './PostItCard';
import type { PostIt } from '@/types/postit';

interface CalendarMonthViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
  onScheduleClick?: (schedule: Schedule) => void;
  // 포스트잇
  postits?: PostIt[];
  currentUserId?: string;
  onPostitDelete?: (id: string, date: string) => void;
  onPostitContentChange?: (id: string, content: string) => void;
}

const COLOR_CLASSES: Record<NonNullable<Schedule['color']>, { bg: string; text: string }> = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-800' },
};

const AVG_CHAR_WIDTH_PX = 13;
const BAR_LINE_HEIGHT_PX = 16;
const BAR_PADDING_V_PX = 4;
const MIN_BAR_HEIGHT = 20;
const SCHEDULE_ROW_GAP = 2;
const SCHEDULE_TOP_OFFSET = 32;
const BASE_CELL_MIN_HEIGHT = 64;

export function CalendarMonthView({
  currentDate,
  schedules = [],
  selectedDate,
  onDateClick,
  onScheduleClick,
  postits = [],
  currentUserId = '',
  onPostitDelete,
  onPostitContentChange,
}: CalendarMonthViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{ schedule: Schedule; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth();

  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));

  const startDate = new Date(firstDay);
  startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay());

  const weeks: Date[][] = [];
  const cur = new Date(startDate);
  for (let week = 0; week < 6; week++) {
    const days: Date[] = [];
    for (let day = 0; day < 7; day++) {
      days.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(days);
    if (cur > lastDay) break;
  }

  const isToday = (date: Date): boolean => {
    const kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    return date.getUTCFullYear() === kstNow.getUTCFullYear() &&
      date.getUTCMonth() === kstNow.getUTCMonth() &&
      date.getUTCDate() === kstNow.getUTCDate();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return date.getUTCFullYear() === selectedDate.getUTCFullYear() &&
      date.getUTCMonth() === selectedDate.getUTCMonth() &&
      date.getUTCDate() === selectedDate.getUTCDate();
  };

  const isCurrentMonth = (date: Date): boolean => date.getUTCMonth() === month;

  const scheduleToDay = (utcDate: Date): Date => {
    const kst = utcToKST(utcDate);
    return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  };

  const isSameDaySchedule = (schedule: Schedule): boolean => {
    const s = scheduleToDay(new Date(schedule.startAt));
    const e = scheduleToDay(new Date(schedule.endAt));
    return s.getTime() === e.getTime();
  };

  const formatDateRange = (schedule: Schedule): string => {
    const s = utcToKST(new Date(schedule.startAt));
    const e = utcToKST(new Date(schedule.endAt));
    const sm = s.getUTCMonth() + 1, sd = s.getUTCDate();
    const em = e.getUTCMonth() + 1, ed = e.getUTCDate();
    return sm === em
      ? `(${sd}일~${ed}일)`
      : `(${sm}월${sd}일~${em}월${ed}일)`;
  };

  const getBarHeight = (text: string, spanCols: number): number => {
    if (containerWidth <= 0) return MIN_BAR_HEIGHT;
    const barWidthPx = (spanCols / 7) * containerWidth - 16;
    const charsPerLine = Math.max(1, Math.floor(barWidthPx / AVG_CHAR_WIDTH_PX));
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    return Math.max(MIN_BAR_HEIGHT, lines * BAR_LINE_HEIGHT_PX + BAR_PADDING_V_PX);
  };

  const getMultiDaySchedulesForWeek = (weekDays: Date[]): {
    schedule: Schedule;
    row: number;
    colStart: number;
    colEnd: number;
  }[] => {
    const kstWeekStart = new Date(weekDays[0]);
    kstWeekStart.setUTCHours(0, 0, 0, 0);
    const kstWeekEnd = new Date(weekDays[6]);
    kstWeekEnd.setUTCHours(23, 59, 59, 999);

    const multiDay = schedules.filter(s => {
      if (isSameDaySchedule(s)) return false;
      const sStart = scheduleToDay(new Date(s.startAt));
      const sEnd = scheduleToDay(new Date(s.endAt));
      return sStart <= kstWeekEnd && sEnd >= kstWeekStart;
    });

    multiDay.sort((a, b) => {
      const aStart = scheduleToDay(new Date(a.startAt)).getTime();
      const bStart = scheduleToDay(new Date(b.startAt)).getTime();
      const aEnd = scheduleToDay(new Date(a.endAt)).getTime();
      const bEnd = scheduleToDay(new Date(b.endAt)).getTime();
      if (aStart !== bStart) return aStart - bStart;
      return (bEnd - bStart) - (aEnd - aStart);
    });

    const rows: { end: Date }[] = [];
    const result: { schedule: Schedule; row: number; colStart: number; colEnd: number }[] = [];

    for (const schedule of multiDay) {
      const sStart = scheduleToDay(new Date(schedule.startAt));
      const sEnd = scheduleToDay(new Date(schedule.endAt));
      const clampedStart = sStart < kstWeekStart ? kstWeekStart : sStart;
      const clampedEnd = sEnd > kstWeekEnd ? kstWeekEnd : sEnd;

      let assignedRow = -1;
      for (let r = 0; r < rows.length; r++) {
        if (rows[r].end < clampedStart) {
          assignedRow = r;
          rows[r].end = clampedEnd;
          break;
        }
      }
      if (assignedRow === -1) {
        assignedRow = rows.length;
        rows.push({ end: clampedEnd });
      }

      const dayIndexStart = Math.max(0, Math.round(
        (clampedStart.getTime() - kstWeekStart.getTime()) / (1000 * 60 * 60 * 24)
      ));
      const dayIndexEnd = Math.min(6, Math.round(
        (clampedEnd.getTime() - kstWeekStart.getTime()) / (1000 * 60 * 60 * 24)
      ));
      result.push({
        schedule,
        row: assignedRow,
        colStart: dayIndexStart + 1,
        colEnd: Math.min(7, dayIndexEnd + 1),
      });
    }

    return result;
  };

  const getSameDaySchedulesForDay = (date: Date): Schedule[] =>
    schedules
      .filter(s => isSameDaySchedule(s) && scheduleToDay(new Date(s.startAt)).getTime() === date.getTime())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  /** 날짜 키 (YYYY-MM-DD) → 포스트잇 배열 */
  const getPostitsByDateKey = (date: Date): PostIt[] => {
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    return postits.filter(p => p.date === key);
  };

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div ref={containerRef} className="w-full">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-1 ${
              index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className="flex flex-col gap-1.5">
        {weeks.map((week, weekIndex) => {
          const multiDayRows = getMultiDaySchedulesForWeek(week);
          const multiDayBarHeights = multiDayRows.map(({ schedule, colStart, colEnd }) => {
            const dateRange = formatDateRange(schedule);
            return getBarHeight(`${schedule.title} ${dateRange}`, colEnd - colStart + 1);
          });

          const rowMaxHeights: number[] = [];
          multiDayRows.forEach(({ row }, idx) => {
            rowMaxHeights[row] = Math.max(rowMaxHeights[row] ?? 0, multiDayBarHeights[idx]);
          });

          const rowTopOffsets: number[] = [];
          let cumulative = SCHEDULE_TOP_OFFSET;
          for (let r = 0; r < rowMaxHeights.length; r++) {
            rowTopOffsets[r] = cumulative;
            cumulative += (rowMaxHeights[r] ?? MIN_BAR_HEIGHT) + SCHEDULE_ROW_GAP;
          }

          const perDayMultiDayBottom = week.map((_, dayIndex) => {
            const col = dayIndex + 1;
            const barsOnDay = multiDayRows.filter(r => r.colStart <= col && r.colEnd >= col);
            if (barsOnDay.length === 0) return SCHEDULE_TOP_OFFSET;
            const maxRow = Math.max(...barsOnDay.map(r => r.row));
            return (rowTopOffsets[maxRow] ?? SCHEDULE_TOP_OFFSET) +
              (rowMaxHeights[maxRow] ?? MIN_BAR_HEIGHT) +
              SCHEDULE_ROW_GAP;
          });

          const cellMinHeight = `${Math.max(
            BASE_CELL_MIN_HEIGHT,
            ...perDayMultiDayBottom.map(b => b + 8),
          )}px`;

          return (
            <div key={weekIndex} className="relative">
              {/* 날짜 셀 그리드 */}
              <div
                className="grid grid-cols-7 gap-1.5"
                style={{ gridTemplateRows: `minmax(${cellMinHeight}, auto)` }}
              >
                {week.map((date, dayIndex) => {
                  const sameDaySchedules = getSameDaySchedulesForDay(date);
                  const dayPostits = getPostitsByDateKey(date);
                  const spacerHeight = perDayMultiDayBottom[dayIndex] - SCHEDULE_TOP_OFFSET;

                  return (
                    <div
                      key={date.toISOString()}
                      role="button"
                      tabIndex={0}
                      onClick={() => onDateClick?.(date)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onDateClick?.(date); }}
                      className={`
                        relative p-2 rounded-lg border transition-all duration-150 flex flex-col cursor-pointer
                        ${isToday(date)
                          ? 'border-orange-500 ring-1 ring-orange-400'
                          : isSelected(date)
                            ? 'bg-white border-primary-500 ring-2 ring-primary-500'
                            : !isCurrentMonth(date)
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-white border-gray-200'
                        }
                        hover:border-gray-300 hover:shadow-sm
                      `}
                    >
                      {/* 날짜 숫자 */}
                      <div className={`
                        text-sm font-medium mb-1 flex-shrink-0
                        ${!isCurrentMonth(date)
                          ? 'text-gray-400'
                          : dayIndex === 0
                            ? 'text-error-500'
                            : dayIndex === 6
                              ? 'text-primary-500'
                              : 'text-gray-700'
                        }
                      `}>
                        {date.getUTCDate()}
                      </div>

                      {/* 멀티데이 오버레이 점유 영역 스페이서 */}
                      {spacerHeight > 0 && (
                        <div style={{ height: `${spacerHeight}px` }} className="flex-shrink-0" />
                      )}

                      {/* 당일 일정 */}
                      {sameDaySchedules.map(schedule => (
                        <div
                          key={schedule.id}
                          className={`text-xs px-1 py-0.5 break-words overflow-hidden rounded mb-0.5 cursor-pointer hover:opacity-75 transition-opacity flex-shrink-0 ${COLOR_CLASSES[schedule.color ?? 'indigo'].bg} ${COLOR_CLASSES[schedule.color ?? 'indigo'].text}`}
                          onClick={e => { e.stopPropagation(); onScheduleClick?.(schedule); }}
                          onMouseEnter={e => setTooltip({ schedule, x: e.clientX, y: e.clientY })}
                          onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {formatTime(new Date(schedule.startAt))} {schedule.title}
                        </div>
                      ))}

                      {/* 포스트잇 카드 */}
                      {dayPostits.map(postit => (
                        <PostItCard
                          key={postit.id}
                          postit={postit}
                          currentUserId={currentUserId}
                          onDelete={(id, date) => onPostitDelete?.(id, date)}
                          onContentChange={(id, content) => onPostitContentChange?.(id, content)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* 멀티데이 일정 오버레이 */}
              {multiDayRows.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {multiDayRows.map(({ schedule, row, colStart, colEnd }, idx) => {
                    const span = colEnd - colStart + 1;
                    const leftPct = `${(colStart - 1) * (100 / 7)}%`;
                    const widthPct = `${span * (100 / 7)}%`;
                    const barH = multiDayBarHeights[idx];
                    const topPx = rowTopOffsets[row] ?? SCHEDULE_TOP_OFFSET;
                    const dateRange = formatDateRange(schedule);
                    const displayText = `${schedule.title} ${dateRange}`;

                    return (
                      <div
                        key={`multi-${schedule.id}-${weekIndex}`}
                        className="absolute px-0.5"
                        style={{ left: leftPct, width: widthPct, top: `${topPx}px`, height: `${barH}px`, pointerEvents: 'auto' }}
                      >
                        <div
                          className={`text-xs px-1 py-0.5 break-words overflow-hidden cursor-pointer hover:opacity-75 transition-opacity rounded h-full text-center ${COLOR_CLASSES[schedule.color ?? 'indigo'].bg} ${COLOR_CLASSES[schedule.color ?? 'indigo'].text}`}
                          onClick={e => { e.stopPropagation(); onScheduleClick?.(schedule); }}
                          onMouseEnter={e => setTooltip({ schedule, x: e.clientX, y: e.clientY })}
                          onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {displayText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {tooltip && <ScheduleTooltip schedule={tooltip.schedule} x={tooltip.x} y={tooltip.y} />}
    </div>
  );
}
