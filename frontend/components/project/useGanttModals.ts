'use client';

import { useState } from 'react';
import type { Project, ProjectSchedule } from '@/types/project';

export function useGanttModals() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProjectSchedule | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ProjectSchedule | null>(null);

  const openCreateProject = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const openCreateSchedule = () => {
    setEditingSchedule(null);
    setShowScheduleModal(true);
  };

  const openEditSchedule = (schedule: ProjectSchedule) => {
    setShowDetailModal(false);
    setEditingSchedule(schedule);
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const openDetailModal = (schedule: ProjectSchedule) => {
    setSelectedSchedule(schedule);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSchedule(null);
  };

  return {
    showProjectModal,
    editingProject,
    showScheduleModal,
    editingSchedule,
    showDetailModal,
    selectedSchedule,
    openCreateProject,
    openEditProject,
    closeProjectModal,
    openCreateSchedule,
    openEditSchedule,
    closeScheduleModal,
    openDetailModal,
    closeDetailModal,
  };
}
