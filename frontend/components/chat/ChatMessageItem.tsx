'use client';

import React from 'react';
import { ChatMessage } from '@/types/chat';
import { utcToKST, formatTime } from '@/lib/utils/timezone';

interface ChatMessageItemProps {
  message: ChatMessage;
  isLeader?: boolean;
}

export function ChatMessageItem({ message, isLeader = false }: ChatMessageItemProps) {
  const sentAtKST = utcToKST(new Date(message.sentAt));
  const timeString = formatTime(sentAtKST);
  const isScheduleRequest = message.type === 'SCHEDULE_REQUEST';

  if (isScheduleRequest) {
    return (
      <div className="w-full bg-orange-50 border border-orange-300 rounded-xl p-3 my-1">
        {/* Message header with type badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            일정변경요청
          </span>
          <span className="text-xs font-semibold text-orange-700">
            {message.senderName}
          </span>
          <span className="text-xs text-orange-600">
            {timeString}
          </span>
        </div>

        {/* Message content */}
        <p className="text-sm font-normal text-orange-900 leading-relaxed">
          {message.content}
        </p>
      </div>
    );
  }

  // Normal message
  return (
    <div className="w-full my-1">
      {/* Message header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold text-gray-900">
          {message.senderName}
        </span>
        {isLeader && (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800">
            LEADER
          </span>
        )}
        <span className="text-xs text-gray-400">
          {timeString}
        </span>
      </div>

      {/* Message content */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <p className="text-sm font-normal text-gray-800 leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
}
