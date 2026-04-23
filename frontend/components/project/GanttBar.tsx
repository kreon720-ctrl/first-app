'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectSchedule, GanttBarColor } from '@/types/project';

// Static color lookup table for Tailwind v4 compatibility
// (no dynamic class names - all classes must be statically present)
const GANTT_COLOR_STYLES: Record<GanttBarColor, { bar: string; barDelayed: string; progress: string; text: string }> = {
  indigo:  { bar: 'bg-indigo-100 border border-indigo-300',   barDelayed: 'bg-indigo-100 border-2 border-red-500',   progress: 'bg-indigo-300',   text: 'text-indigo-900' },
  blue:    { bar: 'bg-blue-100 border border-blue-300',       barDelayed: 'bg-blue-100 border-2 border-red-500',     progress: 'bg-blue-300',     text: 'text-blue-900' },
  emerald: { bar: 'bg-emerald-100 border border-emerald-300', barDelayed: 'bg-emerald-100 border-2 border-red-500',  progress: 'bg-emerald-300',  text: 'text-emerald-900' },
  amber:   { bar: 'bg-amber-100 border border-amber-300',     barDelayed: 'bg-amber-100 border-2 border-red-500',    progress: 'bg-amber-300',    text: 'text-amber-900' },
  rose:    { bar: 'bg-rose-100 border border-rose-300',       barDelayed: 'bg-rose-100 border-2 border-red-500',     progress: 'bg-rose-300',     text: 'text-rose-900' },
};

export const PROGRESS_BAR_HEIGHT = 20; // px
export const SCHEDULE_BAR_HEIGHT = 28; // px — minimum bar height (bar grows with text)

interface GanttBarProps {
  schedule: ProjectSchedule;
  onClick: () => void;
}

export function GanttBar({ schedule, onClick }: GanttBarProps) {
  const styles = GANTT_COLOR_STYLES[schedule.color] ?? GANTT_COLOR_STYLES.indigo;
  const isDelayed = schedule.isDelayed ?? false;
  const barClass = isDelayed ? styles.barDelayed : styles.bar;

  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const fmtDate = (d: string) => {
    const [, m, day] = d.split('-');
    return `${parseInt(m)}/${parseInt(day)}`;
  };
  const label = `${schedule.title} (${fmtDate(schedule.startDate)}~${fmtDate(schedule.endDate)})`;
  const hoverLabel = isDelayed
    ? `${schedule.progress}% (일정지연)`
    : `${schedule.progress}%`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTooltip(null)}
      className={`group relative w-full rounded overflow-hidden cursor-pointer select-none ${barClass}`}
      style={{ minHeight: SCHEDULE_BAR_HEIGHT }}
    >
      {/* Hover tooltip — portal to document.body, always on top */}
      {tooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="pointer-events-none"
          style={{ position: 'fixed', left: tooltip.x + 12, top: tooltip.y + 12, zIndex: 2147483647 }}
        >
          <div className="bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-xs rounded-lg shadow-xl border border-gray-200 dark:border-dark-border px-3 py-2 max-w-xs">
            <p className="font-semibold leading-snug mb-1 text-gray-900 dark:text-dark-text">{schedule.title}</p>
            <p className="text-gray-500 dark:text-dark-text-muted">{fmtDate(schedule.startDate)} ~ {fmtDate(schedule.endDate)}</p>
            {schedule.description && (
              <p className="text-gray-600 dark:text-dark-text-muted mt-1 whitespace-pre-wrap">{schedule.description}</p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Progress bar overlay — stretches full height of bar */}
      <div
        className={`absolute inset-y-0 left-0 rounded-l ${styles.progress}`}
        style={{ width: `${Math.min(100, Math.max(0, schedule.progress))}%` }}
      />

      {/* Text label — in flow (determines bar height), hidden on hover */}
      <div className="relative z-10 flex items-center justify-center px-1.5 py-1 group-hover:opacity-0 transition-opacity duration-100 pointer-events-none">
        <span
          className={`text-xs font-medium text-center leading-tight line-clamp-2 ${styles.text} mix-blend-multiply`}
          style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
          {label}
        </span>
      </div>

      {/* Progress label — visible on hover */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
        <span className={`text-xs font-bold ${isDelayed ? 'text-red-600' : styles.text}`}>
          {hoverLabel}
        </span>
      </div>
    </div>
  );
}
