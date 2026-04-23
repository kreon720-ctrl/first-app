'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Schedule } from '@/types/schedule';
import { utcToKST, formatTime } from '@/lib/utils/timezone';
import { getKSTMinutes, HOUR_PX, computeLayout } from './CalendarDayView';
import { ScheduleTooltip } from './ScheduleTooltip';

const GAP_PX = 2;

interface CalendarWeekViewProps {
  currentDate: Date;
  schedules?: Schedule[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
  onScheduleClick?: (schedule: Schedule) => void;
}

// 색상별 Tailwind 클래스 매핑
const COLOR_CLASSES: Record<NonNullable<Schedule['color']>, { bg: string; text: string; hover: string; bgDarker: string }> = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-200', bgDarker: 'bg-indigo-200' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200', bgDarker: 'bg-blue-200' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', hover: 'hover:bg-emerald-200', bgDarker: 'bg-emerald-200' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-200', bgDarker: 'bg-amber-200' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-800', hover: 'hover:bg-rose-200', bgDarker: 'bg-rose-200' },
};

export function CalendarWeekView({ currentDate, schedules = [], selectedDate, onDateClick, onScheduleClick }: CalendarWeekViewProps) {

  // ─── 주간 날짜 배열 ──────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setUTCDate(currentDate.getUTCDate() - start.getUTCDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getTime());
      d.setUTCDate(start.getUTCDate() + i);
      return d;
    });
  }, [currentDate]);

  // ─── 날짜 비교 헬퍼 ─────────────────────────────────────────────────────────
  const isToday = (date: Date): boolean => {
    const kstNow = new Date(Date.now() + 9 * 3600_000);
    return date.getUTCFullYear() === kstNow.getUTCFullYear() &&
           date.getUTCMonth()    === kstNow.getUTCMonth() &&
           date.getUTCDate()     === kstNow.getUTCDate();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return date.getUTCFullYear() === selectedDate.getUTCFullYear() &&
           date.getUTCMonth()    === selectedDate.getUTCMonth() &&
           date.getUTCDate()     === selectedDate.getUTCDate();
  };

  const toDay = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

  const scheduleToDay = (utcDate: Date): Date => {
    const kst = utcToKST(utcDate);
    return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  };

  const getSchedulesForDate = (date: Date): Schedule[] => {
    const target = toDay(date);
    return schedules.filter(s => {
      const startDay = scheduleToDay(new Date(s.startAt));
      const endDay   = scheduleToDay(new Date(s.endAt));
      return target >= startDay && target <= endDay;
    });
  };

  const isMultiDay = (schedule: Schedule): boolean => {
    const startDay = scheduleToDay(new Date(schedule.startAt));
    const endDay   = scheduleToDay(new Date(schedule.endAt));
    return startDay.getTime() !== endDay.getTime();
  };

  const [tooltip, setTooltip] = useState<{ schedule: Schedule; x: number; y: number } | null>(null);

  // ─── 자동 스크롤 ────────────────────────────────────────────────────────────
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!timelineRef.current) return;
    const single = schedules.filter(s => !isMultiDay(s));
    if (single.length > 0) {
      const minHour = Math.min(...single.map(s => Math.floor(getKSTMinutes(s.startAt) / 60)));
      timelineRef.current.scrollTop = Math.max(0, minHour - 1) * HOUR_PX;
    } else {
      timelineRef.current.scrollTop = 8 * HOUR_PX;
    }
  }, [schedules]);

  // ─── 요일별 레이아웃 아이템 ─────────────────────────────────────────────────
  const layoutByDay = useMemo(
    () => weekDays.map(date =>
      computeLayout(getSchedulesForDate(date).filter(s => !isMultiDay(s)))
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekDays, schedules]
  );

  // ─── 상수 ────────────────────────────────────────────────────────────────────
  const weekdays   = ['일', '월', '화', '수', '목', '금', '토'];
  const TIME_COL_W = 'w-14';

  return (
    <div className="w-full">
      {/* ── 종일/다일 이벤트 섹션 ─────────────────────────────────────────────── */}
      {(() => {
        const allDaySchedules = schedules
          .filter(isMultiDay)
          .sort((a, b) => {
            const aStart = scheduleToDay(new Date(a.startAt)).getTime();
            const bStart = scheduleToDay(new Date(b.startAt)).getTime();
            if (aStart !== bStart) return aStart - bStart;
            return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
          });
        if (allDaySchedules.length === 0) return null;

        const weekStart = toDay(weekDays[0]);
        const getDayIndex = (date: Date): number => {
          const day  = toDay(date);
          const diff = Math.round((day.getTime() - weekStart.getTime()) / 86_400_000);
          return Math.max(0, Math.min(6, diff));
        };

        return (
          <div className="border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-base mb-2 overflow-hidden">
            <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b border-gray-200 dark:border-dark-border">
              <div className={`${TIME_COL_W} p-2 text-xs text-gray-400 dark:text-dark-text-disabled text-right`}>종일</div>
              {weekDays.map(date => (
                <div key={date.toISOString()} className="border-l border-gray-200 dark:border-dark-border min-h-[28px]" />
              ))}
            </div>
            {allDaySchedules.map(schedule => {
              const startDay  = scheduleToDay(new Date(schedule.startAt));
              const endDay    = scheduleToDay(new Date(schedule.endAt));
              const startIdx  = getDayIndex(new Date(Math.max(startDay.getTime(), weekStart.getTime())));
              const endIdx    = getDayIndex(new Date(Math.min(endDay.getTime(), weekDays[6].getTime())));
              const colStart  = startIdx + 2;
              const colEnd    = endIdx + 3;
              return (
                <div key={schedule.id} className="grid grid-cols-[auto_repeat(7,1fr)] border-b border-gray-100 dark:border-dark-border last:border-b-0">
                  <div className={TIME_COL_W} />
                  <div className="px-1 py-0.5" style={{ gridColumn: `${colStart} / ${colEnd}` }}>
                    <div
                      onClick={() => onScheduleClick?.(schedule)}
                      className={`text-xs ${COLOR_CLASSES[schedule.color ?? 'indigo'].bgDarker} ${COLOR_CLASSES[schedule.color ?? 'indigo'].text} px-1 py-0.5 rounded truncate cursor-pointer ${COLOR_CLASSES[schedule.color ?? 'indigo'].hover} transition-colors`}
                      title={schedule.title}
                    >
                      {schedule.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── 시간별 타임라인 (요일 헤더 sticky 포함) ───────────────────────────── */}
      <div
        ref={timelineRef}
        className="border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 240px)' }}
      >
        {/* 요일 헤더 — 스크롤 컨테이너와 동일한 너비로 sticky */}
        <div className="sticky top-0 z-10 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border flex" style={{ paddingTop: 3, paddingBottom: 3, paddingRight: 3 }}>
          <div className={`${TIME_COL_W} flex-shrink-0`} />
          {weekDays.map((date, index) => {
            const today = isToday(date);
            const sel   = isSelected(date);
            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => onDateClick?.(date)}
                className={`
                  flex-1 flex flex-col items-center py-1.5 px-1 transition-all duration-150
                  ${today ? 'ring-2 ring-orange-500 rounded-lg' : ''}
                  ${sel && !today ? 'ring-2 ring-primary-500 rounded-lg' : ''}
                  hover:bg-gray-50
                `}
              >
                <span className={`text-xs font-medium mb-1 ${index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-600 dark:text-dark-text-muted'}`}>
                  {weekdays[index]}
                </span>
                <span className={`text-lg font-semibold ${index === 0 ? 'text-error-500' : index === 6 ? 'text-primary-500' : 'text-gray-800 dark:text-dark-text'}`}>
                  {date.getUTCDate()}
                </span>
              </button>
            );
          })}
        </div>

        {/* 24시간 그리드 + 이벤트 오버레이 */}
        <div className="relative" style={{ height: `${24 * HOUR_PX}px` }}>

          {/* 그리드 레이어: 시간 레이블 + 구분선 + 오늘 배경 */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex border-b border-gray-100 dark:border-dark-border pointer-events-none"
              style={{ top: `${hour * HOUR_PX}px`, height: `${HOUR_PX}px` }}
            >
              <div className={`${TIME_COL_W} flex-shrink-0 border-r border-gray-200 dark:border-dark-border px-1 pt-1 text-xs text-gray-400 dark:text-dark-text-disabled`}>
                {String(hour).padStart(2, '0')}:00
              </div>
              {weekDays.map(date => (
                <div
                  key={date.toISOString()}
                  className={`flex-1 border-l border-gray-100 dark:border-dark-border ${isToday(date) ? 'bg-primary-50/30' : ''}`}
                />
              ))}
            </div>
          ))}

          {/* 이벤트 오버레이: 요일별 컬럼, 절대 위치 이벤트 바 */}
          <div className="absolute inset-0 flex overflow-visible">
            <div className={`${TIME_COL_W} flex-shrink-0`} />
            {weekDays.map((date, dayIdx) => {
              const items = layoutByDay[dayIdx];
              return (
                <div key={date.toISOString()} className="flex-1 relative overflow-visible">
                  {items.map(({ schedule, column, totalColumns, startMin, endMin }) => {
                    const top       = (startMin / 60) * HOUR_PX + GAP_PX;
                    const durationH = Math.max(((endMin - startMin) / 60) * HOUR_PX - GAP_PX, 22);
                    const colWPct   = 100 / totalColumns;
                    const leftPct   = column * colWPct;
                    const start = new Date(schedule.startAt);
                    const end   = new Date(schedule.endAt);

                    return (
                      <div
                        key={schedule.id}
                        className="absolute px-0.5"
                        style={{ top: `${top}px`, height: `${durationH}px`, left: `${leftPct}%`, width: `${colWPct}%` }}
                      >
                        <div
                          onClick={() => onScheduleClick?.(schedule)}
                          onMouseEnter={e => setTooltip({ schedule, x: e.clientX, y: e.clientY })}
                          onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                          onMouseLeave={() => setTooltip(null)}
                          className={`w-full h-full overflow-hidden ${COLOR_CLASSES[schedule.color ?? 'indigo'].bg} ${COLOR_CLASSES[schedule.color ?? 'indigo'].text} px-1.5 py-0.5 rounded cursor-pointer ${COLOR_CLASSES[schedule.color ?? 'indigo'].hover} transition-colors duration-150`}
                        >
                          <div className="font-medium text-xs break-words leading-tight">{schedule.title}</div>
                          <div className="opacity-75 text-[10px] truncate">
                            {formatTime(start)} ~ {formatTime(end)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {tooltip && <ScheduleTooltip schedule={tooltip.schedule} x={tooltip.x} y={tooltip.y} />}
    </div>
  );
}
