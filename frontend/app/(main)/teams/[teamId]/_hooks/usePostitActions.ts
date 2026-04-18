'use client';

import { useState } from 'react';
import { useCreatePostit, useUpdatePostitContent, useDeletePostit } from '@/hooks/query/usePostits';
import type { ScheduleColor } from '@/types/schedule';

interface UsePostitActionsOptions {
  teamId: string;
  isDesktop: boolean;
  calendarView: string;
  onDateSelect: (dateString: string) => void;
}

export function usePostitActions({
  teamId,
  isDesktop,
  calendarView,
  onDateSelect,
}: UsePostitActionsOptions) {
  const [selectedPostitColor, setSelectedPostitColor] = useState<ScheduleColor | null>(null);
  const [postitError, setPostitError] = useState<string | null>(null);

  const createPostit = useCreatePostit(teamId);
  const updatePostitContent = useUpdatePostitContent(teamId);
  const deletePostitMutation = useDeletePostit(teamId);

  const handleDateClick = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // PC 월간뷰 + 포스트잇 색상 선택 중이면 포스트잇 생성
    if (isDesktop && calendarView === 'month' && selectedPostitColor) {
      const colorToCreate = selectedPostitColor;
      setSelectedPostitColor(null);
      createPostit.mutate(
        { date: dateString, color: colorToCreate },
        {
          onError: (err) => {
            const msg = err instanceof Error ? err.message : '포스트잇 생성에 실패했습니다.';
            setPostitError(msg);
            setTimeout(() => setPostitError(null), 4000);
          },
        }
      );
      return;
    }

    onDateSelect(dateString);
  };

  const handlePostitDelete = (id: string, date: string) => {
    deletePostitMutation.mutate({ postitId: id, date });
  };

  const handlePostitContentChange = (id: string, content: string) => {
    updatePostitContent.mutate({ postitId: id, content });
  };

  return {
    selectedPostitColor,
    postitError,
    setSelectedPostitColor,
    handleDateClick,
    handlePostitDelete,
    handlePostitContentChange,
  };
}
