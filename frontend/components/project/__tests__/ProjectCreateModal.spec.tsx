import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCreateModal } from '../ProjectCreateModal';
import type { Project } from '@/types/project';

const mockProject: Project = {
  id: 'proj-1',
  teamId: 'team-1',
  name: '테스트 프로젝트',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  progress: 30,
  manager: '김관리',
  phases: [
    { id: 'phase-1', name: '기획', order: 0 },
    { id: 'phase-2', name: '개발', order: 1 },
  ],
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('ProjectCreateModal', () => {
  describe('create mode', () => {
    it('renders create mode title', () => {
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('프로젝트 생성')).toBeDefined();
    });

    it('renders all required form fields', () => {
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByPlaceholderText('프로젝트명을 입력하세요')).toBeDefined();
      expect(screen.getByText('관리자')).toBeDefined();
      expect(screen.getByText('프로젝트 단계')).toBeDefined();
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={onCancel}
        />
      );
      fireEvent.click(screen.getByText('취소'));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('calls onCancel when X button is clicked', () => {
      const onCancel = vi.fn();
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={onCancel}
        />
      );
      fireEvent.click(screen.getByLabelText('닫기'));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('shows validation errors when submitting empty form', async () => {
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      fireEvent.click(screen.getByText('생성'));

      await waitFor(() => {
        expect(screen.getByText('프로젝트명을 입력해주세요.')).toBeDefined();
      });
    });

    it('adds a phase when 단계 추가 button is clicked', async () => {
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      fireEvent.click(screen.getByText('단계 추가'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('단계 1 이름')).toBeDefined();
      });
    });

    it('adds multiple phases', async () => {
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      fireEvent.click(screen.getByText('단계 추가'));
      fireEvent.click(screen.getByText('단계 추가'));
      fireEvent.click(screen.getByText('단계 추가'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('단계 1 이름')).toBeDefined();
        expect(screen.getByPlaceholderText('단계 2 이름')).toBeDefined();
        expect(screen.getByPlaceholderText('단계 3 이름')).toBeDefined();
      });
    });

    it('removes a phase when delete button is clicked', async () => {
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Add a phase
      fireEvent.click(screen.getByText('단계 추가'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('단계 1 이름')).toBeDefined();
      });

      // Remove it
      const deleteButtons = screen.getAllByLabelText('단계 삭제');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('단계 1 이름')).toBeNull();
      });
    });

    it('calls onSubmit with correct data when form is valid', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();

      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={onSubmit}
          onCancel={() => {}}
        />
      );

      await user.type(screen.getByPlaceholderText('프로젝트명을 입력하세요'), '새 프로젝트');
      await user.type(screen.getByPlaceholderText('관리자명을 입력하세요'), '이관리');

      // Set start date
      const dateInputs = screen.getAllByDisplayValue('');
      // Find date type inputs
      const startDateInput = screen
        .getAllByRole('textbox')
        .find((el) => (el as HTMLInputElement).type === 'text') ?? dateInputs[0];

      // Use fireEvent for date inputs since userEvent may behave differently
      const allInputs = document.querySelectorAll('input[type="date"]');
      fireEvent.change(allInputs[0], { target: { value: '2026-01-01' } });
      fireEvent.change(allInputs[1], { target: { value: '2026-12-31' } });

      await user.click(screen.getByText('생성'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce();
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: '새 프로젝트',
            manager: '이관리',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
          })
        );
      });
    });

    it('does not call onSubmit when validation fails', () => {
      const onSubmit = vi.fn();
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={onSubmit}
          onCancel={() => {}}
        />
      );

      fireEvent.click(screen.getByText('생성'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('renders edit mode title', () => {
      render(
        <ProjectCreateModal
          mode="edit"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('프로젝트 수정')).toBeDefined();
    });

    it('pre-fills form with project data', async () => {
      render(
        <ProjectCreateModal
          mode="edit"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('프로젝트명을 입력하세요') as HTMLInputElement;
        expect(nameInput.value).toBe('테스트 프로젝트');
      });
    });

    it('pre-fills phases from project', async () => {
      render(
        <ProjectCreateModal
          mode="edit"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('기획')).toBeDefined();
        expect(screen.getByDisplayValue('개발')).toBeDefined();
      });
    });

    it('shows 수정 button instead of 생성', () => {
      render(
        <ProjectCreateModal
          mode="edit"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('수정')).toBeDefined();
    });
  });

  describe('progress input', () => {
    it('renders progress range slider', () => {
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      const rangeInput = document.querySelector('input[type="range"]') as HTMLInputElement;
      expect(rangeInput).toBeTruthy();
    });

    it('renders progress number input with % label', () => {
      render(
        <ProjectCreateModal
          mode="create"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('%')).toBeDefined();
    });
  });
});
