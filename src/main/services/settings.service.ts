import { app, dialog, shell } from 'electron'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { APP_NAME } from '@shared/app.constants'
import type {
  AppSettings,
  DataActionResult,
  SettingsInfo,
  TaskerExport
} from '@shared/settings.types'
import { DEFAULT_SETTINGS } from '@shared/settings.types'
import type { TaskAppState } from '@shared/task.types'
import { databasePath } from '../database/prisma'
import { getAppState, replaceAppState } from './task.service'

const PROJECT_GITHUB_URL: string | null = null

export const defaultSettings = DEFAULT_SETTINGS

let settingsCache: AppSettings | null = null

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const option = <T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T => {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

const booleanOption = (value: unknown, fallback: boolean): boolean => {
  return typeof value === 'boolean' ? value : fallback
}

const numberOption = (value: unknown, fallback: number, min: number, max: number): number => {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.trunc(numberValue)))
}

const mergeRawSettings = (raw: unknown, fallback = defaultSettings): AppSettings => {
  const source = isObject(raw) ? raw : {}
  const appearance = isObject(source.appearance) ? source.appearance : {}
  const notifications = isObject(source.notifications) ? source.notifications : {}
  const calendar = isObject(source.calendar) ? source.calendar : {}
  const tasks = isObject(source.tasks) ? source.tasks : {}
  const kanban = isObject(source.kanban) ? source.kanban : {}

  const workdayStartHour = numberOption(calendar.workdayStartHour, fallback.calendar.workdayStartHour, 0, 23)
  const workdayEndHour = numberOption(calendar.workdayEndHour, fallback.calendar.workdayEndHour, 1, 24)

  return {
    appearance: {
      theme: option(appearance.theme, ['light', 'dark', 'system'] as const, fallback.appearance.theme),
      density: option(appearance.density, ['compact', 'comfortable'] as const, fallback.appearance.density),
      reducedMotion: booleanOption(appearance.reducedMotion, fallback.appearance.reducedMotion)
    },
    notifications: {
      enabled: booleanOption(notifications.enabled, fallback.notifications.enabled),
      dueSoon: booleanOption(notifications.dueSoon, fallback.notifications.dueSoon),
      overdue: booleanOption(notifications.overdue, fallback.notifications.overdue),
      closeBehavior: option(notifications.closeBehavior, ['tray', 'quit'] as const, fallback.notifications.closeBehavior),
      checkIntervalSeconds: numberOption(
        notifications.checkIntervalSeconds,
        fallback.notifications.checkIntervalSeconds,
        10,
        3600
      )
    },
    calendar: {
      defaultMode: option(calendar.defaultMode, ['month', 'week'] as const, fallback.calendar.defaultMode),
      firstDayOfWeek: option(calendar.firstDayOfWeek, ['monday', 'sunday'] as const, fallback.calendar.firstDayOfWeek),
      workdayStartHour,
      workdayEndHour: Math.max(workdayStartHour + 1, workdayEndHour),
      timeGridStepMinutes: option(calendar.timeGridStepMinutes, [30, 60] as const, fallback.calendar.timeGridStepMinutes)
    },
    tasks: {
      tableDensity: option(tasks.tableDensity, ['compact', 'comfortable'] as const, fallback.tasks.tableDensity),
      pinnedFirst: booleanOption(tasks.pinnedFirst, fallback.tasks.pinnedFirst),
      highlightOverdue: booleanOption(tasks.highlightOverdue, fallback.tasks.highlightOverdue),
      defaultSort: option(tasks.defaultSort, ['manual', 'due-asc', 'due-desc'] as const, fallback.tasks.defaultSort)
    },
    kanban: {
      showEmptyColumns: booleanOption(kanban.showEmptyColumns, fallback.kanban.showEmptyColumns),
      cardDensity: option(kanban.cardDensity, ['compact', 'comfortable'] as const, fallback.kanban.cardDensity),
      reduceDragAnimations: booleanOption(kanban.reduceDragAnimations, fallback.kanban.reduceDragAnimations),
      columnAccentStyle: option(kanban.columnAccentStyle, ['soft', 'stripe', 'header'] as const, fallback.kanban.columnAccentStyle)
    }
  }
}

const dataPath = (): string => app.getPath('userData')

export const settingsPath = (): string => join(dataPath(), 'settings.json')

const ensureSettingsDir = async (): Promise<void> => {
  await mkdir(dataPath(), { recursive: true })
}

const writeSettings = async (settings: AppSettings): Promise<void> => {
  await ensureSettingsDir()
  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
}

const readSettingsFile = (): AppSettings | null => {
  const path = settingsPath()
  if (!existsSync(path)) {
    return null
  }

  try {
    return mergeRawSettings(JSON.parse(readFileSync(path, 'utf8')))
  } catch (error) {
    console.error('Failed to read Tasker settings', error)
    return null
  }
}

export const getSettingsSync = (): AppSettings => {
  if (settingsCache) {
    return settingsCache
  }

  settingsCache = readSettingsFile() ?? defaultSettings
  return settingsCache
}

