'use client';

import React from 'react';
import { Schedule } from '@/types/schedule';
import { CalendarView as CalendarViewType } from '@/types/schedule';
import type { PostIt } from '@/types/postit';
import type { ScheduleColor } from '@/types/schedule';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarDayView } from './CalendarDayView';
import { PostItColorPalette } from './PostItColorPalette';
import { ProjectGanttView } from '@/components/project/ProjectGanttView';
import { useProjectStore } from '@/store/projectStore';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate?: Date;
  view: CalendarViewType;
  schedules?: Schedule[];
  canCreateSchedule?: boolean;
  compact?: boolean;
  // 포스트잇 관련 (PC 월간뷰 전용)
  postits?: PostIt[];
  currentUserId?: string;
  selectedPostitColor?: ScheduleColor | null;
  onPostitColorSelect?: (color: ScheduleColor | null) => void;
  onPostitDelete?: (id: string, date: string) => void;
  onPostitContentChange?: (id: string, content: string) => void;
  onViewChange?: (view: CalendarViewType) => void;
  onDateChange?: (date: Date) => void;
  onDateClick?: (date: Date) => void;
  onCreateSchedule?: (defaultDate?: string) => void;
  onScheduleClick?: (schedule: Schedule) => void;
  // Project view props (PC only)
  teamId?: string;
  isLeader?: boolean;
}

