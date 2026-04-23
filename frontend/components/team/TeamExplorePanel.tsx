'use client';

import React from 'react';
import { usePublicTeams } from '@/hooks/query/useTeams';
import { TeamExploreList } from '@/components/team/TeamExploreList';

interface TeamExplorePanelProps {
  onSuccess?: (teamId: string) => void;
}

/**
 * Shared body for the "팀 탐색" experience. Used by the standalone page
 * (`/teams/explore`) and the home page modal so both render identical state.
 */
export function TeamExplorePanel({ onSuccess }: TeamExplorePanelProps) {
  const { data, isLoading, isError } = usePublicTeams();
  const teams = data?.teams || [];

  return (
    <div className="w-full">
      <p className="text-base font-normal text-gray-600 dark:text-dark-text-muted mb-4">
        원하는 팀을 찾아 가입하세요.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse">
            <p className="text-sm text-gray-500 dark:text-dark-text-muted">로딩 중...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <svg className="w-12 h-12 text-error-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-error-500">팀 목록을 불러오는 중 오류가 발생했습니다.</p>
        </div>
      ) : (
        <TeamExploreList teams={teams} onSuccess={onSuccess} />
      )}
    </div>
  );
}
