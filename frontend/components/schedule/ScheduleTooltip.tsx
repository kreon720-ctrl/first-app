'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Schedule } from '@/types/schedule';
import { formatTime } from '@/lib/utils/timezone';

interface Props {
  schedule: Schedule;
  x: number;
  y: number;
}

export function ScheduleTooltip({ schedule, x, y }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  // 화면 오른쪽/아래 경계 벗어나지 않도록 조정
  const left = x + 14;
  const top  = y + 14;

  return createPortal(
    <div
      className="fixed z-[9999] bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-xl shadow-xl p-3 w-64 pointer-events-none"
      style={{ left, top }}
    >
      <p className="font-semibold text-sm text-gray-900 dark:text-dark-text break-words">{schedule.title}</p>
      <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
        {formatTime(new Date(schedule.startAt))} ~ {formatTime(new Date(schedule.endAt))}
      </p>
      {schedule.description && (
        <p className="text-xs text-gray-600 dark:text-dark-text-muted mt-1.5 break-words whitespace-pre-wrap">
          {schedule.description}
        </p>
      )}
    </div>,
    document.body,
  );
}
