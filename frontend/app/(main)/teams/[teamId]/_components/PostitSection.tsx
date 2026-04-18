'use client';

// PostitSection: 포스트잇 에러 토스트 렌더링 담당
// 포스트잇 CRUD 로직은 usePostitActions 훅에 있으며, 실제 포스트잇 UI는 CalendarView -> CalendarMonthView 내에 통합되어 있음.

import React from 'react';

interface PostitSectionProps {
  postitError: string | null;
}

export function PostitSection({ postitError }: PostitSectionProps) {
  if (!postitError) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
      {postitError}
    </div>
  );
}
