// Project Schedule Store - re-exports schedule CRUD actions from the unified project store.
// The underlying state lives in projectStore.ts (shared persist instance).

import { useProjectStore } from './projectStore';

export function useProjectScheduleStore() {
  const getProjectSchedules = useProjectStore((s) => s.getProjectSchedules);
  const createProjectSchedule = useProjectStore((s) => s.createProjectSchedule);
  const updateProjectSchedule = useProjectStore((s) => s.updateProjectSchedule);
  const deleteProjectSchedule = useProjectStore((s) => s.deleteProjectSchedule);

  return {
    getProjectSchedules,
    createProjectSchedule,
    updateProjectSchedule,
    deleteProjectSchedule,
  };
}
