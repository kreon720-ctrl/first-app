'use client';

import React from 'react';
import { useMessages } from '@/hooks/query/useMessages';
import { useTeamDetail } from '@/hooks/query/useTeams';
import { useWorkPermissions } from '@/hooks/query/useWorkPermissions';
import { useNoticeStore } from '@/store/noticeStore';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { WorkPermissionModal } from './WorkPermissionModal';
import { NoticeBanner } from './NoticeBanner';
import { useChatPanel } from './useChatPanel';
import type { TeamMember } from '@/types/team';

interface ChatPanelProps {
  teamId: string;
  date?: string;
  isLeader?: boolean;
}

export function ChatPanel({ teamId, date, isLeader = false }: ChatPanelProps) {
  const { data, isLoading, isError } = useMessages(teamId, date);
  const { data: teamDetail } = useTeamDetail(isLeader ? teamId : '');
  const { data: permData } = useWorkPermissions(teamId);
  const noticeStore = useNoticeStore();
  const notices = noticeStore.getTeamNotices(teamId);

  const members: TeamMember[] = teamDetail?.members ?? [];
  const serverPermittedIds: string[] = permData?.permittedUserIds ?? [];

  const {
    sendMessage,
    setPermissions,
    currentUser,
    showModal,
    draftIds,
    handleOpenModal,
    toggleDraft,
    handleCloseModal,
    handleSend,
    handleDeleteNotice,
  } = useChatPanel({ teamId, date, members, serverPermittedIds });

  const messages = data?.messages || [];

  const canDeleteNotice = (senderId: string) => {
    if (!currentUser) return false;
    return isLeader || currentUser.id === senderId;
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
        className="px-2.5 py-1 text-xs font-medium border border-gray-300 dark:border-dark-border rounded hover:bg-gray-50 dark:hover:bg-dark-surface text-gray-700 dark:text-dark-text-muted bg-white dark:bg-dark-surface"
      >
        관리자
      </button>
    </div>
  ) : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* 고정 공지사항 배너 */}
      <NoticeBanner
        notices={notices}
        canDelete={canDeleteNotice}
        onDelete={handleDeleteNotice}
      />

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse">
              <p className="text-sm text-gray-500 dark:text-dark-text-muted">메시지 로딩 중...</p>
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

      {/* 입력창 */}
      <ChatInput
        onSend={handleSend}
        isPending={sendMessage.isPending}
        maxContentLength={2000}
      />

      {/* Polling indicator */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-dark-base border-t border-gray-200 dark:border-dark-border">
        <p className="text-xs text-gray-400 dark:text-dark-text-disabled text-center">
          * 3초마다 자동 갱신
        </p>
      </div>

      {/* 업무보고 보기 권한부여 팝업 */}
      {showModal && (
        <WorkPermissionModal
          members={members}
          draftIds={draftIds}
          isSaving={setPermissions.isPending}
          onToggle={toggleDraft}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
