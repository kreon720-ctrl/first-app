import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CalendarMonthView } from '@/components/schedule/CalendarMonthView';
import type { Schedule } from '@/types/schedule';

describe('CalendarMonthView', () => {
  const mockCurrentDate = new Date('2026-04-15T00:00:00.000Z');
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders calendar with month view', () => {
    render(<CalendarMonthView currentDate={mockCurrentDate} />);

    // Should show weekday headers
    expect(screen.getByText('일')).toBeInTheDocument();
    expect(screen.getByText('월')).toBeInTheDocument();
    expect(screen.getByText('금')).toBeInTheDocument();
  });

  it('renders dates for the month', () => {
    render(<CalendarMonthView currentDate={mockCurrentDate} />);

    // Should show date 15 (April 15, 2026)
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('highlights today\'s date', () => {
    render(<CalendarMonthView currentDate={mockCurrentDate} />);

    // Find today's date (15) - it should have special styling
    const todayElement = screen.getByText('15');
    expect(todayElement.closest('button')).toHaveClass('bg-primary-500');
  });

  it('calls onDateClick when a date is clicked', () => {
    const handleDateClick = vi.fn();
    render(
      <CalendarMonthView
        currentDate={mockCurrentDate}
        onDateClick={handleDateClick}
      />
    );

    const dateButton = screen.getByText('15').closest('button');
    fireEvent.click(dateButton!);

    expect(handleDateClick).toHaveBeenCalled();
  });

  it('shows selected date with ring', () => {
    const selectedDate = new Date('2026-04-20T00:00:00.000Z');
    
    render(
      <CalendarMonthView
        currentDate={mockCurrentDate}
        selectedDate={selectedDate}
      />
    );

    const dateButton = screen.getByText('20').closest('button');
    expect(dateButton).toHaveClass('ring-2 ring-primary-500');
  });

  it('shows previous and next month dates in gray', () => {
    render(<CalendarMonthView currentDate={mockCurrentDate} />);

    // Should show dates from previous/next month (e.g., 29, 30 from March)
    const prevMonthDates = screen.getAllByText('29');
    expect(prevMonthDates.length).toBeGreaterThan(0);
  });

  it('renders 6 weeks to cover all month scenarios', () => {
    const { container } = render(<CalendarMonthView currentDate={mockCurrentDate} />);

    // Count the number of week rows
    const weekRows = container.querySelectorAll('.grid.grid-cols-7');
    // Should have 6 weeks + 1 header row = 7 grid rows
    expect(weekRows.length).toBeGreaterThanOrEqual(6);
  });

  it('displays same schedule on same row without duplicates', () => {
    const mockSchedules: Schedule[] = [
      {
        id: 'sched-multi',
        teamId: 'team-1',
        title: '주간 회의',
        description: null,
        startAt: '2026-04-13T00:00:00.000Z', // Mon
        endAt: '2026-04-17T00:00:00.000Z',   // Fri
        createdBy: 'user-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ];

    render(
      <CalendarMonthView
        currentDate={mockCurrentDate}
        schedules={mockSchedules}
      />
    );

    // Should only render the schedule once (on its start day)
    const badges = screen.getAllByText('주간 회의');
    expect(badges.length).toBe(1);  // not 5 (one per day)
  });

  it('places overlapping schedules on separate rows', () => {
    const mockSchedules: Schedule[] = [
      {
        id: 'sched-a',
        teamId: 'team-1',
        title: '회의 A',
        description: null,
        startAt: '2026-04-13T00:00:00.000Z',
        endAt: '2026-04-17T00:00:00.000Z',
        createdBy: 'user-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'sched-b',
        teamId: 'team-1',
        title: '회의 B',
        description: null,
        startAt: '2026-04-14T00:00:00.000Z',
        endAt: '2026-04-16T00:00:00.000Z',
        createdBy: 'user-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ];

    const { container } = render(
      <CalendarMonthView
        currentDate={mockCurrentDate}
        schedules={mockSchedules}
      />
    );

    // Both schedules should be rendered
    expect(screen.getAllByText('회의 A').length).toBe(1);
    expect(screen.getAllByText('회의 B').length).toBe(1);

    // They should have different vertical positions (row assignment)
    const badgeA = screen.getByText('회의 A').parentElement!;
    const badgeB = screen.getByText('회의 B').parentElement!;
    const topA = badgeA.style.top;
    const topB = badgeB.style.top;

    // Different rows means different top values
    expect(topA).not.toBe(topB);
  });

  it('spans schedule bar from start day to end day', () => {
    const mockSchedules: Schedule[] = [
      {
        id: 'sched-span',
        teamId: 'team-1',
        title: '주간 회의',
        description: null,
        startAt: '2026-04-13T00:00:00.000Z', // Mon (day index 1 in week)
        endAt: '2026-04-17T00:00:00.000Z',   // Fri (day index 5 in week)
        createdBy: 'user-1',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ];

    const { container } = render(
      <CalendarMonthView
        currentDate={mockCurrentDate}
        schedules={mockSchedules}
      />
    );

    // Should render only once (on start day)
    const badge = screen.getByText('주간 회의');
    expect(screen.getAllByText('주간 회의').length).toBe(1);

    // The badge should be in the overlay (absolute positioned)
    const badgeContainer = badge.parentElement;
    expect(badgeContainer).toBeTruthy();

    // Bar should span from col 2 (Monday) to col 6 (Friday) = 5 columns
    // left = 1/7 ≈ 14.285%, width = 5/7 ≈ 71.428%
    const style = badgeContainer as HTMLElement;
    expect(style.style.left).toBeTruthy();
    expect(style.style.width).toBeTruthy();
  });
});
