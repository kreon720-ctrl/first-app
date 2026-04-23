'use client';

import React from 'react';
import type { ScheduleColor } from '@/types/schedule';
import { SCHEDULE_COLORS } from '@/types/schedule';

interface PostItColorPaletteProps {
  selectedColor: ScheduleColor | null;
  onSelect: (color: ScheduleColor | null) => void;
}

const COLOR_BG: Record<ScheduleColor, string> = {
  amber:   '#fde68a',
  indigo:  '#c7d2fe',
  blue:    '#bfdbfe',
  emerald: '#a7f3d0',
  rose:    '#fecdd3',
};

const COLOR_BORDER: Record<ScheduleColor, string> = {
  amber:   '#f59e0b',
  indigo:  '#6366f1',
  blue:    '#3b82f6',
  emerald: '#10b981',
  rose:    '#f43f5e',
};

export function PostItColorPalette({ selectedColor, onSelect }: PostItColorPaletteProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-gray-500 dark:text-dark-text-muted mr-0.5 whitespace-nowrap">
        {selectedColor ? '날짜클릭' : '포스트잇'}
      </span>
      {SCHEDULE_COLORS.map(color => (
        <button
          key={color}
          type="button"
          title={`${color} 포스트잇 추가`}
          onClick={() => onSelect(selectedColor === color ? null : color)}
          className="w-4 h-4 rounded-sm transition-transform hover:scale-110 flex-shrink-0"
          style={{
            background: COLOR_BG[color],
            border: selectedColor === color
              ? `2px solid #6b7280`
              : `1.5px solid ${COLOR_BORDER[color]}`,
            transform: selectedColor === color ? 'scale(1.15)' : undefined,
            boxShadow: selectedColor === color ? '0 0 0 1px #6b7280' : undefined,
          }}
        />
      ))}
    </div>
  );
}
