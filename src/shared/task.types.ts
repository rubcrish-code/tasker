import type { AppSettings, DataActionResult, SettingsInfo } from './settings.types'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type ChecklistItemDto = {
  id: string
  title: string
  completed: boolean
  order: number
}

export type TagDto = {
  id: string
  name: string
  color: string
}

export type TaskNoteDto = {
  id: string
  body: string
  createdAt: string
}

export type KanbanColumnDto = {
  id: string
  title: string
  color: string
  order: number
}

export type TaskDto = {
  id: string
  title: string
  description: string
  status: string
  priority: TaskPriority
  dueDate: string | null
  assigner: string
  assignee: string
  reminderHours: number
  reminderMinutes: number
  activityAt: string | null
  activityCount: number
  pinned: boolean
  isCompleted: boolean
  order: number
  columnId: string
  createdAt: string
  updatedAt: string
  checklistItems: ChecklistItemDto[]
  tags: TagDto[]
  notes: TaskNoteDto[]
}

export type ChecklistItemInput = {
  id?: string
  title: string
  completed: boolean
  order: number
}

export type TaskNoteInput = {
  id?: string
  body: string
  createdAt?: string
}

export type TagInput = {
  name: string
  color: string
}

export type TaskInput = {
  title: string
  description: string
  status?: string
  priority: TaskPriority
  dueDate: string | null
  assigner: string
  assignee: string
  reminderHours: number
  reminderMinutes: number
  columnId: string
  checklistItems: ChecklistItemInput[]
  tags: TagInput[]
  notes: TaskNoteInput[]
}

export type TaskReorderItem = {
  id: string
  columnId: string
  order: number
}

export type TaskAppState = {
  tasks: TaskDto[]
  columns: KanbanColumnDto[]
  tags: TagDto[]
}

export type TaskerApi = {
  tasks: {
    getState: () => Promise<TaskAppState>
    create: (input: TaskInput) => Promise<TaskAppState>
    update: (id: string, input: TaskInput) => Promise<TaskAppState>
    delete: (id: string) => Promise<TaskAppState>
    reorder: (items: TaskReorderItem[]) => Promise<TaskAppState>
    setPinned: (id: string, pinned: boolean) => Promise<TaskAppState>
    setCompleted: (id: string, completed: boolean) => Promise<TaskAppState>
    updateDueDate: (id: string, dueDate: string | null) => Promise<TaskAppState>
  }
  columns: {
    create: (title: string, color: string) => Promise<TaskAppState>
    update: (id: string, title: string, color: string) => Promise<TaskAppState>
    delete: (id: string) => Promise<TaskAppState>
  }
  settings: {
    get: () => Promise<AppSettings>
    update: (settings: Partial<AppSettings>) => Promise<AppSettings>
    getInfo: () => Promise<SettingsInfo>
  }
  data: {
    export: () => Promise<DataActionResult>
    import: () => Promise<{ result: DataActionResult; state: TaskAppState | null; settings: AppSettings | null }>
    backup: () => Promise<DataActionResult>
    openFolder: () => Promise<DataActionResult>
  }
}
