'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTeamStore } from '@/store/teamStore';
import { useAuthStore } from '@/store/authStore';
import { useTeamDetail } from '@/hooks/query/useTeams';
import { CalendarView } from '@/components/schedule/CalendarView';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Button } from '@/components/common/Button';

interface TeamMainPageProps {
  teamId: string;
}

export default function TeamMainPage({ teamId }: TeamMainPageProps) {
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

  // Update selected team ID when component mounts
  useEffect(() => {
    setSelectedTeamId(teamId);
  }, [teamId, setSelectedTeamId]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
  };

  const handleViewChange = (view: 'month' | 'week' | 'day') => {
    setCalendarView(view);
  };

  const handleNavigateHome = () => {
    router.push('/');
  };

  const handleNavigateToTasks = () => {
    router.push('/me/tasks');
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
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNavigateHome}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
              aria-label="홈"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate">{team.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isLeader && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleNavigateToTasks}
              >
                나의 할 일
              </Button>
            )}
            <span className="text-sm font-normal text-gray-600">{currentUser?.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              로그아웃
            </Button>
          </div>
        </header>

        {/* Main content: split layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar section (left 60%) */}
          <div className="w-[60%] border-r border-gray-200 overflow-y-auto">
            <CalendarView
              currentDate={currentDate}
              view={calendarView}
              schedules={[]}
              onViewChange={handleViewChange}
              onDateChange={(date) => {
                const dateString = date.toISOString().split('T')[0];
                setSelectedDate(dateString);
              }}
              onDateClick={handleDateClick}
            />
          </div>

          {/* Chat section (right 40%) */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
          </div>
        </div>
      </div>
    );
  }

  // Mobile layout: tab-based switching
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNavigateHome}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            aria-label="홈"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{team.name}</h1>
        </div>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
          aria-label="메뉴"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </header>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-150 ${
            activeTab === 'calendar'
              ? 'text-primary-600 border-primary-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          캘린더
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-150 ${
            activeTab === 'chat'
              ? 'text-primary-600 border-primary-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          채팅
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {/* Calendar tab */}
        <div
          className={`h-full ${
            activeTab === 'calendar' ? 'block' : 'hidden'
          }`}
        >
          <div className="h-full overflow-y-auto bg-white">
            <CalendarView
              currentDate={currentDate}
              view={calendarView}
              schedules={[]}
              onViewChange={handleViewChange}
              onDateChange={(date) => {
                const dateString = date.toISOString().split('T')[0];
                setSelectedDate(dateString);
              }}
              onDateClick={handleDateClick}
            />
          </div>
        </div>

        {/* Chat tab */}
        <div
          className={`h-[calc(100vh-8rem)] ${
            activeTab === 'chat' ? 'flex' : 'hidden'
          } flex-col`}
        >
          <ChatPanel
            teamId={teamId}
            date={selectedDate}
            isLeader={isLeader}
          />
        </div>
      </div>
    </div>
  );
}
