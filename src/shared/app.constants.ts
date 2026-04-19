export const APP_NAME = 'Tasker'

export const APP_VIEWS = [
  {
    id: 'tasks',
    label: 'Задачи'
  },
  {
    id: 'kanban',
    label: 'Канбан'
  },
  {
    id: 'calendar',
    label: 'Календарь'
  }
] as const

export type AppViewId = (typeof APP_VIEWS)[number]['id']

export const DEFAULT_COLUMNS = [
  {
    id: 'backlog',
    title: 'Backlog',
    status: 'BACKLOG',
    color: '#dff2e9'
  },
  {
    id: 'todo',
    title: 'To Do',
    status: 'TODO',
    color: '#e7f0ff'
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    status: 'IN_PROGRESS',
    color: '#fff0c2'
  },
  {
    id: 'done',
    title: 'Done',
    status: 'DONE',
    color: '#e8f6ef'
  }
] as const

export const TASK_PRIORITIES = [
  {
    id: 'LOW',
    label: 'Низкий'
  },
  {
    id: 'MEDIUM',
    label: 'Средний'
  },
  {
    id: 'HIGH',
    label: 'Высокий'
  }
] as const
