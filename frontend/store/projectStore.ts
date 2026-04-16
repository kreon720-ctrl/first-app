// Project Store - manages project and schedule state using Zustand with persistence

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Project,
  ProjectSchedule,
  ProjectCreateInput,
  ProjectScheduleCreateInput,
} from '@/types/project';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getNow(): string {
  return new Date().toISOString();
}

interface ProjectState {
  projects: Record<string, Project[]>;       // keyed by teamId
  schedules: Record<string, ProjectSchedule[]>; // keyed by projectId
  selectedProjectId: string | null;

  // Selectors
  getTeamProjects: (teamId: string) => Project[];
  getProjectSchedules: (projectId: string) => ProjectSchedule[];

  // Project actions
  setSelectedProject: (projectId: string | null) => void;
  createProject: (teamId: string, input: ProjectCreateInput, createdBy: string) => Project;
  updateProject: (projectId: string, input: ProjectCreateInput) => void;
  deleteProject: (projectId: string, teamId: string) => void;

  // Schedule actions
  createProjectSchedule: (
    projectId: string,
    teamId: string,
    input: ProjectScheduleCreateInput,
    createdBy: string
  ) => ProjectSchedule;
  updateProjectSchedule: (scheduleId: string, projectId: string, input: ProjectScheduleCreateInput) => void;
  deleteProjectSchedule: (scheduleId: string, projectId: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: {},
      schedules: {},
      selectedProjectId: null,

      getTeamProjects: (teamId: string): Project[] => {
        return get().projects[teamId] ?? [];
      },

      getProjectSchedules: (projectId: string): ProjectSchedule[] => {
        return get().schedules[projectId] ?? [];
      },

      setSelectedProject: (projectId: string | null) => {
        set({ selectedProjectId: projectId });
      },

      createProject: (teamId: string, input: ProjectCreateInput, createdBy: string): Project => {
        const now = getNow();
        const newProject: Project = {
          id: generateId(),
          teamId,
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          progress: input.progress,
          manager: input.manager,
          phases: input.phases.map((p, idx) => ({
            id: generateId(),
            name: p.name,
            order: idx,
          })),
          createdBy,
          createdAt: now,
        };

        set((state) => ({
          projects: {
            ...state.projects,
            [teamId]: [...(state.projects[teamId] ?? []), newProject],
          },
          selectedProjectId: newProject.id,
        }));

        return newProject;
      },

      updateProject: (projectId: string, input: ProjectCreateInput) => {
        set((state) => {
          const updatedProjects: Record<string, Project[]> = {};

          for (const [teamId, teamProjects] of Object.entries(state.projects)) {
            updatedProjects[teamId] = teamProjects.map((p) => {
              if (p.id !== projectId) return p;

              // Preserve existing phase IDs where names match, create new IDs for new phases
              const updatedPhases = input.phases.map((ph, idx) => {
                const existing = p.phases.find((ep) => ep.name === ph.name);
                return {
                  id: existing ? existing.id : generateId(),
                  name: ph.name,
                  order: idx,
                };
              });

              return {
                ...p,
                name: input.name,
                startDate: input.startDate,
                endDate: input.endDate,
                progress: input.progress,
                manager: input.manager,
                phases: updatedPhases,
              };
            });
          }

          return { projects: updatedProjects };
        });
      },

      deleteProject: (projectId: string, teamId: string) => {
        set((state) => {
          const teamProjects = state.projects[teamId] ?? [];
          const filtered = teamProjects.filter((p) => p.id !== projectId);

          // Also remove all schedules for this project
          const { [projectId]: _removed, ...remainingSchedules } = state.schedules;

          // If deleted project was selected, select the first remaining or null
          const newSelected =
            state.selectedProjectId === projectId
              ? (filtered[0]?.id ?? null)
              : state.selectedProjectId;

          return {
            projects: { ...state.projects, [teamId]: filtered },
            schedules: remainingSchedules,
            selectedProjectId: newSelected,
          };
        });
      },

      createProjectSchedule: (
        projectId: string,
        teamId: string,
        input: ProjectScheduleCreateInput,
        createdBy: string
      ): ProjectSchedule => {
        const now = getNow();
        const newSchedule: ProjectSchedule = {
          id: generateId(),
          projectId,
          teamId,
          title: input.title,
          color: input.color,
          startDate: input.startDate,
          endDate: input.endDate,
          description: input.description,
          leader: input.leader,
          progress: input.progress,
          phaseId: input.phaseId,
          createdBy,
          createdAt: now,
        };

        set((state) => ({
          schedules: {
            ...state.schedules,
            [projectId]: [...(state.schedules[projectId] ?? []), newSchedule],
          },
        }));

        return newSchedule;
      },

      updateProjectSchedule: (
        scheduleId: string,
        projectId: string,
        input: ProjectScheduleCreateInput
      ) => {
        set((state) => {
          const projectSchedules = state.schedules[projectId] ?? [];
          return {
            schedules: {
              ...state.schedules,
              [projectId]: projectSchedules.map((s) =>
                s.id === scheduleId
                  ? {
                      ...s,
                      title: input.title,
                      color: input.color,
                      startDate: input.startDate,
                      endDate: input.endDate,
                      description: input.description,
                      leader: input.leader,
                      progress: input.progress,
                      phaseId: input.phaseId,
                    }
                  : s
              ),
            },
          };
        });
      },

      deleteProjectSchedule: (scheduleId: string, projectId: string) => {
        set((state) => {
          const projectSchedules = state.schedules[projectId] ?? [];
          return {
            schedules: {
              ...state.schedules,
              [projectId]: projectSchedules.filter((s) => s.id !== scheduleId),
            },
          };
        });
      },
    }),
    {
      name: 'caltalk-projects',
    }
  )
);
