import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { APP_NAME, APP_VIEWS, type AppViewId } from '@shared/app.constants'
import type { AppSettings, DataActionResult, SettingsInfo, TaskDefaultSort } from '@shared/settings.types'
import { DEFAULT_SETTINGS } from '@shared/settings.types'
import type { KanbanColumnDto, TaskAppState, TaskDto, TaskInput, TaskReorderItem } from '@shared/task.types'
import { CalendarView } from './components/CalendarView'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CheckLogoIcon, PlusIcon, SettingsIcon } from './components/Icons'
import { KanbanBoard } from './components/KanbanBoard'
import { SettingsView } from './components/SettingsView'
import { TaskFormModal } from './components/TaskFormModal'
import { TaskTable } from './components/TaskTable'

type ConfirmState =
  | {
      type: 'task'
      task: TaskDto
    }
  | {
      type: 'column'
      column: KanbanColumnDto
    }
  | null

type ActiveViewId = AppViewId | 'settings'
type SortMode = TaskDefaultSort

const emptyState: TaskAppState = {
  tasks: [],
  columns: [],
  tags: []
}

const TaskerLogo = () => (
  <span className="brand-mark" aria-hidden="true">
    <CheckLogoIcon />
  </span>
)

const compareTasks = (sortMode: SortMode, pinnedFirst: boolean) => (left: TaskDto, right: TaskDto): number => {
  if (pinnedFirst && left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1
  }

  if (sortMode === 'due-asc') {
    return (left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER) -
      (right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER)
  }

  if (sortMode === 'due-desc') {
    return (right.dueDate ? new Date(right.dueDate).getTime() : 0) - (left.dueDate ? new Date(left.dueDate).getTime() : 0)
  }

  return left.order - right.order
}

