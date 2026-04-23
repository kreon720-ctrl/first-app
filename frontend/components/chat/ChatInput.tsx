'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/common/Button';

export type ChatMessageMode = 'NORMAL' | 'WORK_PERFORMANCE' | 'NOTICE';

interface ChatInputProps {
  onSend: (content: string, mode: ChatMessageMode) => void;
  isPending?: boolean;
  maxContentLength?: number;
}

export function ChatInput({ onSend, isPending = false, maxContentLength = 2000 }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<ChatMessageMode>('NORMAL');

  const isValidContent = content.trim().length > 0 && content.length <= maxContentLength;

  const handleSend = () => {
    if (!isValidContent || isPending) return;
    onSend(content.trim(), mode);
    setContent('');
    setMode('NORMAL');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMode = (target: ChatMessageMode) => {
    setMode((prev) => (prev === target ? 'NORMAL' : target));
  };

  return (
    <div className="w-full bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border p-4">
      {/* Mode indicator */}
      {mode === 'WORK_PERFORMANCE' && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-300 px-3 py-2">
          <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-semibold text-teal-700">업무보고 모드</span>
          <button type="button" onClick={() => setMode('NORMAL')} className="ml-auto text-xs text-teal-600 hover:text-teal-700">취소</button>
        </div>
      )}
      {mode === 'NOTICE' && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-300 px-3 py-2">
          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 002-2H8a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold text-orange-700">공지사항 모드</span>
          <button type="button" onClick={() => setMode('NORMAL')} className="ml-auto text-xs text-orange-600 hover:text-orange-700">취소</button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-stretch gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'WORK_PERFORMANCE'
              ? '업무보고를 입력하세요...'
              : mode === 'NOTICE'
              ? '공지사항을 입력하세요...'
              : '메시지를 입력하세요...'
          }
          className="flex-1 h-full border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-base px-4 py-2.5 text-sm font-normal text-gray-800 dark:text-dark-text placeholder:text-gray-400 dark:placeholder:text-dark-text-disabled shadow-sm resize-none transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-accent focus:border-transparent disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          disabled={isPending}
          maxLength={maxContentLength}
          rows={4}
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

          {/* 업무보고 toggle */}
          <button
            type="button"
            onClick={() => toggleMode('WORK_PERFORMANCE')}
            className={`
              inline-flex items-center justify-center gap-1 rounded-lg py-1.5 px-3 text-xs font-medium transition-colors duration-150
              ${mode === 'WORK_PERFORMANCE'
                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                : 'bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-dark-text-muted hover:bg-gray-200 dark:hover:bg-dark-surface'
              }
            `}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            업무보고
          </button>

          {/* 공지사항 toggle */}
          <button
            type="button"
            onClick={() => toggleMode('NOTICE')}
            className={`
              inline-flex items-center justify-center gap-1 rounded-lg py-1.5 px-3 text-xs font-medium transition-colors duration-150
              ${mode === 'NOTICE'
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-dark-text-muted hover:bg-gray-200 dark:hover:bg-dark-surface'
              }
            `}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 002-2H8a2 2 0 002 2z" />
            </svg>
            공지사항
          </button>
        </div>
      </div>

      {/* Character count */}
      <div className="mt-2 text-xs text-gray-400 dark:text-dark-text-disabled text-right">
        {content.length} / {maxContentLength}자
      </div>
    </div>
  );
}
