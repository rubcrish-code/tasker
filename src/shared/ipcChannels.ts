export const IPC_CHANNELS = {
  tasksGetState: 'tasks:get-state',
  tasksCreate: 'tasks:create',
  tasksUpdate: 'tasks:update',
  tasksDelete: 'tasks:delete',
  tasksReorder: 'tasks:reorder',
  tasksSetPinned: 'tasks:set-pinned',
  tasksSetCompleted: 'tasks:set-completed',
  tasksUpdateDueDate: 'tasks:update-due-date',
  tagsUpdateColor: 'tags:update-color',
  columnsCreate: 'columns:create',
  columnsUpdate: 'columns:update',
  columnsDelete: 'columns:delete'
} as const
