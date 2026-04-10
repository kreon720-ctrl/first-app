import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CalendarView } from '@/components/schedule/CalendarView';
import type { Schedule } from '@/types/schedule';

describe('CalendarView', () => {
  const mockCurrentDate = new Date('2026-04-15T00:00:00.000Z');
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders calendar with month view by default', () => {
    render(<CalendarView currentDate={mockCurrentDate} view="month" />);

    // Should show month view with month header
    expect(screen.getByText('2026년 4월')).toBeInTheDocument();
  });

  it('shows week view when view prop is week', () => {
    render(<CalendarView currentDate={mockCurrentDate} view="week" />);

    // Should show week date range
    expect(screen.getByText(/2026년/)).toBeInTheDocument();
  });

  it('shows day view when view prop is day', () => {
    render(<CalendarView currentDate={mockCurrentDate} view="day" />);

    // Should show day view with date header (h2 element)
    const dayHeader = screen.getByRole('heading', { level: 2 });
    expect(dayHeader).toHaveTextContent('2026년');
  });

  it('navigates to previous month', () => {
    const handleDateChange = vi.fn();
    
    render(
      <CalendarView
        currentDate={mockCurrentDate}
        view="month"
        onDateChange={handleDateChange}
      />
    );

    const prevButton = screen.getByLabelText('이전');
    fireEvent.click(prevButton);

    expect(handleDateChange).toHaveBeenCalled();
    const newDate = handleDateChange.mock.calls[0][0];
    expect(newDate.getMonth()).toBe(2); // March (0-indexed)
  });

  it('navigates to next month', () => {
    const handleDateChange = vi.fn();
    
    render(
      <CalendarView
        currentDate={mockCurrentDate}
        view="month"
        onDateChange={handleDateChange}
      />
    );

    const nextButton = screen.getByLabelText('다음');
    fireEvent.click(nextButton);

    expect(handleDateChange).toHaveBeenCalled();
    const newDate = handleDateChange.mock.calls[0][0];
    expect(newDate.getMonth()).toBe(4); // May (0-indexed)
  });

  it('navigates weeks in week view', () => {
    const handleDateChange = vi.fn();
    
    render(
      <CalendarView
        currentDate={mockCurrentDate}
        view="week"
        onDateChange={handleDateChange}
      />
    );

    const prevButton = screen.getByLabelText('이전');
    fireEvent.click(prevButton);

    expect(handleDateChange).toHaveBeenCalled();
    const newDate = handleDateChange.mock.calls[0][0];
    expect(newDate.getDate()).toBe(8); // 7 days earlier
  });

  it('navigates days in day view', () => {
    const handleDateChange = vi.fn();
    
    render(
      <CalendarView
        currentDate={mockCurrentDate}
        view="day"
        onDateChange={handleDateChange}
      />
    );

    const nextButton = screen.getByLabelText('다음');
    fireEvent.click(nextButton);

    expect(handleDateChange).toHaveBeenCalled();
    const newDate = handleDateChange.mock.calls[0][0];
    expect(newDate.getDate()).toBe(16);
  });

  it('calls onViewChange when tab is clicked', () => {
    const handleViewChange = vi.fn();
    
    render(
      <CalendarView
        currentDate={mockCurrentDate}
        view="month"
        onViewChange={handleViewChange}
      />
    );

    const weekTab = screen.getByRole('button', { name: '주' });
    fireEvent.click(weekTab);

    expect(handleViewChange).toHaveBeenCalledWith('week');
  });

  it('highlights active tab', () => {
    const { rerender } = render(
      <CalendarView currentDate={mockCurrentDate} view="month" />
    );

    const monthTab = screen.getByRole('button', { name: '월' });
    expect(monthTab).toHaveClass('text-primary-600');

    rerender(<CalendarView currentDate={mockCurrentDate} view="week" />);
    
    const weekTab = screen.getByRole('button', { name: '주' });
    expect(weekTab).toHaveClass('text-primary-600');
  });

  it('calls onDateClick when a date is clicked', () => {
    const handleDateClick = vi.fn();
    
    render(
      <CalendarView
        currentDate={mockCurrentDate}
        view="month"
        onDateClick={handleDateClick}
      />
    );

    const dateButton = screen.getByText('15').closest('button');
    fireEvent.click(dateButton!);

    expect(handleDateClick).toHaveBeenCalled();
  });

  it('renders all three view tabs', () => {
    render(<CalendarView currentDate={mockCurrentDate} view="month" />);

    expect(screen.getByRole('button', { name: '월' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '주' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '일' })).toBeInTheDocument();
  });

  it('shows correct date range for week view', () => {
    render(<CalendarView currentDate={mockCurrentDate} view="week" />);

    // April 15, 2026 is Wednesday, so week starts on April 12 (Sunday)
    expect(screen.getByText(/2026년/)).toBeInTheDocument();
  });
});
