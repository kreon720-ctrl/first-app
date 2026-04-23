'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { AIAssistantButton } from '@/components/common/AIAssistantButton';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface TeamPageHeaderProps {
  teamName: string;
  currentUserName: string | undefined;
  isLeader: boolean;
  pendingCount: number;
  isDesktop: boolean;
  onNavigateHome: () => void;
  onNavigateToTasks: () => void;
  onLogout: () => void;
}

export function TeamPageHeader({
  teamName,
  currentUserName,
  isLeader,
  pendingCount,
  isDesktop,
  onNavigateHome,
  onNavigateToTasks,
  onLogout,
}: TeamPageHeaderProps) {
  if (isDesktop) {
    return (
      <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 sticky top-0 z-30 dark:bg-dark-surface dark:border-dark-border">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150 dark:hover:bg-dark-elevated"
            aria-label="홈"
          >
            <svg className="w-6 h-6 text-gray-700 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate dark:text-dark-text">{teamName}</h1>
        </div>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 select-none flex items-center gap-2 cursor-pointer">
          {/* AI brain / neural network icon */}
          <svg className="w-6 h-6 text-gray-500 dark:text-[#FFB800] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* 중앙 코어 */}
            <circle cx="12" cy="12" r="2.2" />
            {/* 상단 노드 */}
            <circle cx="12" cy="3.5" r="1.3" />
            <line x1="12" y1="4.8" x2="12" y2="9.8" />
            {/* 우상단 노드 */}
            <circle cx="19.5" cy="6.5" r="1.3" />
            <line x1="18.5" y1="7.5" x2="13.8" y2="10.8" />
            {/* 우하단 노드 */}
            <circle cx="19.5" cy="17.5" r="1.3" />
            <line x1="18.5" y1="16.5" x2="13.8" y2="13.2" />
            {/* 하단 노드 */}
            <circle cx="12" cy="20.5" r="1.3" />
            <line x1="12" y1="19.2" x2="12" y2="14.2" />
            {/* 좌하단 노드 */}
            <circle cx="4.5" cy="17.5" r="1.3" />
            <line x1="5.5" y1="16.5" x2="10.2" y2="13.2" />
            {/* 좌상단 노드 */}
            <circle cx="4.5" cy="6.5" r="1.3" />
            <line x1="5.5" y1="7.5" x2="10.2" y2="10.8" />
          </svg>
          <span className="text-xl font-bold tracking-widest text-gray-900 dark:text-dark-text">TEAM WORKS</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <img src="/user.png" alt="user" className="w-5 h-5 opacity-50 dark:invert dark:opacity-75" />
              <span className="text-sm font-normal text-gray-600 dark:text-dark-text-muted">{currentUserName}</span>
            </div>
            {isLeader && pendingCount > 0 && (
              <button
                type="button"
                onClick={onNavigateToTasks}
                className="absolute -top-2 -right-4 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 hover:bg-red-600 transition-colors"
                title="승인 대기 건수"
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </button>
            )}
          </div>
          <AIAssistantButton />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLogout}
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </span>
          </Button>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  // Mobile header
  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 sticky top-0 z-30 dark:bg-dark-surface dark:border-dark-border">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNavigateHome}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150 dark:hover:bg-dark-elevated"
          aria-label="홈"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900 truncate dark:text-dark-text">{teamName}</h1>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150 dark:hover:bg-dark-elevated"
          aria-label="메뉴"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