export function CalendarView({
  currentDate,
  selectedDate,
  view = 'month',
  schedules = [],
  canCreateSchedule = false,
  compact = false,
  postits = [],
  currentUserId,
  selectedPostitColor,
  onPostitColorSelect,
  onPostitDelete,
  onPostitContentChange,
  onViewChange,
  onDateChange,
  onDateClick,
  onCreateSchedule,
  onScheduleClick,
  teamId,
  isLeader = false,
}: CalendarViewProps) {
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setUTCDate(1);

    if (view === 'month') {
      newDate.setUTCMonth(newDate.getUTCMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setUTCDate(currentDate.getUTCDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setUTCDate(currentDate.getUTCDate() + (direction === 'next' ? 1 : -1));
    }

    onDateChange?.(newDate);
  };

  const formatDateRange = (): string => {
    const year = currentDate.getUTCFullYear();

    if (view === 'month') {
      const month = currentDate.getUTCMonth() + 1;
      return `${year}년 ${month}월`;
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setUTCDate(currentDate.getUTCDate() - currentDate.getUTCDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);

      const startMonth = startOfWeek.getUTCMonth() + 1;
      const endMonth = endOfWeek.getUTCMonth() + 1;

      if (startMonth === endMonth) {
        return `${year}년 ${startMonth}월 ${startOfWeek.getUTCDate()}일 ~ ${endOfWeek.getUTCDate()}일`;
      }
      return `${year}년 ${startMonth}월 ~ ${endMonth}월`;
    } else {
      const month = currentDate.getUTCMonth() + 1;
      const day = currentDate.getUTCDate();
      return `${year}년 ${month}월 ${day}일`;
    }
  };

  // 프로젝트 목록 (PC only) — 선택자에서 직접 배열 참조를 반환해야 무한 루프 방지
  const rawTeamProjects = useProjectStore((s) => s.projects[teamId ?? '']);
  const teamProjects = rawTeamProjects ?? [];
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const setSelectedProject = useProjectStore((s) => s.setSelectedProject);

  // 뷰 탭: 프로젝트가 있으면 프로젝트명 탭들(PC only) + 월/주/일
  const viewTabs: { id: CalendarViewType; label: string }[] = [
    { id: 'month', label: '월' },
    { id: 'week', label: '주' },
    { id: 'day', label: '일' },
  ];

  // 팔레트는 월간뷰 + compact 아님 + 콜백 있을 때만 표시
  const showPalette = view === 'month' && !compact && !!onPostitColorSelect;

  // In project view, hide navigation and schedule create button
  const isProjectView = view === 'project';

  // 프로젝트 탭 클릭: store의 selectedProjectId 갱신 + project view로 전환
  const handleProjectTabClick = (projectId: string) => {
    setSelectedProject(projectId);
    onViewChange?.('project');
  };

  return (
    <div className="w-full bg-white flex flex-col flex-1 min-h-0">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4 px-2">
        {/* Navigation buttons (hidden in project view) */}
        <div className="flex items-center gap-2">
          {!isProjectView && (
            <>
              <button
                type="button"
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                aria-label="이전"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2
                className={`font-semibold text-gray-900 text-center ${
                  compact ? 'text-xs min-w-[100px]' : 'text-lg min-w-[150px]'
                }`}
              >
                {formatDateRange()}
              </h2>

              <button
                type="button"
                onClick={() => navigateDate('next')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                aria-label="다음"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* 프로젝트 관리 버튼 (PC only) */}
          {!compact && (
            <button
              type="button"
              onClick={() => onViewChange?.('project')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
              프로젝트 관리
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* 일정 등록 버튼 (project view에서는 숨김) */}
          {!isProjectView && canCreateSchedule && onCreateSchedule && (
            <div className="relative group">
              <button
                type="button"
                onClick={() => onCreateSchedule()}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors duration-150 ${
                  compact ? 'text-xs' : 'text-sm'
                }`}
                aria-label="일정 등록"
              >
                {!compact && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
                {compact ? '등록' : '일정 등록'}
              </button>
              {!compact && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  새로운 일정을 추가합니다.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </div>
              )}
            </div>
          )}

          {/* View tabs */}
          <div className="flex border-b border-gray-200">
            {/* 프로젝트 탭 (PC only, 프로젝트 있을 때만) */}
            {!compact && teamProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleProjectTabClick(project.id)}
                className={`
                  py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-150
                  ${view === 'project' && selectedProjectId === project.id
                    ? 'text-primary-600 border-primary-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {project.name}
              </button>
            ))}
            {/* 월/주/일 탭 */}
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onViewChange?.(tab.id)}
                className={`
                  py-2 font-medium border-b-2 transition-colors duration-150
                  ${compact ? 'px-3 text-xs' : 'px-4 text-sm'}
                  ${view === tab.id
                    ? 'text-primary-600 border-primary-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 포스트잇 색상 팔레트 (PC 월간뷰, 오른쪽 끝) */}
          {showPalette && (
            <PostItColorPalette
              selectedColor={selectedPostitColor ?? null}
              onSelect={onPostitColorSelect}
            />
          )}
        </div>
      </div>

      {/* Calendar / Project content */}
      {isProjectView ? (
        <div className="flex-1 min-h-0 overflow-hidden px-2">
          <ProjectGanttView
            teamId={teamId ?? ''}
            currentUserId={currentUserId ?? ''}
            isLeader={isLeader}
          />
        </div>
      ) : (
        <div className={`px-2 ${view === 'month' ? 'overflow-y-auto flex-1 min-h-0' : 'flex-1 min-h-0'}`}>
          {view === 'month' && (
            <CalendarMonthView
              currentDate={currentDate}
              schedules={schedules}
              selectedDate={selectedDate}
              onDateClick={onDateClick}
              onScheduleClick={onScheduleClick}
              postits={postits}
              currentUserId={currentUserId}
              onPostitDelete={onPostitDelete}
              onPostitContentChange={onPostitContentChange}
            />
          )}
          {view === 'week' && (
            <CalendarWeekView
              currentDate={currentDate}
              schedules={schedules}
              selectedDate={selectedDate}
              onDateClick={onDateClick}
              onScheduleClick={onScheduleClick}
            />
          )}
          {view === 'day' && (
            <CalendarDayView
              currentDate={currentDate}
              schedules={schedules}
              selectedDate={selectedDate}
              onDateClick={onDateClick}
              onScheduleClick={onScheduleClick}
            />
          )}
        </div>
      )}
    </div>
  );
}
