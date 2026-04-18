'use client';

import { useProjectStore } from '@/store/projectStore';
import type { Project, ProjectCreateInput } from '@/types/project';

interface UseProjectActionsOptions {
  teamId: string;
  currentUserId: string;
  selectedProject: Project | null;
  onModalClose: () => void;
}

export function useProjectActions({
  teamId,
  currentUserId,
  selectedProject,
  onModalClose,
}: UseProjectActionsOptions) {
  const store = useProjectStore();

  const handleCreateProject = (input: ProjectCreateInput) => {
    store.createProject(teamId, input, currentUserId);
    onModalClose();
  };

  const handleUpdateProject = (editingProject: Project, input: ProjectCreateInput) => {
    store.updateProject(editingProject.id, input);
    onModalClose();
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;
    if (!confirm(`"${selectedProject.name}" 프로젝트를 삭제하시겠습니까? 모든 일정도 함께 삭제됩니다.`)) return;
    store.deleteProject(selectedProject.id, teamId);
  };

  return {
    handleCreateProject,
    handleUpdateProject,
    handleDeleteProject,
  };
}