export const App = () => {
  const [activeView, setActiveView] = useState<ActiveViewId>('tasks')
  const [appState, setAppState] = useState<TaskAppState>(emptyState)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsInfo, setSettingsInfo] = useState<SettingsInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SETTINGS.tasks.defaultSort)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('tasker-sidebar-width'))
    return Number.isFinite(saved) && saved > 0 ? saved : 260
  })

  const refreshSettingsInfo = async (): Promise<void> => {
    setSettingsInfo(await window.tasker.settings.getInfo())
  }

  const loadState = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const [nextState, nextSettings, nextInfo] = await Promise.all([
        window.tasker.tasks.getState(),
        window.tasker.settings.get(),
        window.tasker.settings.getInfo()
      ])
      setAppState(nextState)
      setSettings(nextSettings)
      setSettingsInfo(nextInfo)
      setSortMode(nextSettings.tasks.defaultSort)
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Не удалось загрузить данные')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadState().catch(console.error)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('tasker-sidebar-width', String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const root = document.documentElement

    const applyTheme = (): void => {
      const resolvedTheme = settings.appearance.theme === 'system'
        ? mediaQuery.matches ? 'dark' : 'light'
        : settings.appearance.theme

      root.dataset.theme = resolvedTheme
      root.dataset.themePreference = settings.appearance.theme
      root.dataset.density = settings.appearance.density
      root.dataset.reducedMotion = String(settings.appearance.reducedMotion)
      root.dataset.tableDensity = settings.tasks.tableDensity
      root.dataset.highlightOverdue = String(settings.tasks.highlightOverdue)
      root.dataset.kanbanCardDensity = settings.kanban.cardDensity
      root.dataset.kanbanReducedDrag = String(settings.kanban.reduceDragAnimations)
      root.dataset.kanbanAccentStyle = settings.kanban.columnAccentStyle
      root.style.colorScheme = resolvedTheme
    }

    applyTheme()
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [settings])

  const visibleTasks = useMemo(() => {
    const cleanSearch = searchQuery.trim().toLowerCase()

    return appState.tasks
      .filter((task) => (cleanSearch ? task.title.toLowerCase().includes(cleanSearch) : true))
      .filter((task) => (tagFilter === 'all' ? true : task.tags.some((tag) => tag.name === tagFilter)))
      .sort(compareTasks(sortMode, settings.tasks.pinnedFirst))
  }, [appState.tasks, searchQuery, settings.tasks.pinnedFirst, sortMode, tagFilter])

  const pageTitle = activeView === 'settings'
    ? 'Настройки'
    : activeView === 'tasks'
      ? 'Задачи'
      : APP_VIEWS.find((view) => view.id === activeView)?.label

  const openCreateTask = (): void => {
    setEditingTask(null)
    setIsTaskModalOpen(true)
  }

  const openEditTask = (task: TaskDto): void => {
    setEditingTask(task)
    setIsTaskModalOpen(true)
  }

  const saveTask = async (input: TaskInput): Promise<void> => {
    setError(null)
    const nextState = editingTask
      ? await window.tasker.tasks.update(editingTask.id, input)
      : await window.tasker.tasks.create(input)
    setAppState(nextState)
    setIsTaskModalOpen(false)
    setEditingTask(null)
  }

  const updateSettings = async (partialSettings: Partial<AppSettings>): Promise<void> => {
    setError(null)
    try {
      const nextSettings = await window.tasker.settings.update(partialSettings)
      setSettings(nextSettings)
      if (partialSettings.tasks && 'defaultSort' in partialSettings.tasks) {
        setSortMode(nextSettings.tasks.defaultSort)
      }
      setSettingsInfo(await window.tasker.settings.getInfo())
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Не удалось сохранить настройки')
    }
  }

  const runAction = async (action: () => Promise<TaskAppState>): Promise<void> => {
    setError(null)
    try {
      setAppState(await action())
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Действие не выполнено')
    }
  }

  const runOptimisticAction = async (action: () => Promise<TaskAppState>): Promise<void> => {
    setError(null)
    try {
      setAppState(await action())
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Действие не выполнено')
      loadState().catch(console.error)
    }
  }

  const handleSidebarResizeStart = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    event.preventDefault()

    const onMouseMove = (moveEvent: MouseEvent): void => {
      const nextWidth = Math.min(380, Math.max(208, moveEvent.clientX))
      setSidebarWidth(nextWidth)
    }

    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const handleTaskReorder = (items: TaskReorderItem[]): void => {
    if (items.length === 0) {
      return
    }

    const updatesById = new Map(items.map((item) => [item.id, item]))
    setAppState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        const update = updatesById.get(task.id)
        return update ? { ...task, columnId: update.columnId, order: update.order } : task
      })
    }))

    runOptimisticAction(() => window.tasker.tasks.reorder(items)).catch(console.error)
  }

  const handleTaskDueDateMove = (task: TaskDto, dueDate: string): void => {
    const activityAt = new Date().toISOString()

    setAppState((current) => ({
      ...current,
      tasks: current.tasks.map((candidate) =>
        candidate.id === task.id
          ? {
              ...candidate,
              dueDate,
              activityAt,
              activityCount: candidate.activityCount + 1
            }
          : candidate
      )
    }))

    runOptimisticAction(() => window.tasker.tasks.updateDueDate(task.id, dueDate)).catch(console.error)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!confirmState) {
      return
    }

    if (confirmState.type === 'task') {
      await runAction(() => window.tasker.tasks.delete(confirmState.task.id))
    } else {
      await runAction(() => window.tasker.columns.delete(confirmState.column.id))
    }

    setConfirmState(null)
  }

  const exportData = async (): Promise<DataActionResult> => window.tasker.data.export()

  const importData = async (): Promise<DataActionResult> => {
    const imported = await window.tasker.data.import()
    if (imported.state) {
      setAppState(imported.state)
    }
    if (imported.settings) {
      setSettings(imported.settings)
      setSortMode(imported.settings.tasks.defaultSort)
    }
    return imported.result
  }

  const backupData = async (): Promise<DataActionResult> => window.tasker.data.backup()
  const openDataFolder = async (): Promise<DataActionResult> => window.tasker.data.openFolder()

  return (
    <div className="app-shell" style={{ gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr)` }}>
      <aside className="sidebar" aria-label="Основная навигация">
        <div className="brand">
          <TaskerLogo />
          <span className="brand-name">{APP_NAME}</span>
        </div>

        <nav className="nav-list">
          {APP_VIEWS.map((view) => (
            <button
              className={view.id === activeView ? 'nav-item nav-item-active' : 'nav-item'}
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className={activeView === 'settings' ? 'nav-item nav-item-active sidebar-settings-button' : 'nav-item sidebar-settings-button'}
            type="button"
            onClick={() => setActiveView('settings')}
          >
            <SettingsIcon />
            <span>Настройки</span>
          </button>
        </div>

        <button className="sidebar-resizer" type="button" aria-label="Изменить ширину меню" onMouseDown={handleSidebarResizeStart} />
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{pageTitle}</h1>
          </div>
          {activeView === 'tasks' && (
            <button className="create-task-button" type="button" aria-label="Создать задачу" onClick={openCreateTask}>
              <PlusIcon />
            </button>
          )}
        </header>

        {error && <div className="error-banner">{error}</div>}
        {isLoading && <div className="empty-state">Загрузка...</div>}

        {!isLoading && activeView === 'tasks' && (
          <section className="content-section" aria-labelledby="tasks-title">
            <div className="task-toolbar">
              <label className="toolbar-field search-field">
                <span>Поиск</span>
                <input value={searchQuery} placeholder="Название задачи" onChange={(event) => setSearchQuery(event.target.value)} />
              </label>

              <label className="toolbar-field">
                <span>Тег</span>
                <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                  <option value="all">Все теги</option>
                  {appState.tags.map((tag) => (
                    <option key={tag.id} value={tag.name}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="toolbar-field">
                <span>Сортировка</span>
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                  <option value="manual">По порядку</option>
                  <option value="due-asc">Срок: по возрастанию</option>
                  <option value="due-desc">Срок: по убыванию</option>
                </select>
              </label>
            </div>

            <TaskTable
              tasks={visibleTasks}
              highlightOverdue={settings.tasks.highlightOverdue}
              onEdit={openEditTask}
              onDelete={(task) => setConfirmState({ type: 'task', task })}
              onPinnedChange={(task, pinned) => runAction(() => window.tasker.tasks.setPinned(task.id, pinned)).catch(console.error)}
              onCompletedChange={(task, completed) =>
                runAction(() => window.tasker.tasks.setCompleted(task.id, completed)).catch(console.error)
              }
              onReorder={handleTaskReorder}
            />
          </section>
        )}

        {!isLoading && activeView === 'kanban' && (
          <ErrorBoundary
            resetKey={activeView}
            title="Канбан временно недоступен"
            message="Произошла ошибка отображения доски. Данные сохранены, можно повторить без перезапуска приложения."
          >
            <KanbanBoard
              columns={appState.columns}
              tasks={appState.tasks}
              settings={settings.kanban}
              onTaskEdit={openEditTask}
              onReorder={handleTaskReorder}
              onColumnCreate={(title, color) => runAction(() => window.tasker.columns.create(title, color)).catch(console.error)}
              onColumnUpdate={(id, title, color) => runAction(() => window.tasker.columns.update(id, title, color)).catch(console.error)}
              onColumnDelete={(column) => setConfirmState({ type: 'column', column })}
            />
          </ErrorBoundary>
        )}

        {!isLoading && activeView === 'calendar' && (
          <CalendarView
            tasks={appState.tasks}
            settings={settings.calendar}
            onTaskEdit={openEditTask}
            onTaskMove={handleTaskDueDateMove}
          />
        )}

        {!isLoading && activeView === 'settings' && (
          <SettingsView
            settings={settings}
            info={settingsInfo}
            onSettingsChange={updateSettings}
            onExportData={exportData}
            onImportData={importData}
            onBackupData={backupData}
            onOpenDataFolder={openDataFolder}
            onRefreshInfo={refreshSettingsInfo}
          />
        )}
      </main>

      {isTaskModalOpen && (
        <TaskFormModal task={editingTask} columns={appState.columns} tags={appState.tags} onClose={() => setIsTaskModalOpen(false)} onSubmit={saveTask} />
      )}

      {confirmState && (
        <ConfirmDialog
          title={confirmState.type === 'task' ? 'Удалить задачу?' : 'Удалить колонку?'}
          message={
            confirmState.type === 'task'
              ? `Задача "${confirmState.task.title}" будет удалена без возможности восстановления.`
              : `Колонка "${confirmState.column.title}" будет удалена, а её задачи будут перенесены в соседнюю колонку.`
          }
          confirmLabel="Удалить"
          onCancel={() => setConfirmState(null)}
          onConfirm={() => confirmDelete().catch(console.error)}
        />
      )}
    </div>
  )
}
