'use client';

import React from 'react';
import type { ProjectSchedule, GanttBarColor } from '@/types/project';

// Static color lookup table for Tailwind v4 compatibility
// (no dynamic class names - all classes must be statically present)
const GANTT_COLOR_STYLES: Record<GanttBarColor, { bar: string; progress: string; text: string }> = {
  indigo:  { bar: 'bg-indigo-100 border border-indigo-300',   progress: 'bg-indigo-500',   text: 'text-indigo-900' },
  blue:    { bar: 'bg-blue-100 border border-blue-300',       progress: 'bg-blue-500',     text: 'text-blue-900' },
  emerald: { bar: 'bg-emerald-100 border border-emerald-300', progress: 'bg-emerald-500',  text: 'text-emerald-900' },
  amber:   { bar: 'bg-amber-100 border border-amber-300',     progress: 'bg-amber-500',    text: 'text-amber-900' },
  rose:    { bar: 'bg-rose-100 border border-rose-300',       progress: 'bg-rose-500',     text: 'text-rose-900' },
};

export const PROGRESS_BAR_HEIGHT = 20; // px
export const SCHEDULE_BAR_HEIGHT = 28; // px

interface GanttBarProps {
  schedule: ProjectSchedule;
  onClick: () => void;
}

export function GanttBar({ schedule, onClick }: GanttBarProps) {
  const styles = GANTT_COLOR_STYLES[schedule.color] ?? GANTT_COLOR_STYLES.indigo;

  const label = `${schedule.title} (${schedule.startDate}~${schedule.endDate})`;

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
      className={`relative w-full rounded overflow-hidden cursor-pointer select-none ${styles.bar}`}
      style={{ height: SCHEDULE_BAR_HEIGHT }}
    >
      {/* Progress bar overlay */}
      <div
        className={`absolute top-1/2 left-0 rounded-l -translate-y-1/2 ${styles.progress}`}
        style={{
          width: `${Math.min(100, Math.max(0, schedule.progress))}%`,
          height: PROGRESS_BAR_HEIGHT,
        }}
      />

      {/* Text label centered over the bar */}
      <div
        className={`absolute inset-0 flex items-center justify-center px-1 pointer-events-none`}
      >
        <span
          className={`text-xs font-medium truncate ${styles.text} mix-blend-multiply`}
          style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
