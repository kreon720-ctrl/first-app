'use client';

import React, { useState } from 'react';
import { PlusSquare, Edit2, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import type {
  Project,
  ProjectSchedule,
  ProjectCreateInput,
  ProjectScheduleCreateInput,
} from '@/types/project';
import { GanttChart } from './GanttChart';
import { ProjectCreateModal } from './ProjectCreateModal';
import { ProjectScheduleModal } from './ProjectScheduleModal';
import { ProjectScheduleDetailModal } from './ProjectScheduleDetailModal';

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

  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProjectSchedule | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ProjectSchedule | null>(null);

  const handleCreateProject = (input: ProjectCreateInput) => {
    store.createProject(teamId, input, currentUserId);
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleUpdateProject = (input: ProjectCreateInput) => {
    if (!editingProject) return;
    store.updateProject(editingProject.id, input);
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;
    if (!confirm(`"${selectedProject.name}" 프로젝트를 삭제하시겠습니까? 모든 일정도 함께 삭제됩니다.`)) return;
    store.deleteProject(selectedProject.id, teamId);
  };

  const handleCreateSchedule = (input: ProjectScheduleCreateInput) => {
    if (!selectedProject) return;
    store.createProjectSchedule(selectedProject.id, teamId, input, currentUserId);
    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleUpdateSchedule = (input: ProjectScheduleCreateInput) => {
    if (!editingSchedule || !selectedProject) return;
    store.updateProjectSchedule(editingSchedule.id, selectedProject.id, input);
    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleDeleteSchedule = (schedule: ProjectSchedule) => {
    if (!selectedProject) return;
    store.deleteProjectSchedule(schedule.id, selectedProject.id);
    setShowDetailModal(false);
    setSelectedSchedule(null);
  };

  const handleBarClick = (schedule: ProjectSchedule) => {
    setSelectedSchedule(schedule);
    setShowDetailModal(true);
  };

  const handleEditFromDetail = (schedule: ProjectSchedule) => {
    setShowDetailModal(false);
    setEditingSchedule(schedule);
    setShowScheduleModal(true);
  };

  // Find phase name for detail modal
  const selectedSchedulePhaseName = selectedSchedule && selectedProject
    ? selectedProject.phases.find((p) => p.id === selectedSchedule.phaseId)?.name
    : undefined;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-none">
        {/* Left: project selector */}
        <div className="flex items-center gap-3 min-w-0">
          <select
            value={selectedProject?.id ?? ''}
            onChange={(e) => store.setSelectedProject(e.target.value || null)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white max-w-[200px]"
            aria-label="프로젝트 선택"
          >
            {projects.length === 0 && (
              <option value="">프로젝트 없음</option>
            )}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedProject && (
            <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
              {selectedProject.startDate} ~ {selectedProject.endDate}
            </span>
          )}
          {selectedProject && (
            <span className="text-xs text-gray-400 hidden md:inline">
              ({selectedProject.progress}%)
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5 flex-none ml-3">
          {/* + 프로젝트 일정 */}
          <button
            type="button"
            disabled={!selectedProject}
            onClick={() => {
              setEditingSchedule(null);
              setShowScheduleModal(true);
            }}
            className="px-2 py-1 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +일정
          </button>

          {/* Create project icon */}
          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setShowProjectModal(true);
            }}
            title="프로젝트 생성"
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <PlusSquare className="w-5 h-5" />
          </button>

          {/* Edit project icon (only if project selected) */}
          {selectedProject && (
            <button
              type="button"
              onClick={() => {
                setEditingProject(selectedProject);
                setShowProjectModal(true);
              }}
              title="프로젝트 수정"
              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete project icon (only if project selected) */}
          {selectedProject && (
            <button
              type="button"
              onClick={handleDeleteProject}
              title="프로젝트 삭제"
              className="p-1.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Gantt chart or empty state */}
      <div className="flex-1 overflow-hidden">
        {selectedProject ? (
          <GanttChart
            project={selectedProject}
            schedules={schedules}
            currentUserId={currentUserId}
            onBarClick={handleBarClick}
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
      {showProjectModal && (
        <ProjectCreateModal
          mode={editingProject ? 'edit' : 'create'}
          project={editingProject}
          onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
          onCancel={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
        />
      )}

      {/* Schedule create/edit modal */}
      {showScheduleModal && selectedProject && (
        <ProjectScheduleModal
          mode={editingSchedule ? 'edit' : 'create'}
          project={selectedProject}
          schedule={editingSchedule}
          onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
          onCancel={() => {
            setShowScheduleModal(false);
            setEditingSchedule(null);
          }}
        />
      )}

      {/* Schedule detail modal */}
      <ProjectScheduleDetailModal
        isOpen={showDetailModal}
        schedule={selectedSchedule}
        currentUserId={currentUserId}
        phaseName={selectedSchedulePhaseName}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSchedule(null);
        }}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteSchedule}
      />
    </div>
  );
}
