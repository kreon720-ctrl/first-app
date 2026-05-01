'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTeamStore } from '@/store/teamStore';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { useTeamDetail } from '@/hooks/query/useTeams';
import { useSchedules } from '@/hooks/query/useSchedules';
import { usePostits } from '@/hooks/query/usePostits';
import { useMyTasks } from '@/hooks/query/useMyTasks';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { AIAssistantPanel } from '@/components/ai-assistant/AIAssistantPanel';
import { ResizableSplit } from '@/components/common/ResizableSplit';
import { Button } from '@/components/common/Button';
import { TeamPageHeader } from './_components/TeamPageHeader';
import { CalendarSection } from './_components/CalendarSection';
import { PostitSection } from './_components/PostitSection';
import { MobileLayout } from './_components/MobileLayout';
import { useScheduleActions } from './_hooks/useScheduleActions';
import { usePostitActions } from './_hooks/usePostitActions';

interface TeamMainPageProps {
  params: Promise<{ teamId: string }>;
}

export default function TeamMainPage({ params }: TeamMainPageProps) {
  const { teamId } = use(params);
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const { data: team, isLoading, isError } = useTeamDetail(teamId);
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const {
    selectedDate,
    calendarView,
    setSelectedTeamId,
    setSelectedDate,
    setCalendarView,
  } = useTeamStore();

  const [activeTab, setActiveTab] = useState<'calendar' | 'chat' | 'ai-assistant'>('calendar');
  // 데스크탑 우측 패널의 탭 — 팀채팅 / AI 버틀러
  const [rightTab, setRightTab] = useState<'chat' | 'ai-assistant'>('chat');

  // 프로젝트 갠트 뷰일 때 활성 프로젝트의 채팅을 우측에 표시.
  const projectsForTeam = useProjectStore((s) => s.projects[teamId]);
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const activeProject = (projectsForTeam ?? []).find((p) => p.id === selectedProjectId) ?? null;
  const isProjectChatMode = calendarView === 'project' && !!activeProject;

  const { data: schedulesData } = useSchedules(teamId, {
    view: calendarView,
    date: selectedDate,
  });

  // 포스트잇: 현재 월 (YYYY-MM) 기준 조회 — PC + 월간뷰 전용
  const postitMonth = selectedDate.slice(0, 7);
  const { data: postitsData } = usePostits(
    teamId,
    isDesktop && calendarView === 'month' ? postitMonth : ''
  );
  const { data: myTasksData } = useMyTasks();
  const pendingCount = myTasksData?.totalPendingCount ?? 0;

  const schedules = schedulesData?.schedules ?? [];
  const postits = postitsData?.postits ?? [];

  // Update selected team ID when component mounts
  useEffect(() => {
    setSelectedTeamId(teamId);
  }, [teamId, setSelectedTeamId]);

  const scheduleActions = useScheduleActions({ teamId, selectedDate });

  const postitActions = usePostitActions({
    teamId,
    isDesktop,
    calendarView,
    onDateSelect: setSelectedDate,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleNavigateHome = () => {
    router.push('/');
  };

  const handleNavigateToTasks = () => {
    router.push('/me/tasks');
  };

  const handleViewChange = (view: 'month' | 'week' | 'day' | 'project') => {
    setCalendarView(view);
  };

  const handleDateChange = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex items-center justify-center">
        <div className="animate-pulse">
          <p className="text-sm text-gray-500 dark:text-dark-text-muted">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex items-center justify-center">
        <div className="flex flex-col items-center py-16 px-6 text-center">
          <svg className="w-12 h-12 text-error-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-error-500 mb-4">팀 정보를 불러오는 중 오류가 발생했습니다.</p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleNavigateHome}
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const isLeader = team.myRole === 'LEADER';
  const currentDate = new Date(selectedDate);

  // Desktop layout: side-by-side split
  if (isDesktop) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-dark-base">
        <TeamPageHeader
          teamId={teamId}
          teamName={team.name}
          currentUserName={currentUser?.name}
          isLeader={isLeader}
          pendingCount={pendingCount}
          isDesktop={true}
          onNavigateHome={handleNavigateHome}
          onNavigateToTasks={handleNavigateToTasks}
          onLogout={handleLogout}
        />

        <ResizableSplit
          initialLeftPercent={78}
          minLeftPercent={30}
          maxLeftPercent={78}
          left={
            <div className="border-r border-gray-200 dark:border-dark-border overflow-hidden flex flex-col h-full">
              <CalendarSection
                teamId={teamId}
                currentDate={currentDate}
                selectedDate={selectedDate}
                calendarView={calendarView}
                schedules={schedules}
                postits={postits}
                currentUserId={currentUser?.id}
                isLeader={isLeader}
                compact={false}
                selectedPostitColor={postitActions.selectedPostitColor}
                showCreateModal={scheduleActions.showCreateModal}
                showEditModal={scheduleActions.showEditModal}
                showDetailModal={scheduleActions.showDetailModal}
                scheduleDefaultDate={scheduleActions.scheduleDefaultDate}
                selectedSchedule={scheduleActions.selectedSchedule}
                createScheduleIsPending={scheduleActions.createSchedule.isPending}
                createScheduleError={scheduleActions.createSchedule.error instanceof Error ? scheduleActions.createSchedule.error.message : null}
                updateScheduleIsPending={scheduleActions.updateSchedule.isPending}
                updateScheduleError={scheduleActions.updateSchedule.error instanceof Error ? scheduleActions.updateSchedule.error.message : null}
                deleteScheduleIsPending={scheduleActions.deleteSchedule.isPending}
                onPostitColorSelect={postitActions.setSelectedPostitColor}
                onPostitDelete={postitActions.handlePostitDelete}
                onPostitContentChange={postitActions.handlePostitContentChange}
                onViewChange={handleViewChange}
                onDateChange={handleDateChange}
                onDateClick={postitActions.handleDateClick}
                onCreateSchedule={scheduleActions.handleCreateSchedule}
                onScheduleClick={scheduleActions.handleScheduleClick}
                onCreateModalClose={() => scheduleActions.setShowCreateModal(false)}
                onCreateSubmit={scheduleActions.handleCreateSubmit}
                onDetailClose={() => { scheduleActions.setShowDetailModal(false); scheduleActions.setSelectedSchedule(null); }}
                onDetailEdit={() => { scheduleActions.setShowDetailModal(false); scheduleActions.setShowEditModal(true); }}
                onDelete={scheduleActions.handleDelete}
                onEditModalClose={() => { scheduleActions.setShowEditModal(false); scheduleActions.setSelectedSchedule(null); }}
                onEditSubmit={scheduleActions.handleEditSubmit}
              />
            </div>
          }
          right={
            <div className="flex flex-col h-full">
              {/* 탭 헤더 — 팀채팅 / AI 버틀러 */}
              <div className="flex border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface shrink-0">
                <button
                  type="button"
                  onClick={() => setRightTab('chat')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${
                    rightTab === 'chat'
                      ? 'text-primary-600 border-primary-500 dark:text-dark-accent dark:border-dark-accent'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-muted dark:hover:text-dark-text'
                  }`}
                >
                  {/* 채팅 말풍선 아이콘 */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    <circle cx="9" cy="12" r="0.6" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="12" r="0.6" fill="currentColor" stroke="none" />
                  </svg>
                  {isProjectChatMode ? `${activeProject!.name} 채팅` : '팀채팅'}
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('ai-assistant')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${
                    rightTab === 'ai-assistant'
                      ? 'text-primary-600 border-primary-500 dark:text-dark-accent dark:border-dark-accent'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-muted dark:hover:text-dark-text'
                  }`}
                >
                  {/* AI sparkle 아이콘 */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3 13.7 8.3 19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
                    <path d="M18 14 18.7 16 21 16.7 18.7 17.3 18 19.3 17.3 17.3 15.3 16.7 17.3 16z" />
                    <path d="M5 4 5.5 5.5 7 6 5.5 6.5 5 8 4.5 6.5 3 6 4.5 5.5z" />
                  </svg>
                  AI 찰떡이
                </button>
              </div>

              {/* 본문 — 활성 탭에 따라 ChatPanel 또는 AIAssistantPanel */}
              {rightTab === 'chat' ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface shrink-0">
                    {isProjectChatMode ? (
                      <h2 className="text-sm font-medium text-gray-700 dark:text-dark-text-muted truncate">
                        <span className="text-emerald-600 dark:text-emerald-400">📌</span>{' '}
                        {activeProject!.name}{' '}
                        <span className="text-xs text-gray-400 dark:text-dark-text-disabled">
                          ({activeProject!.startDate} ~ {activeProject!.endDate})
                        </span>
                      </h2>
                    ) : (
                      <h2 className="text-sm font-medium text-gray-700 dark:text-dark-text-muted">
                        {new Date(selectedDate).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}{' '}
                        채팅
                      </h2>
                    )}
                  </div>
                  {isProjectChatMode ? (
                    <ChatPanel
                      key={`project-${activeProject!.id}`}
                      teamId={teamId}
                      projectId={activeProject!.id}
                      isLeader={isLeader}
                    />
                  ) : (
                    <ChatPanel
                      key={`team-${selectedDate}`}
                      teamId={teamId}
                      date={selectedDate}
                      isLeader={isLeader}
                    />
                  )}
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <AIAssistantPanel teamId={teamId} teamName={team.name} />
                </div>
              )}
            </div>
          }
        />

        <PostitSection postitError={postitActions.postitError} />
      </div>
    );
  }

  // Mobile layout: tab-based switching
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col">
      <TeamPageHeader
        teamId={teamId}
        teamName={team.name}
        currentUserName={currentUser?.name}
        isLeader={isLeader}
        pendingCount={pendingCount}
        isDesktop={false}
        onNavigateHome={handleNavigateHome}
        onNavigateToTasks={handleNavigateToTasks}
        onLogout={handleLogout}
      />

      <MobileLayout
        teamId={teamId}
        teamName={team.name}
        currentDate={currentDate}
        selectedDate={selectedDate}
        calendarView={calendarView}
        schedules={schedules}
        isLeader={isLeader}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onViewChange={handleViewChange}
        onDateChange={handleDateChange}
        onDateClick={postitActions.handleDateClick}
        onCreateSchedule={scheduleActions.handleCreateSchedule}
        onScheduleClick={scheduleActions.handleScheduleClick}
        showCreateModal={scheduleActions.showCreateModal}
        showEditModal={scheduleActions.showEditModal}
        showDetailModal={scheduleActions.showDetailModal}
        scheduleDefaultDate={scheduleActions.scheduleDefaultDate}
        selectedSchedule={scheduleActions.selectedSchedule}
        createScheduleIsPending={scheduleActions.createSchedule.isPending}
        createScheduleError={scheduleActions.createSchedule.error instanceof Error ? scheduleActions.createSchedule.error.message : null}
        updateScheduleIsPending={scheduleActions.updateSchedule.isPending}
        updateScheduleError={scheduleActions.updateSchedule.error instanceof Error ? scheduleActions.updateSchedule.error.message : null}
        deleteScheduleIsPending={scheduleActions.deleteSchedule.isPending}
        onCreateModalClose={() => scheduleActions.setShowCreateModal(false)}
        onCreateSubmit={scheduleActions.handleCreateSubmit}
        onDetailClose={() => { scheduleActions.setShowDetailModal(false); scheduleActions.setSelectedSchedule(null); }}
        onDetailEdit={() => { scheduleActions.setShowDetailModal(false); scheduleActions.setShowEditModal(true); }}
        onDelete={scheduleActions.handleDelete}
        onEditModalClose={() => { scheduleActions.setShowEditModal(false); scheduleActions.setSelectedSchedule(null); }}
        onEditSubmit={scheduleActions.handleEditSubmit}
      />
    </div>
  );
}
