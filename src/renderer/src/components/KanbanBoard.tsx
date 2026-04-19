import { useEffect, useState, type CSSProperties } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KanbanColumnDto, TaskDto, TaskReorderItem } from '@shared/task.types'
import { formatDateTime } from '../utils/date'
import { checklistProgress } from '../utils/task'
import { CloseIcon } from './Icons'

type KanbanBoardProps = {
  columns: KanbanColumnDto[]
  tasks: TaskDto[]
  onTaskEdit: (task: TaskDto) => void
  onReorder: (items: TaskReorderItem[]) => void
  onColumnCreate: (title: string, color: string) => void
  onColumnUpdate: (id: string, title: string, color: string) => void
  onColumnDelete: (column: KanbanColumnDto) => void
}

type KanbanColumnProps = {
  column: KanbanColumnDto
  tasks: TaskDto[]
  onTaskEdit: (task: TaskDto) => void
  onColumnUpdate: (id: string, title: string, color: string) => void
  onColumnDelete: (column: KanbanColumnDto) => void
}

type DragPreview = {
  activeId: string
  overId: string | null
} | null

const defaultColumnColor = '#dff2e9'
const kanbanDropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
}

const KanbanCardContent = ({ task }: { task: TaskDto }) => (
  <>
    <span className="kanban-card-title-text">{task.title}</span>
    <div className="kanban-card-meta">
      <span>{formatDateTime(task.dueDate)}</span>
      <span>{checklistProgress(task)}</span>
    </div>
  </>
)

const SortableKanbanCard = ({ task, onTaskEdit }: { task: TaskDto; onTaskEdit: (task: TaskDto) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'opacity 160ms ease' : (transition ?? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)')
  }

  return (
    <article ref={setNodeRef} className={isDragging ? 'kanban-card kanban-card-dragging' : 'kanban-card'} style={style}>
      <button className="kanban-card-title" type="button" onClick={() => onTaskEdit(task)}>
        <KanbanCardContent task={task} />
      </button>
      <button className="drag-handle kanban-drag-handle" type="button" aria-label="Перетащить задачу" {...attributes} {...listeners}>
        ::
      </button>
    </article>
  )
}

const KanbanColumn = ({ column, tasks, onTaskEdit, onColumnUpdate, onColumnDelete }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [title, setTitle] = useState(column.title)
  const [draftColor, setDraftColor] = useState(column.color)

  useEffect(() => {
    setTitle(column.title)
  }, [column.title])

  useEffect(() => {
    setDraftColor(column.color)
  }, [column.color])

  const saveTitle = (): void => {
    const cleanTitle = title.trim()

    if (!cleanTitle) {
      setTitle(column.title)
      return
    }

    if (cleanTitle !== column.title) {
      onColumnUpdate(column.id, cleanTitle, column.color)
    }
  }

  const applyColor = (): void => {
    const cleanTitle = title.trim() || column.title
    onColumnUpdate(column.id, cleanTitle, draftColor)
  }

  const hasPendingColor = draftColor.toLowerCase() !== column.color.toLowerCase()

  return (
    <section
      ref={setNodeRef}
      className={isOver ? 'kanban-column kanban-column-over' : 'kanban-column'}
      style={{ '--column-color': column.color } as CSSProperties}
    >
      <header className="kanban-column-header">
        <span className="kanban-column-accent" aria-hidden="true" />
        <input
          aria-label="Название колонки"
          value={title}
          onBlur={saveTitle}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
        />
        <input
          className="color-input column-color-input"
          type="color"
          aria-label="Цвет колонки"
          value={draftColor}
          onChange={(event) => setDraftColor(event.target.value)}
        />
        <button
          className={hasPendingColor ? 'column-color-confirm column-color-confirm-active' : 'column-color-confirm'}
          type="button"
          disabled={!hasPendingColor}
          aria-label="Применить цвет колонки"
          title="Применить цвет"
          onClick={applyColor}
        >
          ✓
        </button>
        <button className="icon-button close-button" type="button" aria-label="Удалить колонку" onClick={() => onColumnDelete(column)}>
          <CloseIcon />
        </button>
      </header>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-card-list">
          {tasks.map((task) => (
            <SortableKanbanCard key={task.id} task={task} onTaskEdit={onTaskEdit} />
          ))}
          {tasks.length === 0 && <div className="column-empty">Пусто</div>}
        </div>
      </SortableContext>
    </section>
  )
}

