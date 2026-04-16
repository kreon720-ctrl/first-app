'use client';

import React from 'react';
import type { Project, ProjectSchedule } from '@/types/project';
import { GanttBar } from './GanttBar';
import {
  getProjectWeeks,
  groupWeeksByMonth,
  getWeekOfMonth,
  getWeekIndex,
  isMonthBoundary,
} from './ganttUtils';

const MIN_CELL_WIDTH = 40; // px per week (minimum)
const ROW_HEIGHT = 64;     // px per phase row

interface GanttChartProps {
  project: Project;
  schedules: ProjectSchedule[];
  currentUserId: string;
  onBarClick: (schedule: ProjectSchedule) => void;
}

export function GanttChart({ project, schedules, onBarClick }: GanttChartProps) {
  const weeks = getProjectWeeks(project.startDate, project.endDate);
  const monthGroups = groupWeeksByMonth(weeks);

  return (
    <div className="flex overflow-hidden h-full">
      {/* Left: Phase labels (sticky) */}
      <div className="flex-none w-28 border-r border-gray-300 bg-white z-10">
        {/* Header spacer (two rows: month + week) */}
        <div className="h-14 border-b border-gray-300 flex items-center justify-center">
          <span className="text-xs text-gray-500 font-medium">단계</span>
        </div>

        {/* Phase rows */}
        {project.phases.map((phase, idx) => (
          <div
            key={phase.id}
            className={`flex items-center justify-center border-b border-gray-200 px-2 ${
              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            }`}
            style={{ height: ROW_HEIGHT }}
          >
            <span className="text-xs text-gray-700 text-center break-words leading-tight line-clamp-3">
              {phase.name}
            </span>
          </div>
        ))}
      </div>

      {/* Right: Scrollable Gantt content */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div style={{ minWidth: `${weeks.length * MIN_CELL_WIDTH}px` }}>
          {/* Month header row */}
          <div className="flex h-7 border-b border-gray-200 sticky top-0 bg-white z-10">
            {monthGroups.map((group) => (
              <div
                key={`${group.year}-${group.month}`}
                style={{ flex: group.weeks.length }}
                className="border-l-2 border-gray-500 text-center text-xs font-semibold py-1 text-gray-700 overflow-hidden"
              >
                {group.month}월
              </div>
            ))}
          </div>

          {/* Week number header row */}
          <div className="flex h-7 border-b border-gray-300 sticky top-7 bg-white z-10">
            {weeks.map((week, i) => (
              <div
                key={i}
                style={{ flex: 1 }}
                className={`text-center text-xs text-gray-500 py-1 ${
                  isMonthBoundary(monthGroups, i)
                    ? 'border-l-2 border-gray-500'
                    : 'border-l border-gray-200'
                }`}
              >
                {getWeekOfMonth(week)}
              </div>
            ))}
          </div>

          {/* Phase rows with bars */}
          {project.phases.map((phase, phaseIdx) => {
            const phaseSchedules = schedules.filter((s) => s.phaseId === phase.id);

            return (
              <div
                key={phase.id}
                className={`relative flex border-b border-gray-200 ${
                  phaseIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
                style={{ height: ROW_HEIGHT }}
              >
                {/* Background week cells */}
                {weeks.map((_, wIdx) => (
                  <div
                    key={wIdx}
                    style={{ flex: 1 }}
                    className={
                      isMonthBoundary(monthGroups, wIdx)
                        ? 'border-l-2 border-gray-500'
                        : 'border-l border-gray-200'
                    }
                  />
                ))}

                {/* Gantt bars (absolutely positioned) */}
                {phaseSchedules.map((schedule) => {
                  const startIdx = getWeekIndex(weeks, schedule.startDate);
                  const endIdx = getWeekIndex(weeks, schedule.endDate);
                  const totalWeeks = weeks.length;

                  const leftPct = (startIdx / totalWeeks) * 100;
                  const widthPct = ((endIdx - startIdx + 1) / totalWeeks) * 100;

                  return (
                    <div
                      key={schedule.id}
                      className="absolute"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        paddingLeft: '2px',
                        paddingRight: '2px',
                        zIndex: 1,
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
