'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/common/Button';

interface ChatInputProps {
  onSend: (content: string, type: 'NORMAL' | 'WORK_PERFORMANCE') => void;
  isPending?: boolean;
  maxContentLength?: number;
}

export function ChatInput({ onSend, isPending = false, maxContentLength = 2000 }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'NORMAL' | 'WORK_PERFORMANCE'>('NORMAL');

  const isValidContent = content.trim().length > 0 && content.length <= maxContentLength;

  const handleSend = () => {
    if (!isValidContent || isPending) return;
    
    onSend(content.trim(), messageType);
    setContent('');
    setMessageType('NORMAL');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMessageType = () => {
    setMessageType((prev) =>
      prev === 'NORMAL' ? 'WORK_PERFORMANCE' : 'NORMAL'
    );
  };

  return (
    <div className="w-full bg-white border-t border-gray-200 p-4">
      {/* Message type indicator */}
      {messageType === 'WORK_PERFORMANCE' && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-300 px-3 py-2">
          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs font-semibold text-orange-700">
            업무실적 모드
          </span>
          <button
            type="button"
            onClick={toggleMessageType}
            className="ml-auto text-xs text-orange-600 hover:text-orange-700"
          >
            취소
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            messageType === 'WORK_PERFORMANCE'
              ? '업무실적을 입력하세요...'
              : '메시지를 입력하세요...'
          }
          className="flex-1 border border-gray-300 rounded-xl bg-white px-4 py-2.5 text-sm font-normal text-gray-800 placeholder:text-gray-400 shadow-sm resize-none transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          disabled={isPending}
          maxLength={maxContentLength}
          rows={2}
        />

        <div className="flex flex-col gap-2">
          {/* Send button */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!isValidContent || isPending}
            loading={isPending}
          >
            전송
          </Button>

          {/* Schedule request toggle */}
          <button
            type="button"
            onClick={toggleMessageType}
            className={`
              inline-flex items-center justify-center gap-1 rounded-lg py-1.5 px-3 text-xs font-medium transition-colors duration-150
              ${messageType === 'WORK_PERFORMANCE'
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            업무실적
          </button>
        </div>
      </div>

      {/* Character count */}
      <div className="mt-2 text-xs text-gray-400 text-right">
        {content.length} / {maxContentLength}자
      </div>
    </div>
  );
}
