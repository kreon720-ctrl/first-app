'use client';

import React from 'react';
import type { Notice } from '@/store/noticeStore';
import { utcToKST, formatTime, formatDateKorean } from '@/lib/utils/timezone';

interface NoticeBannerProps {
  notices: Notice[];
  canDelete: (senderId: string) => boolean;
  onDelete: (noticeId: string) => void;
}

export function NoticeBanner({ notices, canDelete, onDelete }: NoticeBannerProps) {
  if (notices.length === 0) return null;

  return (
    <div className="flex-none border-b border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30">
      {notices.map((notice) => {
        const createdKST = utcToKST(new Date(notice.createdAt));
        const dateStr = formatDateKorean(createdKST);
        const timeStr = formatTime(createdKST);
        return (
          <div key={notice.id} className="relative px-4 py-2.5 border-b border-orange-100 dark:border-orange-900/40 last:border-b-0">
            {/* 삭제 버튼 */}
            {canDelete(notice.senderId) && (
              <button
                type="button"
                onClick={() => onDelete(notice.id)}
                className="absolute top-2 right-3 text-orange-400 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                title="공지사항 삭제"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {/* 헤더 */}
            <div className="flex items-center gap-1.5 mb-1 pr-5">
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 002-2H8a2 2 0 002 2z" />
                </svg>
                공지사항
              </span>
              <span className="text-xs font-semibold text-orange-800 dark:text-orange-200">{notice.senderName}</span>
              <span className="text-[10px] text-orange-500 dark:text-orange-400">{dateStr} {timeStr}</span>
            </div>
            {/* 내용 */}
            <p className="text-xs text-orange-900 dark:text-orange-100 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
          </div>
        );
      })}
    </div>
  );
}
