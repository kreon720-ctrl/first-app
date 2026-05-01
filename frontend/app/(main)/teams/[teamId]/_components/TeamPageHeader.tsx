'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface TeamPageHeaderProps {
  teamId: string;
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
  teamId: _teamId,
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
          <div className="relative group">
            <button
              type="button"
              onClick={onNavigateHome}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150 dark:hover:bg-dark-elevated"
              aria-label="팀목록 보기"
            >
              {/* 팀 목록(리스트) 아이콘 — 좌측 점 + 우측 라인 3줄 */}
              <svg className="w-6 h-6 text-gray-700 dark:text-dark-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
                <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
                <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
                <line x1="9" y1="6" x2="20" y2="6" />
                <line x1="9" y1="12" x2="20" y2="12" />
                <line x1="9" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            {/* 빠른 hover 툴팁 — native title 의 1~2초 지연 회피 */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              팀목록 보기
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800 dark:border-b-gray-700" />
            </div>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 truncate dark:text-dark-text">{teamName}</h1>
        </div>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 select-none flex items-center gap-2 cursor-pointer">
          {/* TEAM WORKS 로고 — 라이트:블랙 / 다크:앰버골드(#FFB800) */}
          <span
            role="img"
            aria-label="TEAM WORKS 로고"
            className="block w-[31px] h-[31px] shrink-0 bg-black dark:bg-[#FFB800]"
            style={{
              WebkitMaskImage: 'url(/imgs/logo_v.svg)',
              maskImage: 'url(/imgs/logo_v.svg)',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
            }}
          />
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
    <header className="flex items-center justify-between h-10 px-3 bg-white border-b border-gray-200 sticky top-0 z-30 dark:bg-dark-surface dark:border-dark-border">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="relative group">
          <button
            type="button"
            onClick={onNavigateHome}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors duration-150 dark:hover:bg-dark-elevated"
            aria-label="팀목록 보기"
          >
            {/* 팀 목록(리스트) 아이콘 — 좌측 점 + 우측 라인 3줄 */}
            <svg className="w-5 h-5 text-gray-700 dark:text-dark-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
              <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
              <line x1="9" y1="6" x2="20" y2="6" />
              <line x1="9" y1="12" x2="20" y2="12" />
              <line x1="9" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          {/* 빠른 hover 툴팁 — native title 의 1~2초 지연 회피 */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            팀목록 보기
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800 dark:border-b-gray-700" />
          </div>
        </div>
        <h1 className="text-base font-semibold text-gray-900 truncate dark:text-dark-text">{teamName}</h1>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors duration-150 dark:hover:bg-dark-elevated"
          aria-label="메뉴"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
