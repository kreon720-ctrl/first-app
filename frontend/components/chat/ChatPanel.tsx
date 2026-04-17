'use client';

import React, { useState, useEffect } from 'react';
import { useMessages, useSendMessage } from '@/hooks/query/useMessages';
import { useTeamDetail } from '@/hooks/query/useTeams';
import { useWorkPermissions, useSetWorkPermissions } from '@/hooks/query/useWorkPermissions';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import type { TeamMember } from '@/types/team';

interface ChatPanelProps {
  teamId: string;
  date?: string;
  isLeader?: boolean;
}

export function ChatPanel({ teamId, date, isLeader = false }: ChatPanelProps) {
  const { data, isLoading, isError } = useMessages(teamId, date);
  const sendMessage = useSendMessage(teamId, date);
  const { data: teamDetail } = useTeamDetail(isLeader ? teamId : '');
  const { data: permData } = useWorkPermissions(teamId);
  const setPermissions = useSetWorkPermissions(teamId);

  // 팝업 열림/닫힘
  const [showModal, setShowModal] = useState(false);
  // 팝업 내 임시 체크 상태
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());

  const members: TeamMember[] = teamDetail?.members ?? [];
  const serverPermittedIds: string[] = permData?.permittedUserIds ?? [];

  // 팝업 열 때: 서버 권한 → 팀장만 기본 체크 (서버 값 없으면 팀장만)
  const handleOpenModal = () => {
    if (serverPermittedIds.length > 0) {
      setDraftIds(new Set(serverPermittedIds));
    } else {
      setDraftIds(new Set(members.filter(m => m.role === 'LEADER').map(m => m.userId)));
    }
    setShowModal(true);
  };

  const toggleDraft = (userId: string) => {
    setDraftIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleClose = async () => {
    await setPermissions.mutateAsync(Array.from(draftIds));
    setShowModal(false);
  };

  const messages = data?.messages || [];

  const handleSend = (content: string, type: 'NORMAL' | 'WORK_PERFORMANCE') => {
    sendMessage.mutate({ content, type });
  };

  // 권한 설정 상태 요약 배지
  const filterActive = serverPermittedIds.length > 1 && serverPermittedIds.length < members.length;

  const adminSlot = isLeader ? (
    <div className="flex items-center gap-1.5">
      {filterActive && (
        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {serverPermittedIds.length}명 권한설정
        </span>
      )}
      <button
        onClick={handleOpenModal}
        className="px-2.5 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 text-gray-700 bg-white"
      >
        관리자
      </button>
    </div>
  ) : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Message list — 백엔드에서 이미 권한 필터링된 메시지만 수신 */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">메시지 로딩 중...</p>
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
            <p className="text-sm text-error-500">메시지를 불러오는 중 오류가 발생했습니다.</p>
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            isLeader={isLeader}
            adminSlot={adminSlot}
          />
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        isPending={sendMessage.isPending}
        maxContentLength={2000}
      />

      {/* Polling indicator */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          * 3초마다 자동 갱신
        </p>
      </div>

      {/* 업무실적 보기 권한부여 팝업 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-80 max-h-[70vh] flex flex-col">
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">업무실적 보기 권한부여</h2>
              <p className="text-xs text-gray-400 mt-0.5">체크한 사용자만 업무실적 메시지를 볼 수 있습니다.</p>
            </div>

            {/* 멤버 목록 */}
            <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-2">
              {members.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">팀원이 없습니다.</p>
              ) : (
                members.map(member => (
                  <label
                    key={member.userId}
                    className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-gray-50 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={draftIds.has(member.userId)}
                      onChange={() => toggleDraft(member.userId)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-800">{member.name}</span>
                    {member.role === 'LEADER' && (
                      <span className="ml-auto text-xs text-indigo-400 font-medium">팀장</span>
                    )}
                  </label>
                ))
              )}
            </div>

            {/* 저장 버튼 */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={handleClose}
                disabled={setPermissions.isPending}
                className="w-full py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {setPermissions.isPending ? '저장 중...' : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