export const KanbanBoard = ({
  columns,
  tasks,
  onTaskEdit,
  onReorder,
  onColumnCreate,
  onColumnUpdate,
  onColumnDelete
}: KanbanBoardProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnColor, setNewColumnColor] = useState(defaultColumnColor)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview>(null)
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null

  const buildPreviewTasks = (activeId: string, overId: string | null): TaskDto[] => {
    const draggedTask = tasks.find((task) => task.id === activeId)

    if (!draggedTask || !overId || activeId === overId) {
      return tasks
    }

    const overTask = tasks.find((task) => task.id === overId)
    const overColumn = columns.find((column) => column.id === overId)
    const targetColumnId = overTask?.columnId ?? overColumn?.id

    if (!targetColumnId) {
      return tasks
    }

    const columnIds = new Set(columns.map((column) => column.id))
    const tasksWithoutDragged = tasks.filter((task) => task.id !== activeId)
    const previewTasks: TaskDto[] = []

    for (const column of columns) {
      const columnTasks = tasksWithoutDragged.filter((task) => task.columnId === column.id).sort((a, b) => a.order - b.order)

      if (column.id === targetColumnId) {
        const insertIndex = overTask
          ? Math.max(0, columnTasks.findIndex((task) => task.id === overTask.id))
          : columnTasks.length

        columnTasks.splice(insertIndex, 0, { ...draggedTask, columnId: targetColumnId })
      }

      previewTasks.push(...columnTasks.map((task, index) => ({ ...task, order: index })))
    }

    previewTasks.push(...tasksWithoutDragged.filter((task) => !columnIds.has(task.columnId)).sort((a, b) => a.order - b.order))

    return previewTasks
  }

  const handleDragStart = (event: DragStartEvent): void => {
    const activeId = String(event.active.id)
    setActiveTaskId(activeId)
    setDragPreview({ activeId, overId: activeId })
  }

  const handleDragOver = (event: DragOverEvent): void => {
    setDragPreview({
      activeId: String(event.active.id),
      overId: event.over ? String(event.over.id) : null
    })
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    const activeId = String(active.id)
    const overId = over ? String(over.id) : null
    setActiveTaskId(null)
    setDragPreview(null)

    if (!overId) {
      return
    }

    const draggedTask = tasks.find((task) => task.id === activeId)
    if (!draggedTask) {
      return
    }

    const nextTasks = buildPreviewTasks(activeId, overId)
    const movedTask = nextTasks.find((task) => task.id === activeId)

    if (!movedTask) {
      return
    }

    const affectedColumnIds = new Set([draggedTask.columnId, movedTask.columnId])
    const updates: TaskReorderItem[] = Array.from(affectedColumnIds).flatMap((columnId) =>
      nextTasks
        .filter((task) => task.columnId === columnId)
        .sort((a, b) => a.order - b.order)
        .map((task, index) => ({
        id: task.id,
        columnId,
        order: index
      }))
    )

    const hasChanges = updates.some((update) => {
      const currentTask = tasks.find((task) => task.id === update.id)
      return currentTask?.columnId !== update.columnId || currentTask.order !== update.order
    })

    if (hasChanges) {
      onReorder(updates)
    }
  }

  const displayedTasks = dragPreview ? buildPreviewTasks(dragPreview.activeId, dragPreview.overId) : tasks

  return (
    <section className="content-section">
      <div className="kanban-toolbar">
        <form
          className="add-column-form"
          onSubmit={(event) => {
            event.preventDefault()
            const title = newColumnTitle.trim()
            if (!title) {
              return
            }
            onColumnCreate(title, newColumnColor)
            setNewColumnTitle('')
            setNewColumnColor(defaultColumnColor)
          }}
        >
          <input value={newColumnTitle} placeholder="Новая колонка" onChange={(event) => setNewColumnTitle(event.target.value)} />
          <input
            className="color-input"
            type="color"
            aria-label="Цвет новой колонки"
            value={newColumnColor}
            onChange={(event) => setNewColumnColor(event.target.value)}
          />
          <button className="button button-secondary" type="submit">
            Добавить колонку
          </button>
        </form>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={() => {
          setActiveTaskId(null)
          setDragPreview(null)
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-grid">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={displayedTasks.filter((task) => task.columnId === column.id).sort((a, b) => a.order - b.order)}
              onTaskEdit={onTaskEdit}
              onColumnUpdate={onColumnUpdate}
              onColumnDelete={onColumnDelete}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={kanbanDropAnimation}>
          {activeTask && (
            <article className="kanban-card kanban-card-overlay">
              <button className="kanban-card-title" type="button">
                <KanbanCardContent task={activeTask} />
              </button>
            </article>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
