import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CalendarWeekView } from '@/components/schedule/CalendarWeekView';
import type { Schedule } from '@/types/schedule';

describe('CalendarWeekView', () => {
  const mockCurrentDate = new Date('2026-04-15T00:00:00.000Z'); // Wednesday
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders week view with weekday headers', () => {
    render(<CalendarWeekView currentDate={mockCurrentDate} />);

    // Should show all weekday headers
    expect(screen.getByText('일')).toBeInTheDocument();
    expect(screen.getByText('월')).toBeInTheDocument();
    expect(screen.getByText('수')).toBeInTheDocument();
    expect(screen.getByText('토')).toBeInTheDocument();
  });

  it('renders dates for the current week', () => {
    render(<CalendarWeekView currentDate={mockCurrentDate} />);

    // Should show Wednesday the 15th
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('highlights today\'s date', () => {
    render(<CalendarWeekView currentDate={mockCurrentDate} />);

    // Find today's date header - it should have special styling
    const todayHeader = screen.getByText('15');
    expect(todayHeader.closest('button')).toHaveClass('bg-primary-500');
  });

  it('calls onDateClick when a date header is clicked', () => {
    const handleDateClick = vi.fn();
    
    render(
      <CalendarWeekView
        currentDate={mockCurrentDate}
        onDateClick={handleDateClick}
      />
    );

    const dateHeader = screen.getByText('15').closest('button');
    fireEvent.click(dateHeader!);

    expect(handleDateClick).toHaveBeenCalled();
  });

  it('displays 7 days in week view', () => {
    const { container } = render(<CalendarWeekView currentDate={mockCurrentDate} />);

    // Count date buttons in header (WeekView uses flex layout, not grid)
    const dateButtons = container.querySelectorAll('.flex.mb-1 button');
    expect(dateButtons.length).toBe(7);
  });

  it('renders 24-hour timeline', () => {
    const { container } = render(<CalendarWeekView currentDate={mockCurrentDate} />);

    // Should show all 24 hours
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByText('23:00')).toBeInTheDocument();
  });

  it('shows selected date with ring', () => {
    const selectedDate = new Date('2026-04-16T00:00:00.000Z');
    
    render(
      <CalendarWeekView
        currentDate={mockCurrentDate}
        selectedDate={selectedDate}
      />
    );

    const dateHeader = screen.getByText('16').closest('button');
    expect(dateHeader).toHaveClass('ring-2 ring-primary-500');
  });

  it('shows Sunday first in week', () => {
    render(<CalendarWeekView currentDate={mockCurrentDate} />);

    const firstDay = screen.getByText('일');
    const weekdayHeaders = screen.getAllByText(/^[일월화수목금토]$/);

    // First weekday header should be Sunday
    expect(weekdayHeaders[0]).toBe(firstDay);
  });

  it('sorts multi-day schedules by endAt ascending in all-day section', () => {
    const mockSchedules: Schedule[] = [
      {
        id: 'sched-long',
        teamId: 'team-1',
        title: '긴 회의',
        description: null,
        startAt: '2026-04-13T00:00:00.000Z', // Mon
        endAt: '2026-04-20T00:00:00.000Z',   // Mon (later end)
        createdBy: 'user-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'sched-short',
        teamId: 'team-1',
        title: '짧은 회의',
        description: null,
        startAt: '2026-04-13T00:00:00.000Z', // Mon
        endAt: '2026-04-17T00:00:00.000Z',   // Fri (earlier end)
        createdBy: 'user-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ];

    const { container } = render(
      <CalendarWeekView
        currentDate={mockCurrentDate}
        schedules={mockSchedules}
      />
    );

    // Both schedules should be rendered once each (no duplicates)
    const longBadges = screen.getAllByText('긴 회의');
    const shortBadges = screen.getAllByText('짧은 회의');
    expect(longBadges.length).toBe(1);  // rendered once, not per day
    expect(shortBadges.length).toBe(1);  // rendered once, not per day

    // Check order in DOM: shorter schedule (ends earlier) should appear first (top row)
    const scheduleBadges = container.querySelectorAll('[title$="회의"]');
    expect(scheduleBadges.length).toBe(2);
    expect(scheduleBadges[0].getAttribute('title')).toBe('짧은 회의');  // ends earlier → top row
    expect(scheduleBadges[1].getAttribute('title')).toBe('긴 회의');    // ends later → bottom row
  });
});
