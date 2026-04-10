'use client';

import React from 'react';
import { ChatMessage } from '@/types/chat';
import { ChatMessageItem } from './ChatMessageItem';
import { utcToKST, formatDateKorean } from '@/lib/utils/timezone';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLeader?: boolean;
}

export function ChatMessageList({ messages, isLeader = false }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">아직 메시지가 없습니다.</h3>
        <p className="text-sm font-normal text-gray-400 max-w-xs">
          첫 번째 메시지를 보내보세요.
        </p>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';

  messages.forEach((message) => {
    const sentAtKST = utcToKST(new Date(message.sentAt));
    const dateKey = sentAtKST.toDateString();

    if (dateKey !== currentDate) {
      currentDate = dateKey;
      groupedMessages.push({
        date: formatDateKorean(sentAtKST),
        messages: [message],
      });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  });

  return (
    <div className="flex flex-col">
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-6">
          {/* Date divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
              {group.date}
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Messages for this date */}
          <div className="flex flex-col">
            {group.messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                isLeader={isLeader}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
