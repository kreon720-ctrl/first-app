'use client';

import React from 'react';
import { Team } from '@/types/team';
import { utcToKST, formatDate } from '@/lib/utils/timezone';

interface TeamCardProps {
  team: Team;
  onClick?: (teamId: string) => void;
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  const kstDate = utcToKST(new Date(team.createdAt));
  const formattedDate = formatDate(kstDate);
  const roleLabel = team.myRole;
  const roleBadgeClass =
    team.myRole === 'LEADER'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-indigo-100 text-indigo-800';

  return (
    <button
      type="button"
      onClick={() => onClick?.(team.id)}
      className="w-full bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-gray-300 active:bg-gray-50 transition-all duration-150 cursor-pointer text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 truncate">{team.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadgeClass}`}
            >
              {roleLabel}
            </span>
            <span className="text-xs font-normal text-gray-500">{formattedDate}</span>
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  );
}
