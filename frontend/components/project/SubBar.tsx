'use client';

import React from 'react';
import type { SubSchedule, GanttBarColor } from '@/types/project';

// ── 색상 정의 ──
const BAR_COLORS: Record<GanttBarColor, { outer: string; progress: string; text: string }> = {
  indigo:  { outer: '#e0e7ff', progress: '#818cf8', text: '#312e81' },
  blue:    { outer: '#dbeafe', progress: '#60a5fa', text: '#1e3a8a' },
  emerald: { outer: '#d1fae5', progress: '#34d399', text: '#064e3b' },
  amber:   { outer: '#fef3c7', progress: '#fbbf24', text: '#78350f' },
  rose:    { outer: '#ffe4e6', progress: '#fb7185', text: '#881337' },
};

const PROGRESS_H = 20;
const BAR_MIN_H = Math.round(PROGRESS_H * 1.3);

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000
  );
}

function fmtDate(d: string) { return d.slice(5).replace('-', '/'); }

interface SubBarProps {
  sub: SubSchedule;
  scheduleStart: string;
  effectiveDayW: number;
  totalDays: number;
  onClick: () => void;
}

export function SubBar({ sub, scheduleStart, effectiveDayW, totalDays, onClick }: SubBarProps) {
  const [hovered, setHovered] = React.useState(false);
  const c = BAR_COLORS[sub.color] ?? BAR_COLORS.indigo;
  const startIdx = Math.max(0, daysBetween(scheduleStart, sub.startDate));
  const endIdx   = Math.min(totalDays - 1, daysBetween(scheduleStart, sub.endDate));
  const barLeft  = startIdx * effectiveDayW;
  const barWidth = Math.max(effectiveDayW, (endIdx - startIdx + 1) * effectiveDayW);
  const label    = `${sub.title} (${fmtDate(sub.startDate)}~${fmtDate(sub.endDate)})`;

  return (
    <div
      style={{
        marginLeft: barLeft,
        width: barWidth,
        cursor: 'pointer',
        position: 'relative',
        zIndex: 1,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 외부 바 (흐린 색) */}
      <div
        style={{
          position: 'relative',
          minHeight: BAR_MIN_H,
          backgroundColor: c.outer,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: sub.isDelayed ? '2px solid #ef4444' : 'none',
        }}
      >
        {/* 진행률 바 (진한 색, 좌측부터 progress% 만큼) */}
        <div
          style={{
            position: 'absolute',
            top: (BAR_MIN_H - PROGRESS_H) / 2,
            left: 0,
            height: PROGRESS_H,
            width: `${sub.progress}%`,
            backgroundColor: c.progress,
            borderRadius: 4,
          }}
        />
        {/* 텍스트 레이블 */}
        <div
          style={{
            position: 'relative',
            padding: '2px 6px',
            fontSize: 11,
            lineHeight: 1.3,
            color: hovered && sub.isDelayed ? '#ef4444' : c.text,
            textAlign: 'center',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            textShadow: '0 0 4px rgba(255,255,255,0.8)',
            fontWeight: 500,
          }}
        >
          {hovered ? (sub.isDelayed ? `${sub.progress}% (일정지연)` : `${sub.progress}%`) : label}
        </div>
      </div>
    </div>
  );
}
