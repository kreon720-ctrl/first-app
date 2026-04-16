import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectScheduleModal } from '../ProjectScheduleModal';
import type { Project, ProjectSchedule } from '@/types/project';

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
    { id: 'phase-3', name: '테스트', order: 2 },
  ],
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockSchedule: ProjectSchedule = {
  id: 'sch-1',
  projectId: 'proj-1',
  teamId: 'team-1',
  title: '기획 일정',
  color: 'emerald',
  startDate: '2026-02-01',
  endDate: '2026-03-31',
  description: '기획 단계 일정',
  leader: '박기획',
  progress: 60,
  phaseId: 'phase-1',
  createdBy: 'user-1',
  createdAt: '2026-02-01T00:00:00Z',
};

describe('ProjectScheduleModal', () => {
  describe('create mode', () => {
    it('renders create mode title', () => {
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('프로젝트 일정 생성')).toBeDefined();
    });

    it('renders all form fields', () => {
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByPlaceholderText('일정명을 입력하세요')).toBeDefined();
      expect(screen.getByText('색상')).toBeDefined();
      expect(screen.getByText('기간')).toBeDefined();
      expect(screen.getByText('설명')).toBeDefined();
      expect(screen.getByText('프로젝트 리더')).toBeDefined();
      expect(screen.getByText('진행률')).toBeDefined();
      expect(screen.getByText('단계')).toBeDefined();
    });

    it('renders 8 color circles', () => {
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      // Each color circle is a button with an aria-label
      const colors = ['indigo', 'blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'pink'];
      colors.forEach((color) => {
        expect(screen.getByLabelText(`${color} 색상`)).toBeDefined();
      });
    });

    it('allows color selection', async () => {
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      const blueButton = screen.getByLabelText('blue 색상');
      fireEvent.click(blueButton);

      await waitFor(() => {
        expect(blueButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('color selection changes selection state', async () => {
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Initially indigo is selected (default)
      const indigoButton = screen.getByLabelText('indigo 색상');
      expect(indigoButton).toHaveAttribute('aria-pressed', 'true');

      // Click amber
      const amberButton = screen.getByLabelText('amber 색상');
      fireEvent.click(amberButton);

      await waitFor(() => {
        expect(amberButton).toHaveAttribute('aria-pressed', 'true');
        expect(indigoButton).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('renders project phases in dropdown', () => {
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      expect(screen.getByText('기획')).toBeDefined();
      expect(screen.getByText('개발')).toBeDefined();
      expect(screen.getByText('테스트')).toBeDefined();
    });

    it('allows phase selection', async () => {
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'phase-2' } });

      await waitFor(() => {
        expect(select.value).toBe('phase-2');
      });
    });

    it('shows validation error for missing title', async () => {
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      fireEvent.click(screen.getByText('생성'));

      await waitFor(() => {
        expect(screen.getByText('일정명을 입력해주세요.')).toBeDefined();
      });
    });

    it('shows message when project has no phases', () => {
      const projectNoPhases: Project = { ...mockProject, phases: [] };
      render(
        <ProjectScheduleModal
          mode="create"
          project={projectNoPhases}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      expect(screen.getByText(/프로젝트에 단계가 없습니다/)).toBeDefined();
    });

    it('calls onCancel when 취소 is clicked', () => {
      const onCancel = vi.fn();
      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={() => {}}
          onCancel={onCancel}
        />
      );
      fireEvent.click(screen.getByText('취소'));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('calls onSubmit with correct data for valid form', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();

      render(
        <ProjectScheduleModal
          mode="create"
          project={mockProject}
          onSubmit={onSubmit}
          onCancel={() => {}}
        />
      );

      await user.type(screen.getByPlaceholderText('일정명을 입력하세요'), '새 일정');

      // Dates are pre-populated from project, phase is pre-selected
      await user.click(screen.getByText('생성'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledOnce();
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '새 일정',
            phaseId: 'phase-1',
          })
        );
      });
    });
  });

  describe('edit mode', () => {
    it('renders edit mode title', () => {
      render(
        <ProjectScheduleModal
          mode="edit"
          project={mockProject}
          schedule={mockSchedule}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('프로젝트 일정 수정')).toBeDefined();
    });

    it('pre-fills title in edit mode', async () => {
      render(
        <ProjectScheduleModal
          mode="edit"
          project={mockProject}
          schedule={mockSchedule}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      await waitFor(() => {
        const input = screen.getByPlaceholderText('일정명을 입력하세요') as HTMLInputElement;
        expect(input.value).toBe('기획 일정');
      });
    });

    it('pre-selects color in edit mode', async () => {
      render(
        <ProjectScheduleModal
          mode="edit"
          project={mockProject}
          schedule={mockSchedule}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      await waitFor(() => {
        const emeraldButton = screen.getByLabelText('emerald 색상');
        expect(emeraldButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('pre-fills description in edit mode', async () => {
      render(
        <ProjectScheduleModal
          mode="edit"
          project={mockProject}
          schedule={mockSchedule}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('기획 단계 일정')).toBeDefined();
      });
    });

    it('shows 수정 button in edit mode', () => {
      render(
        <ProjectScheduleModal
          mode="edit"
          project={mockProject}
          schedule={mockSchedule}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('수정')).toBeDefined();
    });
  });
});
