'use client';

import React from 'react';
import type { TeamMember } from '@/types/team';

interface WorkPermissionModalProps {
  members: TeamMember[];
  draftIds: Set<string>;
  isSaving: boolean;
  onToggle: (userId: string) => void;
  onClose: () => void;
}

export function WorkPermissionModal({
  members,
  draftIds,
  isSaving,
  onToggle,
  onClose,
}: WorkPermissionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70">
      <div className="bg-white dark:bg-dark-elevated dark:border dark:border-dark-border rounded-xl shadow-xl w-80 max-h-[70vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-text">업무보고 보기 권한부여</h2>
          <p className="text-xs text-gray-400 dark:text-dark-text-disabled mt-0.5">체크한 사용자만 업무보고 메시지를 볼 수 있습니다.</p>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-2">
          {members.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-dark-text-muted py-4 text-center">팀원이 없습니다.</p>
          ) : (
            members.map(member => (
              <label
                key={member.userId}
                className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface select-none"
              >
                <input
                  type="checkbox"
                  checked={draftIds.has(member.userId)}
                  onChange={() => onToggle(member.userId)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
                <span className="text-sm text-gray-800 dark:text-dark-text">{member.name}</span>
                {member.role === 'LEADER' && (
                  <span className="ml-auto text-xs text-indigo-400 font-medium">팀장</span>
                )}
              </label>
            ))
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 dark:border-dark-border">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-full py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
}
