import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/store/projectStore';
import type { ProjectCreateInput, ProjectScheduleCreateInput } from '@/types/project';

// Reset store state between tests
function resetStore() {
  useProjectStore.setState({
    projects: {},
    schedules: {},
    selectedProjectId: null,
  });
}

const teamId = 'team-abc';
const userId = 'user-1';

const baseProjectInput: ProjectCreateInput = {
  name: '테스트 프로젝트',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  progress: 0,
  manager: '김관리자',
  phases: [
    { name: '기획' },
    { name: '개발' },
    { name: '배포' },
  ],
};

const baseScheduleInput: ProjectScheduleCreateInput = {
  title: '기획 일정',
  color: 'indigo',
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  description: '기획 단계 작업',
  leader: '이리더',
  progress: 0,
  phaseId: '',  // will be set per test
};

describe('projectStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('starts with empty projects', () => {
      const state = useProjectStore.getState();
      expect(state.projects).toEqual({});
    });

    it('starts with empty schedules', () => {
      const state = useProjectStore.getState();
      expect(state.schedules).toEqual({});
    });

    it('starts with null selectedProjectId', () => {
      const state = useProjectStore.getState();
      expect(state.selectedProjectId).toBeNull();
    });
  });

  describe('getTeamProjects', () => {
    it('returns empty array for unknown teamId', () => {
      const projects = useProjectStore.getState().getTeamProjects('unknown-team');
      expect(projects).toEqual([]);
    });

    it('returns projects after creating one', () => {
      const store = useProjectStore.getState();
      store.createProject(teamId, baseProjectInput, userId);

      const projects = useProjectStore.getState().getTeamProjects(teamId);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('테스트 프로젝트');
    });
  });

  describe('getProjectSchedules', () => {
    it('returns empty array for unknown projectId', () => {
      const schedules = useProjectStore.getState().getProjectSchedules('unknown-project');
      expect(schedules).toEqual([]);
    });

    it('returns schedules after creating one', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId }, userId);

      const schedules = useProjectStore.getState().getProjectSchedules(project.id);
      expect(schedules).toHaveLength(1);
      expect(schedules[0].title).toBe('기획 일정');
    });
  });

  describe('createProject', () => {
    it('creates a project with correct fields', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      expect(project.id).toBeTruthy();
      expect(project.teamId).toBe(teamId);
      expect(project.name).toBe('테스트 프로젝트');
      expect(project.startDate).toBe('2026-01-01');
      expect(project.endDate).toBe('2026-12-31');
      expect(project.progress).toBe(0);
      expect(project.manager).toBe('김관리자');
      expect(project.createdBy).toBe(userId);
    });

    it('creates phases with IDs', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      expect(project.phases).toHaveLength(3);
      project.phases.forEach((phase, idx) => {
        expect(phase.id).toBeTruthy();
        expect(phase.name).toBe(baseProjectInput.phases[idx].name);
        expect(phase.order).toBe(idx);
      });
    });

    it('automatically selects the new project', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      expect(useProjectStore.getState().selectedProjectId).toBe(project.id);
    });

    it('creates multiple projects for same team', () => {
      const store = useProjectStore.getState();
      store.createProject(teamId, { ...baseProjectInput, name: '프로젝트 A' }, userId);
      store.createProject(teamId, { ...baseProjectInput, name: '프로젝트 B' }, userId);

      const projects = useProjectStore.getState().getTeamProjects(teamId);
      expect(projects).toHaveLength(2);
    });

    it('isolates projects by teamId', () => {
      const store = useProjectStore.getState();
      store.createProject('team-1', baseProjectInput, userId);
      store.createProject('team-2', { ...baseProjectInput, name: 'Other' }, userId);

      expect(useProjectStore.getState().getTeamProjects('team-1')).toHaveLength(1);
      expect(useProjectStore.getState().getTeamProjects('team-2')).toHaveLength(1);
    });

    it('generates unique IDs for each project', () => {
      const store = useProjectStore.getState();
      const p1 = store.createProject(teamId, baseProjectInput, userId);
      const p2 = store.createProject(teamId, { ...baseProjectInput, name: 'B' }, userId);

      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe('updateProject', () => {
    it('updates project name', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      useProjectStore.getState().updateProject(project.id, {
        ...baseProjectInput,
        name: '수정된 프로젝트',
      });

      const updated = useProjectStore.getState().getTeamProjects(teamId)[0];
      expect(updated.name).toBe('수정된 프로젝트');
    });

    it('updates progress', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      useProjectStore.getState().updateProject(project.id, {
        ...baseProjectInput,
        progress: 75,
      });

      const updated = useProjectStore.getState().getTeamProjects(teamId)[0];
      expect(updated.progress).toBe(75);
    });

    it('preserves existing phase IDs for unchanged phase names', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const originalPhaseId = project.phases[0].id;

      useProjectStore.getState().updateProject(project.id, {
        ...baseProjectInput,
        name: '수정됨',
        // Keep same phases
      });

      const updated = useProjectStore.getState().getTeamProjects(teamId)[0];
      expect(updated.phases[0].id).toBe(originalPhaseId);
    });

    it('updates phases when phases change', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      useProjectStore.getState().updateProject(project.id, {
        ...baseProjectInput,
        phases: [{ name: '새 단계 1' }, { name: '새 단계 2' }],
      });

      const updated = useProjectStore.getState().getTeamProjects(teamId)[0];
      expect(updated.phases).toHaveLength(2);
      expect(updated.phases[0].name).toBe('새 단계 1');
      expect(updated.phases[1].name).toBe('새 단계 2');
    });

    it('does not affect other projects', () => {
      const store = useProjectStore.getState();
      const p1 = store.createProject(teamId, { ...baseProjectInput, name: 'A' }, userId);
      const p2 = store.createProject(teamId, { ...baseProjectInput, name: 'B' }, userId);

      useProjectStore.getState().updateProject(p1.id, { ...baseProjectInput, name: 'A-수정' });

      const projects = useProjectStore.getState().getTeamProjects(teamId);
      const updatedP2 = projects.find((p) => p.id === p2.id);
      expect(updatedP2?.name).toBe('B');
    });
  });

  describe('deleteProject', () => {
    it('removes the project from the store', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      useProjectStore.getState().deleteProject(project.id, teamId);

      expect(useProjectStore.getState().getTeamProjects(teamId)).toHaveLength(0);
    });

    it('removes all schedules for the deleted project', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId }, userId);
      store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId, title: 'B' }, userId);

      useProjectStore.getState().deleteProject(project.id, teamId);

      expect(useProjectStore.getState().getProjectSchedules(project.id)).toHaveLength(0);
    });

    it('selects next project after deletion', () => {
      const store = useProjectStore.getState();
      const p1 = store.createProject(teamId, { ...baseProjectInput, name: 'A' }, userId);
      const p2 = store.createProject(teamId, { ...baseProjectInput, name: 'B' }, userId);

      // p2 is now selected (last created). Delete p1 — selectedProjectId should remain p2
      useProjectStore.getState().setSelectedProject(p1.id);
      useProjectStore.getState().deleteProject(p1.id, teamId);

      const newSelected = useProjectStore.getState().selectedProjectId;
      expect(newSelected).toBe(p2.id);
    });

    it('sets selectedProjectId to null when last project deleted', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      useProjectStore.getState().deleteProject(project.id, teamId);

      expect(useProjectStore.getState().selectedProjectId).toBeNull();
    });
  });

  describe('setSelectedProject', () => {
    it('sets the selected project ID', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);

      useProjectStore.getState().setSelectedProject(project.id);
      expect(useProjectStore.getState().selectedProjectId).toBe(project.id);
    });

    it('allows setting to null', () => {
      const store = useProjectStore.getState();
      store.createProject(teamId, baseProjectInput, userId);

      useProjectStore.getState().setSelectedProject(null);
      expect(useProjectStore.getState().selectedProjectId).toBeNull();
    });
  });

  describe('createProjectSchedule', () => {
    it('creates a schedule with correct fields', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      const schedule = store.createProjectSchedule(
        project.id,
        teamId,
        { ...baseScheduleInput, phaseId },
        userId
      );

      expect(schedule.id).toBeTruthy();
      expect(schedule.projectId).toBe(project.id);
      expect(schedule.teamId).toBe(teamId);
      expect(schedule.title).toBe('기획 일정');
      expect(schedule.color).toBe('indigo');
      expect(schedule.phaseId).toBe(phaseId);
      expect(schedule.createdBy).toBe(userId);
    });

    it('multiple schedules for same project', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId, title: 'A' }, userId);
      store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId, title: 'B' }, userId);
      store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId, title: 'C' }, userId);

      expect(useProjectStore.getState().getProjectSchedules(project.id)).toHaveLength(3);
    });

    it('generates unique IDs for schedules', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      const s1 = store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId }, userId);
      const s2 = store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId }, userId);

      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('updateProjectSchedule', () => {
    it('updates schedule fields', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      const schedule = store.createProjectSchedule(
        project.id,
        teamId,
        { ...baseScheduleInput, phaseId },
        userId
      );

      useProjectStore.getState().updateProjectSchedule(schedule.id, project.id, {
        ...baseScheduleInput,
        phaseId,
        title: '수정된 일정',
        progress: 80,
        color: 'rose',
      });

      const updated = useProjectStore.getState().getProjectSchedules(project.id)[0];
      expect(updated.title).toBe('수정된 일정');
      expect(updated.progress).toBe(80);
      expect(updated.color).toBe('rose');
    });

    it('does not affect other schedules', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      const s1 = store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId, title: 'A' }, userId);
      const s2 = store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId, title: 'B' }, userId);

      useProjectStore.getState().updateProjectSchedule(s1.id, project.id, {
        ...baseScheduleInput,
        phaseId,
        title: 'A-수정',
      });

      const schedules = useProjectStore.getState().getProjectSchedules(project.id);
      const updatedS2 = schedules.find((s) => s.id === s2.id);
      expect(updatedS2?.title).toBe('B');
    });
  });

  describe('deleteProjectSchedule', () => {
    it('removes the schedule', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      const schedule = store.createProjectSchedule(
        project.id,
        teamId,
        { ...baseScheduleInput, phaseId },
        userId
      );

      useProjectStore.getState().deleteProjectSchedule(schedule.id, project.id);

      expect(useProjectStore.getState().getProjectSchedules(project.id)).toHaveLength(0);
    });

    it('only removes the specified schedule', () => {
      const store = useProjectStore.getState();
      const project = store.createProject(teamId, baseProjectInput, userId);
      const phaseId = project.phases[0].id;

      const s1 = store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId, title: 'A' }, userId);
      const s2 = store.createProjectSchedule(project.id, teamId, { ...baseScheduleInput, phaseId, title: 'B' }, userId);

      useProjectStore.getState().deleteProjectSchedule(s1.id, project.id);

      const remaining = useProjectStore.getState().getProjectSchedules(project.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(s2.id);
    });
  });
});
