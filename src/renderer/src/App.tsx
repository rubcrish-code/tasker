import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { APP_NAME, APP_VIEWS, type AppViewId } from '@shared/app.constants'
import type { KanbanColumnDto, TaskAppState, TaskDto, TaskInput, TaskReorderItem } from '@shared/task.types'
import { CalendarView } from './components/CalendarView'
import { ConfirmDialog } from './components/ConfirmDialog'
import { CheckLogoIcon, PlusIcon } from './components/Icons'
import { KanbanBoard } from './components/KanbanBoard'
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

type SortMode = 'manual' | 'due-asc' | 'due-desc'

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

const compareTasks = (sortMode: SortMode) => (left: TaskDto, right: TaskDto): number => {
  if (left.pinned !== right.pinned) {
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
  const [activeView, setActiveView] = useState<AppViewId>('tasks')
  const [appState, setAppState] = useState<TaskAppState>(emptyState)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('tasker-sidebar-width'))
    return Number.isFinite(saved) && saved > 0 ? saved : 260
  })

  const loadState = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      setAppState(await window.tasker.tasks.getState())
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

  const visibleTasks = useMemo(() => {
    const cleanSearch = searchQuery.trim().toLowerCase()

    return appState.tasks
      .filter((task) => (cleanSearch ? task.title.toLowerCase().includes(cleanSearch) : true))
      .filter((task) => (tagFilter === 'all' ? true : task.tags.some((tag) => tag.name === tagFilter)))
      .sort(compareTasks(sortMode))
  }, [appState.tasks, searchQuery, sortMode, tagFilter])

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

  const runAction = async (action: () => Promise<TaskAppState>): Promise<void> => {
    setError(null)
    try {
      setAppState(await action())
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Действие не выполнено')
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
    runAction(() => window.tasker.tasks.reorder(items)).catch(console.error)
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

        <button className="sidebar-resizer" type="button" aria-label="Изменить ширину меню" onMouseDown={handleSidebarResizeStart} />
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{activeView === 'tasks' ? 'Задачи' : APP_VIEWS.find((view) => view.id === activeView)?.label}</h1>
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
          <KanbanBoard
            columns={appState.columns}
            tasks={appState.tasks}
            onTaskEdit={openEditTask}
            onReorder={handleTaskReorder}
            onColumnCreate={(title, color) => runAction(() => window.tasker.columns.create(title, color)).catch(console.error)}
            onColumnUpdate={(id, title, color) => runAction(() => window.tasker.columns.update(id, title, color)).catch(console.error)}
            onColumnDelete={(column) => setConfirmState({ type: 'column', column })}
          />
        )}

        {!isLoading && activeView === 'calendar' && (
          <CalendarView
            tasks={appState.tasks}
            onTaskEdit={openEditTask}
            onTaskMove={(task, dueDate) => runAction(() => window.tasker.tasks.updateDueDate(task.id, dueDate)).catch(console.error)}
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
