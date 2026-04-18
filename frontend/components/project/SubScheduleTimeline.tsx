'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { SubSchedule } from '@/types/project';
import { SubBar } from './SubBar';

// ── 타임라인 상수 ──
const MIN_DAY_W = 24;
const ROW_PAD = 5;
const PROGRESS_H = 20;
const BAR_MIN_H = Math.round(PROGRESS_H * 1.3);

// ── Static border classes ──
const BORDER_RIGHT: Record<'month' | 'week' | 'day' | 'last', string> = {
  month: 'border-r-2 border-r-gray-400',
  week:  'border-r border-r-gray-300',
  day:   'border-r border-r-gray-100',
  last:  'border-r border-r-gray-200',
};
const LINE_W:  Record<'month' | 'week' | 'day' | 'last', number> = { month: 2, week: 1, day: 1, last: 1 };
const LINE_BG: Record<'month' | 'week' | 'day' | 'last', string> = {
  month: '#9ca3af', week: '#d1d5db', day: '#f3f4f6', last: '#e5e7eb',
};

type BorderKey = 'month' | 'week' | 'day' | 'last';

interface DayInfo {
  d: Date;
  isMonthStart: boolean;
  isWeekStart: boolean;
  weekNum: number;
  borderKey: BorderKey;
}

function buildDayInfos(startDate: string, endDate: string): DayInfo[] {
  const days: Date[] = [];
  const cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate   + 'T00:00:00');
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }

  return days.map((d, i) => {
    const prev = i > 0 ? days[i - 1] : null;
    const next = i < days.length - 1 ? days[i + 1] : null;
    const weekNum = Math.ceil(d.getDate() / 7);
    const isMonthStart = !prev || d.getMonth() !== prev.getMonth();
    const isWeekStart  = isMonthStart || (!!prev && Math.ceil(prev.getDate() / 7) !== weekNum);
    let borderKey: BorderKey = 'day';
    if (!next)                                         borderKey = 'last';
    else if (next.getMonth() !== d.getMonth())         borderKey = 'month';
    else if (Math.ceil(next.getDate() / 7) !== weekNum) borderKey = 'week';
    return { d, isMonthStart, isWeekStart, weekNum, borderKey };
  });
}

interface SubScheduleTimelineProps {
  scheduleStartDate: string;
  scheduleEndDate: string;
  subSchedules: SubSchedule[];
  onSubClick: (sub: SubSchedule) => void;
  onAddClick: () => void;
}

export function SubScheduleTimeline({
  scheduleStartDate,
  scheduleEndDate,
  subSchedules,
  onSubClick,
  onAddClick,
}: SubScheduleTimelineProps) {
  const dayInfos = useMemo(
    () => buildDayInfos(scheduleStartDate, scheduleEndDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleStartDate, scheduleEndDate],
  );

  const monthSpans = useMemo(() => {
    const spans: { label: string; count: number; borderKey: BorderKey }[] = [];
    for (const info of dayInfos) {
      if (info.isMonthStart) spans.push({ label: `${info.d.getMonth() + 1}월`, count: 1, borderKey: info.borderKey });
      else { spans[spans.length - 1].count++; spans[spans.length - 1].borderKey = info.borderKey; }
    }
    return spans;
  }, [dayInfos]);

  const weekSpans = useMemo(() => {
    const spans: { label: string; count: number; borderKey: BorderKey }[] = [];
    for (const info of dayInfos) {
      if (info.isWeekStart) spans.push({ label: `${info.weekNum}주`, count: 1, borderKey: info.borderKey });
      else { spans[spans.length - 1].count++; spans[spans.length - 1].borderKey = info.borderKey; }
    }
    return spans;
  }, [dayInfos]);

  // 반응형 일 열 너비
  const rightRef = useRef<HTMLDivElement>(null);
  const [effectiveDayW, setEffectiveDayW] = useState(MIN_DAY_W);
  useEffect(() => {
    const el = rightRef.current;
    if (!el || dayInfos.length === 0) return;
    const update = () => {
      const w = el.clientWidth - 32;
      setEffectiveDayW(Math.max(MIN_DAY_W, Math.floor(w / dayInfos.length)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dayInfos.length]);

  const totalWidth = dayInfos.length * effectiveDayW;

  // 그리드 라인 렌더
  const GridLines = () => (
    <>
      {dayInfos.map((info, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: (i + 1) * effectiveDayW - LINE_W[info.borderKey],
          width: LINE_W[info.borderKey],
          backgroundColor: LINE_BG[info.borderKey],
        }} />
      ))}
    </>
  );

  return (
    <div ref={rightRef} className="flex-1 min-w-0 flex flex-col px-4 pb-5">
      {/* [+일정] 버튼 */}
      <div className="flex justify-end mb-2 flex-none">
        <button type="button" onClick={onAddClick}
          className="flex items-center gap-1 px-3 py-1 bg-primary-500 text-white text-xs font-medium rounded-lg hover:bg-primary-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          일정
        </button>
      </div>

      {/* 타임라인 */}
      <div className="overflow-x-auto flex-1 flex flex-col">
        <div className="flex flex-col flex-1" style={{ minWidth: totalWidth }}>

          {/* 월 행 */}
          <div className="flex border border-gray-300 flex-none">
            {monthSpans.map((span, i) => (
              <div key={i}
                className={`text-center text-xs font-bold text-gray-700 bg-gray-200 border-b border-b-gray-300 py-1 overflow-hidden ${BORDER_RIGHT[span.borderKey]}`}
                style={{ width: span.count * effectiveDayW, minWidth: span.count * effectiveDayW }}>
                {span.label}
              </div>
            ))}
          </div>

          {/* 주 행 */}
          <div className="flex border-x border-gray-300 flex-none">
            {weekSpans.map((span, i) => (
              <div key={i}
                className={`text-center text-xs font-medium text-gray-600 bg-gray-100 border-b border-b-gray-200 py-1 overflow-hidden ${BORDER_RIGHT[span.borderKey]}`}
                style={{ width: span.count * effectiveDayW, minWidth: span.count * effectiveDayW }}>
                {span.label}
              </div>
            ))}
          </div>

          {/* 일 행 */}
          <div className="flex border-x border-gray-300 flex-none">
            {dayInfos.map((info, i) => (
              <div key={i}
                className={`text-center text-[10px] text-gray-400 bg-white border-b border-b-gray-200 py-1 overflow-hidden ${BORDER_RIGHT[info.borderKey]}`}
                style={{ width: effectiveDayW, minWidth: effectiveDayW }}>
                {info.d.getDate()}
              </div>
            ))}
          </div>

          {/* 세부일정 행 영역 */}
          <div className="overflow-y-auto overflow-x-hidden border-x border-b border-gray-300 flex-1">
            {subSchedules.length === 0 ? (
              <div className="relative border-b border-gray-100" style={{ minHeight: 36 + ROW_PAD * 2 }}>
                <GridLines />
              </div>
            ) : (
              subSchedules.map((sub) => (
                <div key={sub.id} className="relative border-b border-gray-100"
                  style={{ minHeight: BAR_MIN_H + ROW_PAD * 2, paddingTop: ROW_PAD, paddingBottom: ROW_PAD }}>
                  <GridLines />
                  <SubBar
                    sub={sub}
                    scheduleStart={scheduleStartDate}
                    effectiveDayW={effectiveDayW}
                    totalDays={dayInfos.length}
                    onClick={() => onSubClick(sub)}
                  />
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
