import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleForm } from '../ScheduleForm';

describe('ScheduleForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders empty form with create button', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('제목')).toBeTruthy();
      expect(screen.getByText('설명')).toBeTruthy();
      expect(screen.getByText('시작 일시')).toBeTruthy();
      expect(screen.getByText('종료 일시')).toBeTruthy();
      expect(screen.getByRole('button', { name: /생성/ })).toBeTruthy();
    });

    it('shows character counter for title', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const counter = screen.getByText(/200자/);
      expect(counter).toBeTruthy();
    });

    it('calls onSubmit with valid data when form is submitted', async () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('일정 제목을 입력하세요'), {
        target: { value: '팀 회의' },
      });

      // Dates are pre-filled with current time, so just submit
      fireEvent.click(screen.getByRole('button', { name: /생성/ }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.title).toBe('팀 회의');
      expect(submittedData.description).toBeUndefined();
    });

    it('calls onCancel when cancel button is clicked', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /취소/ }));
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows validation error when title is empty', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Dates are pre-filled, so only title validation will trigger
      fireEvent.click(screen.getByRole('button', { name: /생성/ }));

      expect(screen.getByText('제목은 필수입니다.')).toBeTruthy();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error when title exceeds max length', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const titleInput = screen.getByPlaceholderText('일정 제목을 입력하세요');
      fireEvent.change(titleInput, { target: { value: 'a'.repeat(201) } });
      fireEvent.click(screen.getByRole('button', { name: /생성/ }));

      expect(screen.getByText('제목은 최대 200자까지 입력 가능합니다.')).toBeTruthy();
    });

    it('clears validation error when title is entered', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /생성/ }));
      expect(screen.queryByText('제목은 필수입니다.')).toBeTruthy();

      fireEvent.change(screen.getByPlaceholderText('일정 제목을 입력하세요'), {
        target: { value: '팀 회의' },
      });

      expect(screen.queryByText('제목은 필수입니다.')).toBeNull();
    });

    it('shows description when provided', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByPlaceholderText('설명을 입력하세요 (선택)');
      fireEvent.change(textarea, { target: { value: '설명입니다' } });

      expect((textarea as HTMLTextAreaElement).value).toBe('설명입니다');
    });
  });

  describe('Edit Mode', () => {
    const mockSchedule = {
      id: 'schedule-1',
      teamId: 'team-1',
      title: '기존 일정',
      description: '기존 설명',
      startAt: '2026-04-15T10:00:00.000Z',
      endAt: '2026-04-15T11:00:00.000Z',
      createdBy: 'user-1',
      createdAt: '2026-04-14T10:00:00.000Z',
      updatedAt: '2026-04-14T10:00:00.000Z',
    };

    it('renders form with initial data', () => {
      render(
        <ScheduleForm
          mode="edit"
          initialData={mockSchedule}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect((screen.getByPlaceholderText('일정 제목을 입력하세요') as HTMLInputElement).value).toBe('기존 일정');
      expect((screen.getByPlaceholderText('설명을 입력하세요 (선택)') as HTMLTextAreaElement).value).toBe('기존 설명');
    });

    it('shows 저장 button instead of 생성', () => {
      render(
        <ScheduleForm
          mode="edit"
          initialData={mockSchedule}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /저장/ })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /생성/ })).toBeNull();
    });

    it('calls onSubmit with updated data', () => {
      render(
        <ScheduleForm
          mode="edit"
          initialData={mockSchedule}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('일정 제목을 입력하세요'), {
        target: { value: '수정된 일정' },
      });

      fireEvent.click(screen.getByRole('button', { name: /저장/ }));

      expect(mockOnSubmit).toHaveBeenCalled();
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.title).toBe('수정된 일정');
      expect(submittedData.description).toBe('기존 설명');
    });
  });

  describe('Loading State', () => {
    it('shows 저장 중... when isPending is true', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isPending={true}
        />
      );

      expect(screen.getByText('저장 중...')).toBeTruthy();
    });

    it('disables inputs when isPending is true', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isPending={true}
        />
      );

      expect(screen.getByPlaceholderText('일정 제목을 입력하세요')).toBeDisabled();
    });

    it('disables cancel button when isPending is true', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isPending={true}
        />
      );

      expect(screen.getByRole('button', { name: /취소/ })).toBeDisabled();
    });
  });

  describe('Error Display', () => {
    it('shows general error when error prop is provided', () => {
      render(
        <ScheduleForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="서버 오류가 발생했습니다."
        />
      );

      expect(screen.getByText('서버 오류가 발생했습니다.')).toBeTruthy();
    });
  });
});
