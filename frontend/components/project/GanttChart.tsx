'use client';

import React from 'react';
import type { Project, ProjectSchedule } from '@/types/project';
import { GanttBar } from './GanttBar';
import {
  getProjectWeeks,
  groupWeeksByMonth,
  getWeekIndex,
  isMonthBoundary,
  type MonthGroup,
} from './ganttUtils';

const MIN_CELL_WIDTH = 40; // px per week (minimum)
const MIN_ROW_HEIGHT = 44; // px — minimum row height
const BAR_GAP = 4;         // px between stacked bars
const ROW_PADDING = 8;     // px top/bottom padding inside row

interface GanttChartProps {
  project: Project;
  schedules: ProjectSchedule[];
  currentUserId: string;
  onBarClick: (schedule: ProjectSchedule) => void;
}

export function GanttChart({ project, schedules, onBarClick }: GanttChartProps) {
  const weeks = getProjectWeeks(project.startDate, project.endDate);

  // endDate 이후 달로 분류된 주(목요일 컨벤션 부작용)를 endDate의 달로 재분류 후 병합
  const [endYear, endMon] = project.endDate.split('-').map(Number);
  const monthGroups = groupWeeksByMonth(weeks).reduce<MonthGroup[]>((acc, group) => {
    const overEnd = group.year > endYear || (group.year === endYear && group.month > endMon);
    const ey = overEnd ? endYear : group.year;
    const em = overEnd ? endMon : group.month;
    const existing = acc.find((g) => g.year === ey && g.month === em);
    if (existing) {
      existing.weeks.push(...group.weeks);
      existing.weekIndices.push(...group.weekIndices);
    } else {
      acc.push({ ...group, year: ey, month: em });
    }
    return acc;
  }, []);

  // Pre-sort schedules per phase by startDate (ascending)
  const sortedByPhase = new Map<string, ProjectSchedule[]>();
  for (const phase of project.phases) {
    const phaseSchedules = schedules
      .filter((s) => s.phaseId === phase.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    sortedByPhase.set(phase.id, phaseSchedules);
  }

  const LABEL_W = 112; // px — left phase label column width (w-28)

  return (
    /* Single scroll container: both x and y */
    <div className="overflow-auto h-full">
      <div style={{ minWidth: `${LABEL_W + weeks.length * MIN_CELL_WIDTH}px` }}>

        {/* ── Month header row (sticky top-0) ────────────────────────── */}
        <div className="flex h-7 border-b border-gray-200 dark:border-dark-border sticky top-0 z-20 bg-white dark:bg-dark-base">
          {/* Top-left corner: sticky left too */}
          <div
            className="flex-none border-r border-gray-300 dark:border-dark-border bg-white dark:bg-dark-base sticky left-0 z-30"
            style={{ width: LABEL_W }}
          />
          {monthGroups.map((group) => (
            <div
              key={`${group.year}-${group.month}`}
              style={{ flex: group.weeks.length }}
              className="border-l-2 border-gray-500 dark:border-dark-border text-center text-xs font-semibold py-1 text-gray-700 dark:text-dark-text-muted overflow-hidden"
            >
              {group.month}월
            </div>
          ))}
        </div>

        {/* ── Week number header row (sticky top-7) ──────────────────── */}
        <div className="flex h-7 border-b border-gray-300 dark:border-dark-border sticky top-7 z-20 bg-white dark:bg-dark-base">
          {/* Label column spacer */}
          <div
            className="flex-none border-r border-gray-300 dark:border-dark-border bg-white dark:bg-dark-base sticky left-0 z-30 flex items-center justify-center"
            style={{ width: LABEL_W }}
          >
            <span className="text-xs text-gray-500 dark:text-dark-text-muted font-medium">단계</span>
          </div>
          {(() => {
            // Build index→sequential week number map from monthGroups (avoids Thursday-convention artifacts)
            const weekNumMap = new Map<number, number>();
            for (const group of monthGroups) {
              group.weekIndices.forEach((wIdx, seq) => weekNumMap.set(wIdx, seq + 1));
            }
            return weeks.map((_, i) => (
              <div
                key={i}
                style={{ flex: 1 }}
                className={`text-center text-xs text-gray-500 dark:text-dark-text-muted py-1 ${
                  isMonthBoundary(monthGroups, i)
                    ? 'border-l-2 border-gray-500 dark:border-dark-border'
                    : 'border-l border-gray-200 dark:border-dark-border'
                }`}
              >
                {weekNumMap.get(i) ?? ''}
              </div>
            ));
          })()}
        </div>

        {/* ── Phase rows ─────────────────────────────────────────────── */}
        {project.phases.map((phase, phaseIdx) => {
          const phaseSchedules = sortedByPhase.get(phase.id) ?? [];
          const totalWeeks = weeks.length;
          const rowBg = phaseIdx % 2 === 0 ? 'bg-white dark:bg-dark-base' : 'bg-gray-50 dark:bg-dark-surface';

          return (
            <div
              key={phase.id ?? `phase-${phaseIdx}`}
              className={`flex border-b border-gray-200 dark:border-dark-border ${rowBg}`}
              style={{ minHeight: MIN_ROW_HEIGHT }}
            >
              {/* Phase label — sticky left */}
              <div
                className={`flex-none border-r border-gray-300 dark:border-dark-border sticky left-0 z-10 flex items-center justify-center px-2 ${rowBg}`}
                style={{ width: LABEL_W }}
              >
                <span className="text-xs text-gray-700 dark:text-dark-text-muted text-center break-words leading-tight line-clamp-3">
                  {phase.name}
                </span>
              </div>

              {/* Bars column */}
              <div className="flex-1 relative" style={{ minHeight: MIN_ROW_HEIGHT }}>
                {/* Background week cells */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {weeks.map((_, wIdx) => (
                    <div
                      key={wIdx}
                      style={{ flex: 1 }}
                      className={
                        isMonthBoundary(monthGroups, wIdx)
                          ? 'border-l-2 border-gray-500 dark:border-dark-border'
                          : 'border-l border-gray-200 dark:border-dark-border'
                      }
                    />
                  ))}
                </div>

                {/* Gantt bars */}
                <div
                  className="relative z-10 flex flex-col"
                  style={{ padding: `${ROW_PADDING}px 0`, gap: BAR_GAP }}
                >
                  {phaseSchedules.map((schedule) => {
                    const startIdx = getWeekIndex(weeks, schedule.startDate, 'start');
                    const endIdx = getWeekIndex(weeks, schedule.endDate, 'end');
                    const leftPct = (startIdx / totalWeeks) * 100;
                    const widthPct = ((endIdx - startIdx + 1) / totalWeeks) * 100;

                    return (
                      <div
                        key={schedule.id}
                        style={{
                          marginLeft: `${leftPct}%`,
                          width: `${widthPct}%`,
                          paddingLeft: 2,
                          paddingRight: 2,
                        }}
                      >
                        <GanttBar
                          schedule={schedule}
                          onClick={() => onBarClick(schedule)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
