import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TagDto, TaskDto, TaskReorderItem } from '@shared/task.types'
import { deadlineState, formatDateTime } from '../utils/date'
import { checklistProgress, initials, personName } from '../utils/task'
import { GripIcon, PinIcon, TrashIcon } from './Icons'

type TaskTableProps = {
  tasks: TaskDto[]
  highlightOverdue: boolean
  onEdit: (task: TaskDto) => void
  onDelete: (task: TaskDto) => void
  onPinnedChange: (task: TaskDto, pinned: boolean) => void
  onCompletedChange: (task: TaskDto, completed: boolean) => void
  onReorder: (items: TaskReorderItem[]) => void
}

type SortableTaskRowProps = Omit<TaskTableProps, 'tasks' | 'onReorder'> & {
  task: TaskDto
}

const PersonCell = ({ name }: { name: string }) => (
  <div className="person-cell">
    <span className="avatar">{initials(name)}</span>
    <span>{personName(name)}</span>
  </div>
)

const TagPill = ({ tag }: { tag: TagDto }) => (
  <span className="tag-pill" style={{ backgroundColor: tag.color, borderColor: tag.color }}>
    {tag.name}
  </span>
)

const SortableTaskRow = ({ task, highlightOverdue, onEdit, onDelete, onPinnedChange, onCompletedChange }: SortableTaskRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id
  })
  const state = deadlineState(task.dueDate)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const rowClassName = [
    'task-row',
    isDragging ? 'task-row-dragging' : '',
    highlightOverdue && state === 'overdue' ? 'task-row-overdue' : ''
  ].join(' ')

  return (
    <tr ref={setNodeRef} className={rowClassName} style={style}>
      <td className="task-check-cell">
        <input
          aria-label="Отметить задачу выполненной"
          checked={task.isCompleted}
          type="checkbox"
          onChange={(event) => onCompletedChange(task, event.target.checked)}
        />
      </td>
      <td className="task-drag-cell">
        <button className="drag-handle" type="button" aria-label="Перетащить задачу" {...attributes} {...listeners}>
          <GripIcon />
        </button>
      </td>
      <td className="task-title-cell">
        <div className="task-title-line">
          <button className="task-title-button" type="button" onClick={() => onEdit(task)}>
            {task.title}
          </button>
          <button
            className={task.pinned ? 'pin-icon-button pin-icon-button-active' : 'pin-icon-button'}
            type="button"
            title={task.pinned ? 'Открепить задачу' : 'Закрепить задачу'}
            aria-label={task.pinned ? 'Открепить задачу' : 'Закрепить задачу'}
            onClick={() => onPinnedChange(task, !task.pinned)}
          >
            <PinIcon />
          </button>
        </div>
        <div className="task-subline">Чек-лист {checklistProgress(task)}</div>
      </td>
      <td className="deadline-cell">
        <span className={`deadline-pill deadline-${state}`}>{formatDateTime(task.dueDate)}</span>
      </td>
      <td>
        <PersonCell name={task.assigner} />
      </td>
      <td>
        <PersonCell name={task.assignee} />
      </td>
      <td>
        <div className="table-tag-list">
          {task.tags.length === 0 && <span className="muted-text">—</span>}
          {task.tags.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </td>
      <td className="task-delete-cell">
        <button className="delete-icon-button" type="button" aria-label="Удалить задачу" title="Удалить задачу" onClick={() => onDelete(task)}>
          <TrashIcon />
        </button>
      </td>
    </tr>
  )
}

export const TaskTable = ({ tasks, highlightOverdue, onEdit, onDelete, onPinnedChange, onCompletedChange, onReorder }: TaskTableProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const fromIndex = tasks.findIndex((task) => task.id === active.id)
    const toIndex = tasks.findIndex((task) => task.id === over.id)

    if (fromIndex < 0 || toIndex < 0) {
      return
    }

    const nextTasks = [...tasks]
    const [movedTask] = nextTasks.splice(fromIndex, 1)
    nextTasks.splice(toIndex, 0, movedTask)

    onReorder(
      nextTasks.map((task, index) => ({
        id: task.id,
        columnId: task.columnId,
        order: index
      }))
    )
  }

  if (tasks.length === 0) {
    return <div className="empty-state">Задач пока нет. Создайте первую задачу кнопкой +.</div>
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th aria-label="Выполнено" />
                <th aria-label="Порядок" />
                <th>Название</th>
                <th className="deadline-head">Срок</th>
                <th>Постановщик</th>
                <th>Исполнитель</th>
                <th>Теги</th>
                <th aria-label="Удаление" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  highlightOverdue={highlightOverdue}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPinnedChange={onPinnedChange}
                  onCompletedChange={onCompletedChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  )
}
