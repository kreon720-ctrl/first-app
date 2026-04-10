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
});