export const getSettings = async (): Promise<AppSettings> => {
  if (settingsCache) {
    return settingsCache
  }

  const path = settingsPath()
  if (!existsSync(path)) {
    settingsCache = defaultSettings
    await writeSettings(settingsCache)
    return settingsCache
  }

  try {
    const raw = await readFile(path, 'utf8')
    settingsCache = mergeRawSettings(JSON.parse(raw))
  } catch (error) {
    console.error('Failed to read Tasker settings', error)
    settingsCache = defaultSettings
    await writeSettings(settingsCache)
  }

  return settingsCache
}

export const updateSettings = async (partialSettings: Partial<AppSettings>): Promise<AppSettings> => {
  const currentSettings = await getSettings()
  const mergedSettings = mergeRawSettings(
    {
      ...currentSettings,
      ...partialSettings,
      appearance: { ...currentSettings.appearance, ...(partialSettings.appearance ?? {}) },
      notifications: { ...currentSettings.notifications, ...(partialSettings.notifications ?? {}) },
      calendar: { ...currentSettings.calendar, ...(partialSettings.calendar ?? {}) },
      tasks: { ...currentSettings.tasks, ...(partialSettings.tasks ?? {}) },
      kanban: { ...currentSettings.kanban, ...(partialSettings.kanban ?? {}) }
    },
    currentSettings
  )

  settingsCache = mergedSettings
  await writeSettings(mergedSettings)
  return mergedSettings
}

export const getSettingsInfo = async (): Promise<SettingsInfo> => {
  const settings = await getSettings()
  const notificationMode = settings.notifications.enabled
    ? settings.notifications.closeBehavior === 'tray'
      ? 'Уведомления включены, приложение остаётся в фоне при закрытии окна'
      : 'Уведомления включены, при закрытии окна приложение завершает работу'
    : 'Уведомления выключены'

  return {
    appName: APP_NAME,
    version: app.getVersion(),
    dataPath: dataPath(),
    databasePath,
    settingsPath: settingsPath(),
    notificationMode,
    githubUrl: PROJECT_GITHUB_URL
  }
}

const getTimestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')

export const exportData = async (): Promise<DataActionResult> => {
  const result = await dialog.showSaveDialog({
    title: 'Экспортировать данные Tasker',
    defaultPath: join(app.getPath('documents'), `tasker-export-${getTimestamp()}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (result.canceled || !result.filePath) {
    return { ok: false, message: 'Экспорт отменён' }
  }

  const exportPayload: TaskerExport = {
    exportedAt: new Date().toISOString(),
    appName: APP_NAME,
    version: app.getVersion(),
    settings: await getSettings(),
    state: await getAppState()
  }

  await writeFile(result.filePath, `${JSON.stringify(exportPayload, null, 2)}\n`, 'utf8')
  return { ok: true, path: result.filePath, message: `Данные экспортированы: ${basename(result.filePath)}` }
}

const isTaskAppState = (value: unknown): value is TaskAppState => {
  return (
    isObject(value) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.columns) &&
    Array.isArray(value.tags)
  )
}

export const importData = async (): Promise<{
  result: DataActionResult
  state: TaskAppState | null
  settings: AppSettings | null
}> => {
  const result = await dialog.showOpenDialog({
    title: 'Импортировать данные Tasker',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return {
      result: { ok: false, message: 'Импорт отменён' },
      state: null,
      settings: null
    }
  }

  const filePath = result.filePaths[0]
  let payload: unknown
  try {
    payload = JSON.parse(await readFile(filePath, 'utf8')) as unknown
  } catch {
    return {
      result: { ok: false, path: filePath, message: 'Не удалось прочитать JSON-файл' },
      state: null,
      settings: null
    }
  }

  const state = isObject(payload) && isTaskAppState(payload.state) ? payload.state : isTaskAppState(payload) ? payload : null

  if (!state) {
    return {
      result: { ok: false, path: filePath, message: 'Файл не похож на экспорт Tasker' },
      state: null,
      settings: null
    }
  }

  const nextState = await replaceAppState(state)
  const nextSettings = isObject(payload) && isObject(payload.settings) ? await updateSettings(payload.settings as Partial<AppSettings>) : null

  return {
    result: { ok: true, path: filePath, message: `Данные импортированы: ${basename(filePath)}` },
    state: nextState,
    settings: nextSettings
  }
}

export const backupDatabase = async (): Promise<DataActionResult> => {
  const result = await dialog.showSaveDialog({
    title: 'Создать резервную копию базы Tasker',
    defaultPath: join(app.getPath('documents'), `tasker-backup-${getTimestamp()}.db`),
    filters: [{ name: 'SQLite database', extensions: ['db'] }]
  })

  if (result.canceled || !result.filePath) {
    return { ok: false, message: 'Резервная копия отменена' }
  }

  await copyFile(databasePath, result.filePath)
  return { ok: true, path: result.filePath, message: `Резервная копия создана: ${basename(result.filePath)}` }
}

export const openDataFolder = async (): Promise<DataActionResult> => {
  await ensureSettingsDir()
  const error = await shell.openPath(dataPath())

  if (error) {
    return { ok: false, path: dataPath(), message: error }
  }

  return { ok: true, path: dataPath(), message: 'Папка данных открыта' }
}
