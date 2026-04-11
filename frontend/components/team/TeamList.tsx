'use client';

import React from 'react';
import { Team } from '@/types/team';
import { TeamCard } from './TeamCard';

interface TeamListProps {
  teams: Team[];
  onTeamClick?: (teamId: string) => void;
  onUpdateTeam?: (teamId: string, data: { name: string; description: string }) => void;
  onDeleteTeam?: (teamId: string) => void;
  emptyMessage?: string;
}

export function TeamList({ teams, onTeamClick, onUpdateTeam, onDeleteTeam, emptyMessage = '아직 팀이 없습니다.' }: TeamListProps) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">{emptyMessage}</h3>
        <p className="text-sm font-normal text-gray-400 max-w-xs">
          팀을 생성하거나 원하는 팀에 가입 신청해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          onClick={onTeamClick}
          onUpdate={onUpdateTeam}
          onDelete={onDeleteTeam}
        />
      ))}
    </div>
  );
}
