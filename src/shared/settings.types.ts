import type { TaskAppState } from './task.types'

export type ThemePreference = 'light' | 'dark' | 'system'
export type InterfaceDensity = 'compact' | 'comfortable'
export type CalendarDefaultMode = 'month' | 'week'
export type FirstDayOfWeek = 'monday' | 'sunday'
export type TimeGridStepMinutes = 30 | 60
export type TaskDefaultSort = 'manual' | 'due-asc' | 'due-desc'
export type KanbanAccentStyle = 'soft' | 'stripe' | 'header'
export type CloseBehavior = 'tray' | 'quit'

export type AppSettings = {
  appearance: {
    theme: ThemePreference
    density: InterfaceDensity
    reducedMotion: boolean
  }
  notifications: {
    enabled: boolean
    dueSoon: boolean
    overdue: boolean
    closeBehavior: CloseBehavior
    checkIntervalSeconds: number
  }
  calendar: {
    defaultMode: CalendarDefaultMode
    firstDayOfWeek: FirstDayOfWeek
    workdayStartHour: number
    workdayEndHour: number
    timeGridStepMinutes: TimeGridStepMinutes
  }
  tasks: {
    tableDensity: InterfaceDensity
    pinnedFirst: boolean
    highlightOverdue: boolean
    defaultSort: TaskDefaultSort
  }
  kanban: {
    showEmptyColumns: boolean
    cardDensity: InterfaceDensity
    reduceDragAnimations: boolean
    columnAccentStyle: KanbanAccentStyle
  }
}

export type SettingsInfo = {
  appName: string
  version: string
  dataPath: string
  databasePath: string
  settingsPath: string
  notificationMode: string
  githubUrl: string | null
}

export type DataActionResult = {
  ok: boolean
  path?: string
  message: string
}

export type TaskerExport = {
  exportedAt: string
  appName: string
  version: string
  settings: AppSettings
  state: TaskAppState
}

export const DEFAULT_SETTINGS: AppSettings = {
  appearance: {
    theme: 'system',
    density: 'comfortable',
    reducedMotion: false
  },
  notifications: {
    enabled: true,
    dueSoon: true,
    overdue: true,
    closeBehavior: 'tray',
    checkIntervalSeconds: 30
  },
  calendar: {
    defaultMode: 'month',
    firstDayOfWeek: 'monday',
    workdayStartHour: 8,
    workdayEndHour: 20,
    timeGridStepMinutes: 60
  },
  tasks: {
    tableDensity: 'comfortable',
    pinnedFirst: true,
    highlightOverdue: true,
    defaultSort: 'manual'
  },
  kanban: {
    showEmptyColumns: true,
    cardDensity: 'comfortable',
    reduceDragAnimations: false,
    columnAccentStyle: 'soft'
  }
}
