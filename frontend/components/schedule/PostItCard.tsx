'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { PostIt } from '@/types/postit';
import type { ScheduleColor } from '@/types/schedule';

interface PostItCardProps {
  postit: PostIt;
  currentUserId: string;
  onDelete: (id: string, date: string) => void;
  onContentChange: (id: string, content: string) => void;
}

const COLOR_STYLES: Record<ScheduleColor, { bg: string; shadow: string; fold: string; text: string; border: string }> = {
  amber:   { bg: '#fde68a', shadow: 'rgba(180,130,0,0.25)',   fold: 'rgba(180,130,0,0.15)',  text: '#78350f', border: '#f59e0b' },
  indigo:  { bg: '#c7d2fe', shadow: 'rgba(79,70,229,0.25)',   fold: 'rgba(79,70,229,0.15)',  text: '#312e81', border: '#6366f1' },
  blue:    { bg: '#bfdbfe', shadow: 'rgba(37,99,235,0.25)',   fold: 'rgba(37,99,235,0.15)',  text: '#1e3a5f', border: '#3b82f6' },
  emerald: { bg: '#a7f3d0', shadow: 'rgba(5,150,105,0.25)',   fold: 'rgba(5,150,105,0.15)', text: '#064e3b', border: '#10b981' },
  rose:    { bg: '#fecdd3', shadow: 'rgba(225,29,72,0.25)',   fold: 'rgba(225,29,72,0.15)',  text: '#881337', border: '#f43f5e' },
};

export function PostItCard({ postit, currentUserId, onDelete, onContentChange }: PostItCardProps) {
  const [localContent, setLocalContent] = useState(postit.content);
  const isCreator = postit.createdBy === currentUserId;
  const style = COLOR_STYLES[postit.color];
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isCreator) return;
    const val = e.target.value;
    setLocalContent(val);
    // 디바운스 자동저장 (1.5초)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onContentChange(postit.id, val);
    }, 1500);
  }, [isCreator, postit.id, onContentChange]);

  const handleBlur = useCallback(() => {
    if (!isCreator) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    onContentChange(postit.id, localContent);
  }, [isCreator, postit.id, localContent, onContentChange]);

  return (
    <div
      className="relative w-[90%] mx-auto mt-1 flex-shrink-0"
      style={{ minHeight: '72px' }}
      onClick={e => e.stopPropagation()}
    >
      {/* 카드 본체 */}
      <div
        className="relative w-full rounded-sm overflow-hidden"
        style={{
          background: style.bg,
          boxShadow: `2px 3px 8px ${style.shadow}, inset 0 -2px 4px rgba(0,0,0,0.04)`,
          minHeight: '72px',
        }}
      >
        {/* 상단 색상 줄 (포스트잇 접착 부분 느낌) */}
        <div
          className="w-full h-1.5 flex-shrink-0"
          style={{ background: style.border, opacity: 0.6 }}
        />

        {/* 내용 영역 */}
        <div className="relative px-2 pt-1.5 pb-5">
          {/* 삭제 버튼 (생성자만) */}
          {isCreator && (
            <button
              type="button"
              onClick={() => onDelete(postit.id, postit.date)}
              className="absolute top-1 right-1 p-0.5 rounded opacity-40 hover:opacity-90 transition-opacity"
              style={{ color: style.text }}
              title="포스트잇 삭제"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          <textarea
            value={localContent}
            onChange={handleChange}
            onBlur={handleBlur}
            readOnly={!isCreator}
            placeholder={isCreator ? '메모를 입력하세요...' : ''}
            rows={2}
            className="w-full bg-transparent resize-none text-xs leading-relaxed outline-none border-none placeholder-current/40"
            style={{
              color: style.text,
              minHeight: '40px',
              cursor: isCreator ? 'text' : 'default',
            }}
          />
        </div>

        {/* 오른쪽 하단 dog-ear 접힘 효과 */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none"
          style={{
            background: `linear-gradient(225deg, rgba(255,255,255,0.55) 50%, transparent 50%)`,
            boxShadow: `-1px -1px 2px ${style.fold}`,
          }}
        />
      </div>
    </div>
  );
}
