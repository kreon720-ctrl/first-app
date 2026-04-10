import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CalendarDayView } from '@/components/schedule/CalendarDayView';
import type { Schedule } from '@/types/schedule';

describe('CalendarDayView', () => {
  const mockCurrentDate = new Date('2026-04-15T00:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders day view with date', () => {
    render(<CalendarDayView currentDate={mockCurrentDate} />);

    // Should show date information
    expect(screen.getByText(/2026년/)).toBeInTheDocument();
  });

  it('shows schedule count header', () => {
    const mockSchedules: Schedule[] = [
      {
        id: 'schedule-1',
        teamId: 'team-1',
        title: '회의',
        description: null,
        startAt: '2026-04-15T00:00:00.000Z',
        endAt: '2026-04-15T01:00:00.000Z',
        createdBy: 'user-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ];

    render(
      <CalendarDayView
        currentDate={mockCurrentDate}
        schedules={mockSchedules}
      />
    );

    expect(screen.getByText(/일정/)).toBeInTheDocument();
  });

  it('shows empty state when no schedules', () => {
    render(<CalendarDayView currentDate={mockCurrentDate} schedules={[]} />);

    expect(screen.getByText('일정이 없습니다.')).toBeInTheDocument();
  });
});
