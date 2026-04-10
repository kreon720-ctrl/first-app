'use client';

import React, { useState } from 'react';
import { PublicTeam } from '@/types/team';
import { apiClient, ApiError } from '@/lib/apiClient';
import { Button } from '@/components/common/Button';

interface TeamExploreListProps {
  teams: PublicTeam[];
  onSuccess?: (teamId: string) => void;
}

export function TeamExploreList({ teams, onSuccess }: TeamExploreListProps) {
  const [pendingTeams, setPendingTeams] = useState<Set<string>>(new Set());
  const [successMessages, setSuccessMessages] = useState<Record<string, string>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoinRequest = async (team: PublicTeam) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/api/teams/${team.id}/join-requests`, {});
      
      setPendingTeams((prev) => new Set(prev).add(team.id));
      setSuccessMessages((prev) => ({
        ...prev,
        [team.id]: `${team.name}에 가입 신청를 완료했습니다. 팀장의 승인을 기다려주세요.`,
      }));
      
      onSuccess?.(team.id);
    } catch (err: unknown) {
      const errMsg = err instanceof ApiError || err instanceof Error ? err.message : undefined;
      if (err instanceof ApiError && err.status === 409) {
        setErrorMessages((prev) => ({
          ...prev,
          [team.id]: errMsg || '이미 가입 신청이 진행 중이거나 구성원입니다.',
        }));
      } else {
        setErrorMessages((prev) => ({
          ...prev,
          [team.id]: errMsg || '가입 신청 중 오류가 발생했습니다.',
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2 2 2 0 002 2v1a2 2 0 01-2 2H3.055M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">공개된 팀이 없습니다.</h3>
        <p className="text-sm font-normal text-gray-400 max-w-xs">
          새로운 팀을 만들어보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {teams.map((team) => {
        const isPending = pendingTeams.has(team.id);
        const isSuccess = successMessages[team.id];
        const isError = errorMessages[team.id];

        return (
          <div
            key={team.id}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-800 truncate">{team.name}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-normal text-gray-600">
                    팀장: {team.leaderName}
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    {team.memberCount}명
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isPending || isSubmitting}
                onClick={() => handleJoinRequest(team)}
              >
                {isPending ? '신청 완료' : '가입 신청'}
              </Button>
            </div>

            {isSuccess && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-50 p-2 text-xs text-success-500" role="status">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {isSuccess}
              </div>
            )}

            {isError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-error-50 p-2 text-xs text-error-500" role="alert">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {isError}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
