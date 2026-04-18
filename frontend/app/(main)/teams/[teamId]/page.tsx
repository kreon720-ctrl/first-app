'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTeamStore } from '@/store/teamStore';
import { useAuthStore } from '@/store/authStore';
import { useTeamDetail } from '@/hooks/query/useTeams';
import { useSchedules } from '@/hooks/query/useSchedules';
import { usePostits } from '@/hooks/query/usePostits';
import { useMyTasks } from '@/hooks/query/useMyTasks';
import { ChatPanel } from '@/components/chat/ChatPanel';
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

  const [activeTab, setActiveTab] = useState<'calendar' | 'chat'>('calendar');

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
        <TeamPageHeader
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
          initialLeftPercent={80}
          minLeftPercent={30}
          maxLeftPercent={80}
          left={
            <div className="border-r border-gray-200 overflow-hidden flex flex-col h-full">
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
            <>
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-medium text-gray-700">
                  {new Date(selectedDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}{' '}
                  채팅
                </h2>
              </div>
              <ChatPanel
                teamId={teamId}
                date={selectedDate}
                isLeader={isLeader}
              />
            </>
          }
        />

        <PostitSection postitError={postitActions.postitError} />
      </div>
    );
  }

  // Mobile layout: tab-based switching
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeamPageHeader
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
