'use client';

import React from 'react';
import { PlusSquare, Edit2, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import type { Project } from '@/types/project';
import { GanttChart } from './GanttChart';
import { ProjectCreateModal } from './ProjectCreateModal';
import { ProjectScheduleModal } from './ProjectScheduleModal';
import { ProjectScheduleDetailModal } from './ProjectScheduleDetailModal';
import { useProjectActions } from './useProjectActions';
import { useScheduleActions } from './useScheduleActions';
import { useGanttModals } from './useGanttModals';

interface ProjectGanttViewProps {
  teamId: string;
  currentUserId: string;
  isLeader: boolean;
}

export function ProjectGanttView({ teamId, currentUserId }: ProjectGanttViewProps) {
  const store = useProjectStore();

  const projects = store.getTeamProjects(teamId);
  const rawSelectedId = store.selectedProjectId;

  // If the selectedProjectId is not in this team's projects, fall back to first
  const selectedProject: Project | null =
    projects.find((p) => p.id === rawSelectedId) ?? projects[0] ?? null;

  // Load projects from API on mount / teamId change
  React.useEffect(() => {
    store.loadTeamProjects(teamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // Load schedules when selected project changes
  React.useEffect(() => {
    if (selectedProject) {
      store.loadProjectSchedules(teamId, selectedProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  // Sync store if fallback differs from stored ID
  React.useEffect(() => {
    if (projects.length > 0 && rawSelectedId !== selectedProject?.id) {
      store.setSelectedProject(selectedProject?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const schedules = selectedProject
    ? store.getProjectSchedules(selectedProject.id)
    : [];

  const modals = useGanttModals();

  const projectActions = useProjectActions({
    teamId,
    selectedProject,
    onModalClose: modals.closeProjectModal,
  });

  const scheduleActions = useScheduleActions({
    teamId,
    selectedProject,
    onScheduleModalClose: modals.closeScheduleModal,
    onDetailModalClose: modals.closeDetailModal,
  });

  // Find phase name for detail modal
  const selectedSchedulePhaseName = modals.selectedSchedule && selectedProject
    ? selectedProject.phases.find((p) => p.id === modals.selectedSchedule!.phaseId)?.name
    : undefined;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header toolbar */}
      <div className="flex items-center px-4 py-2 border-b border-gray-200 flex-none">
        {/* Left: project action buttons */}
        <div className="flex items-center gap-1.5 flex-none">
          <button
            type="button"
            onClick={modals.openCreateProject}
            title="프로젝트 생성"
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <PlusSquare className="w-5 h-5" />
          </button>
          {selectedProject && (
            <button
              type="button"
              onClick={() => modals.openEditProject(selectedProject)}
              title="프로젝트 수정"
              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {selectedProject && (
            <button
              type="button"
              onClick={projectActions.handleDeleteProject}
              title="프로젝트 삭제"
              className="p-1.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: project name + period & progress */}
        <div className="flex-1 flex items-center justify-center gap-1.5">
          {selectedProject && (
            <span className="text-sm text-gray-400 whitespace-nowrap">
              {selectedProject.name}
            </span>
          )}
          {selectedProject && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {selectedProject.startDate} ~ {selectedProject.endDate}
            </span>
          )}
          {selectedProject && (
            <span className="text-xs text-gray-400">
              ({selectedProject.progress}%)
            </span>
          )}
        </div>

        {/* Right: +일정 button */}
        <div className="flex-none">
          <button
            type="button"
            disabled={!selectedProject}
            onClick={async () => {
              await store.loadTeamProjects(teamId);
              modals.openCreateSchedule();
            }}
            className="px-2 py-1 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +일정
          </button>
        </div>
      </div>

      {/* Gantt chart or empty state */}
      <div className="flex-1 overflow-hidden">
        {selectedProject ? (
          <GanttChart
            project={selectedProject}
            schedules={schedules}
            currentUserId={currentUserId}
            onBarClick={modals.openDetailModal}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <p className="text-sm text-gray-400">
              프로젝트를 생성하세요. 우측 상단의{' '}
              <PlusSquare className="inline w-4 h-4 text-gray-500" /> 아이콘을 클릭하세요.
            </p>
          </div>
        )}
      </div>

      {/* Project create/edit modal */}
      {modals.showProjectModal && (
        <ProjectCreateModal
          mode={modals.editingProject ? 'edit' : 'create'}
          project={modals.editingProject}
          onSubmit={modals.editingProject
            ? (input) => projectActions.handleUpdateProject(modals.editingProject!, input)
            : projectActions.handleCreateProject
          }
          onCancel={modals.closeProjectModal}
        />
      )}

      {/* Schedule create/edit modal */}
      {modals.showScheduleModal && selectedProject && (
        <ProjectScheduleModal
          mode={modals.editingSchedule ? 'edit' : 'create'}
          project={selectedProject}
          schedule={modals.editingSchedule}
          onSubmit={modals.editingSchedule
            ? (input) => scheduleActions.handleUpdateSchedule(modals.editingSchedule!, input)
            : scheduleActions.handleCreateSchedule
          }
          onCancel={modals.closeScheduleModal}
        />
      )}

      {/* Schedule detail modal */}
      <ProjectScheduleDetailModal
        isOpen={modals.showDetailModal}
        schedule={modals.selectedSchedule}
        teamId={teamId}
        currentUserId={currentUserId}
        phaseName={selectedSchedulePhaseName}
        onClose={modals.closeDetailModal}
        onEdit={modals.openEditSchedule}
        onDelete={scheduleActions.handleDeleteSchedule}
      />
    </div>
  );
}
