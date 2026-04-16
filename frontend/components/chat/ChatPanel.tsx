'use client';

import React from 'react';
import { useMessages, useSendMessage } from '@/hooks/query/useMessages';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  teamId: string;
  date?: string;
  isLeader?: boolean;
}

export function ChatPanel({ teamId, date, isLeader = false }: ChatPanelProps) {
  const { data, isLoading, isError } = useMessages(teamId, date);
  const sendMessage = useSendMessage(teamId, date);

  const messages = data?.messages || [];

  const handleSend = (content: string, type: 'NORMAL' | 'WORK_PERFORMANCE') => {
    sendMessage.mutate({ content, type });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
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
          <ChatMessageList messages={messages} isLeader={isLeader} />
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
    </div>
  );
}
