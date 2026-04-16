import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GanttBar, PROGRESS_BAR_HEIGHT, SCHEDULE_BAR_HEIGHT } from '../GanttBar';
import type { ProjectSchedule } from '@/types/project';

const mockSchedule: ProjectSchedule = {
  id: 'sch-1',
  projectId: 'proj-1',
  teamId: 'team-1',
  title: '기획 단계',
  color: 'indigo',
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  description: '테스트 설명',
  leader: '홍길동',
  progress: 50,
  phaseId: 'phase-1',
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('GanttBar', () => {
  it('renders with correct aria-label including title and dates', () => {
    render(<GanttBar schedule={mockSchedule} onClick={() => {}} />);
    const bar = screen.getByRole('button');
    expect(bar).toHaveAttribute(
      'aria-label',
      '기획 단계 (2026-01-01~2026-03-31)'
    );
  });

  it('renders the label text', () => {
    render(<GanttBar schedule={mockSchedule} onClick={() => {}} />);
    expect(screen.getByText('기획 단계 (2026-01-01~2026-03-31)')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<GanttBar schedule={mockSchedule} onClick={handleClick} />);

    const bar = screen.getByRole('button');
    fireEvent.click(bar);

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('calls onClick on Enter key', () => {
    const handleClick = vi.fn();
    render(<GanttBar schedule={mockSchedule} onClick={handleClick} />);

    const bar = screen.getByRole('button');
    fireEvent.keyDown(bar, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('calls onClick on Space key', () => {
    const handleClick = vi.fn();
    render(<GanttBar schedule={mockSchedule} onClick={handleClick} />);

    const bar = screen.getByRole('button');
    fireEvent.keyDown(bar, { key: ' ' });

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders progress bar with correct width percentage', () => {
    const { container } = render(<GanttBar schedule={mockSchedule} onClick={() => {}} />);
    // Find the inner progress div (first child of the outer bar)
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeTruthy();
  });

  it('renders progress bar at correct height', () => {
    const { container } = render(<GanttBar schedule={mockSchedule} onClick={() => {}} />);
    const progressBar = container.querySelector(`[style*="height: ${PROGRESS_BAR_HEIGHT}px"]`);
    expect(progressBar).toBeTruthy();
  });

  it('outer bar has correct schedule bar height', () => {
    const { container } = render(<GanttBar schedule={mockSchedule} onClick={() => {}} />);
    const outerBar = container.querySelector(`[style*="height: ${SCHEDULE_BAR_HEIGHT}px"]`);
    expect(outerBar).toBeTruthy();
  });

  it('renders 0% progress correctly', () => {
    const zeroProgress = { ...mockSchedule, progress: 0 };
    const { container } = render(<GanttBar schedule={zeroProgress} onClick={() => {}} />);
    const progressBar = container.querySelector('[style*="width: 0%"]');
    expect(progressBar).toBeTruthy();
  });

  it('renders 100% progress correctly', () => {
    const fullProgress = { ...mockSchedule, progress: 100 };
    const { container } = render(<GanttBar schedule={fullProgress} onClick={() => {}} />);
    const progressBar = container.querySelector('[style*="width: 100%"]');
    expect(progressBar).toBeTruthy();
  });

  it('renders all color variants without throwing', () => {
    const colors = ['indigo', 'blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'pink'] as const;
    for (const color of colors) {
      const schedule = { ...mockSchedule, color };
      expect(() => render(<GanttBar schedule={schedule} onClick={() => {}} />)).not.toThrow();
    }
  });

  it('does not call onClick for unrelated keys', () => {
    const handleClick = vi.fn();
    render(<GanttBar schedule={mockSchedule} onClick={handleClick} />);

    const bar = screen.getByRole('button');
    fireEvent.keyDown(bar, { key: 'Tab' });
    fireEvent.keyDown(bar, { key: 'Escape' });

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has tabIndex 0 for keyboard accessibility', () => {
    render(<GanttBar schedule={mockSchedule} onClick={() => {}} />);
    const bar = screen.getByRole('button');
    expect(bar).toHaveAttribute('tabindex', '0');
  });
});
