import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleDetailModal } from '../ScheduleDetailModal';

const mockSchedule = {
  id: 'schedule-1',
  teamId: 'team-1',
  title: '팀 회의',
  description: '주간 회의입니다',
  startAt: '2026-04-15T10:00:00.000Z',
  endAt: '2026-04-15T11:00:00.000Z',
  createdBy: 'user-1',
  createdAt: '2026-04-14T10:00:00.000Z',
  updatedAt: '2026-04-14T10:00:00.000Z',
};

describe('ScheduleDetailModal', () => {
  const mockOnClose = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <ScheduleDetailModal
          isOpen={false}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when schedule is null', () => {
      const { container } = render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={null}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders modal with schedule details when isOpen is true', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('팀 회의')).toBeTruthy();
      expect(screen.getByText('주간 회의입니다')).toBeTruthy();
      expect(screen.getByText('시작 일시')).toBeTruthy();
      expect(screen.getByText('종료 일시')).toBeTruthy();
    });

    it('shows "-" when description is null', () => {
      const scheduleWithoutDesc = { ...mockSchedule, description: null };

      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={scheduleWithoutDesc}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('-')).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('calls onClose when close button is clicked', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByLabelText('닫기'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const overlay = screen.getByText('팀 회의').closest('.fixed');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('does not call onClose when modal content is clicked', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const modalContent = screen.getByText('팀 회의').closest('.relative');
      if (modalContent) {
        fireEvent.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('LEADER vs MEMBER UI', () => {
    it('shows edit and delete buttons for LEADER', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('수정')).toBeTruthy();
      expect(screen.getByText('삭제')).toBeTruthy();
    });

    it('hides edit and delete buttons for MEMBER', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={false}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText('수정')).toBeNull();
      expect(screen.queryByText('삭제')).toBeNull();
    });

    it('calls onEdit when edit button is clicked', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText('수정'));
      expect(mockOnEdit).toHaveBeenCalled();
    });

    it('calls onDelete when delete button is clicked', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText('삭제'));
      expect(mockOnDelete).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows 삭제 중... when isDeleting is true', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isDeleting={true}
        />
      );

      expect(screen.getByText('삭제 중...')).toBeTruthy();
    });

    it('disables delete button when isDeleting is true', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isDeleting={true}
        />
      );

      expect(screen.getByText('삭제 중...')).toBeDisabled();
    });
  });

  describe('Date Formatting', () => {
    it('displays dates in Korean locale', () => {
      render(
        <ScheduleDetailModal
          isOpen={true}
          schedule={mockSchedule}
          isLeader={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Should contain Korean date format (e.g., "2026년 4월 15일" or similar)
      const dateElements = screen.getAllByText(/2026년/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });
});
