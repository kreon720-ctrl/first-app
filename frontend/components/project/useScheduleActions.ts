'use client';

import { useProjectStore } from '@/store/projectStore';
import type { Project, ProjectSchedule, ProjectScheduleCreateInput } from '@/types/project';

interface UseScheduleActionsOptions {
  teamId: string;
  currentUserId: string;
  selectedProject: Project | null;
  onScheduleModalClose: () => void;
  onDetailModalClose: () => void;
}

export function useScheduleActions({
  teamId,
  currentUserId,
  selectedProject,
  onScheduleModalClose,
  onDetailModalClose,
}: UseScheduleActionsOptions) {
  const store = useProjectStore();

  const handleCreateSchedule = (input: ProjectScheduleCreateInput) => {
    if (!selectedProject) return;
    store.createProjectSchedule(selectedProject.id, teamId, input, currentUserId);
    onScheduleModalClose();
  };

  const handleUpdateSchedule = (editingSchedule: ProjectSchedule, input: ProjectScheduleCreateInput) => {
    if (!selectedProject) return;
    store.updateProjectSchedule(editingSchedule.id, selectedProject.id, input);
    onScheduleModalClose();
  };

  const handleDeleteSchedule = (schedule: ProjectSchedule) => {
    if (!selectedProject) return;
    store.deleteProjectSchedule(schedule.id, selectedProject.id);
    onDetailModalClose();
  };

  return {
    handleCreateSchedule,
    handleUpdateSchedule,
    handleDeleteSchedule,
  };
}
