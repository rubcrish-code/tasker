import { useMemo, useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import type { TaskDto } from '@shared/task.types'
import { formatDateTime, mergeDayWithTaskTime, taskDueDayKey, toDayKey } from '../utils/date'

type CalendarViewProps = {
  tasks: TaskDto[]
  onTaskEdit: (task: TaskDto) => void
  onTaskMove: (task: TaskDto, dueDate: string) => void
}

type CalendarDay = {
  key: string
  date: Date
  inCurrentMonth: boolean
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const buildMonthDays = (monthDate: Date): CalendarDay[] => {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - startOffset)

  return Array.from({ length: 42 }, (_item, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)

    return {
      key: toDayKey(date),
      date,
      inCurrentMonth: date.getMonth() === month
    }
  })
}

const CalendarTask = ({ task, onTaskEdit }: { task: TaskDto; onTaskEdit: (task: TaskDto) => void }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined

  return (
    <button
      ref={setNodeRef}
      className={isDragging ? 'calendar-task calendar-task-dragging' : 'calendar-task'}
      style={style}
      type="button"
      onDoubleClick={() => onTaskEdit(task)}
      {...attributes}
      {...listeners}
    >
      {task.title}
    </button>
  )
}

const CalendarDayCell = ({
  day,
  tasks,
  selected,
  onSelect,
  onTaskEdit
}: {
  day: CalendarDay
  tasks: TaskDto[]
  selected: boolean
  onSelect: (dayKey: string) => void
  onTaskEdit: (task: TaskDto) => void
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: day.key })

  return (
    <div
      ref={setNodeRef}
      className={[
        'calendar-day',
        day.inCurrentMonth ? '' : 'calendar-day-muted',
        selected ? 'calendar-day-selected' : '',
        isOver ? 'calendar-day-over' : ''
      ].join(' ')}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(day.key)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onSelect(day.key)
        }
      }}
    >
      <span className="calendar-day-number">{day.date.getDate()}</span>
      <span className="calendar-day-tasks">
        {tasks.slice(0, 3).map((task) => (
          <CalendarTask key={task.id} task={task} onTaskEdit={onTaskEdit} />
        ))}
        {tasks.length > 3 && <span className="calendar-more">+{tasks.length - 3}</span>}
      </span>
    </div>
  )
}

export const CalendarView = ({ tasks, onTaskEdit, onTaskMove }: CalendarViewProps) => {
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => toDayKey(new Date()))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const monthDays = useMemo(() => buildMonthDays(monthDate), [monthDate])
  const tasksByDay = useMemo(() => {
    return tasks.reduce<Record<string, TaskDto[]>>((acc, task) => {
      const key = taskDueDayKey(task.dueDate)
      if (!key) {
        return acc
      }

      acc[key] = [...(acc[key] ?? []), task]
      return acc
    }, {})
  }, [tasks])
  const selectedTasks = tasksByDay[selectedDay] ?? []

  const changeMonth = (delta: number): void => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over) {
      return
    }

    const task = tasks.find((candidate) => candidate.id === active.id)
    const dayKey = String(over.id)

    if (!task || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      return
    }

    onTaskMove(task, mergeDayWithTaskTime(dayKey, task.dueDate))
    setSelectedDay(dayKey)
  }

  return (
    <section className="content-section">
      <div className="calendar-toolbar">
        <button className="button button-secondary" type="button" onClick={() => changeMonth(-1)}>
          Назад
        </button>
        <h2>
          {new Intl.DateTimeFormat('ru-RU', {
            month: 'long',
            year: 'numeric'
          }).format(monthDate)}
        </h2>
        <button className="button button-secondary" type="button" onClick={() => changeMonth(1)}>
          Вперёд
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="calendar-layout">
          <div className="calendar-grid">
            {weekDays.map((day) => (
              <div className="calendar-weekday" key={day}>
                {day}
              </div>
            ))}
            {monthDays.map((day) => (
              <CalendarDayCell
                key={day.key}
                day={day}
                tasks={tasksByDay[day.key] ?? []}
                selected={selectedDay === day.key}
                onSelect={setSelectedDay}
                onTaskEdit={onTaskEdit}
              />
            ))}
          </div>

          <aside className="day-panel">
            <h3>Задачи на дату</h3>
            <p>{new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(selectedDay))}</p>
            <div className="day-task-list">
              {selectedTasks.length === 0 && <div className="empty-state compact">На эту дату задач нет.</div>}
              {selectedTasks.map((task) => (
                <button className="day-task" key={task.id} type="button" onClick={() => onTaskEdit(task)}>
                  <strong>{task.title}</strong>
                  <span>{formatDateTime(task.dueDate)}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </DndContext>
    </section>
  )
}
