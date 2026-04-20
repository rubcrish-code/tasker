import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type { TaskDto } from '@shared/task.types'
import { formatDateTime, mergeDayWithTaskTime, taskDueDayKey, toDayKey } from '../utils/date'

type CalendarViewProps = {
  tasks: TaskDto[]
  onTaskEdit: (task: TaskDto) => void
  onTaskMove: (task: TaskDto, dueDate: string) => void
}

type CalendarMode = 'month' | 'week'

type CalendarDay = {
  key: string
  date: Date
  inCurrentMonth: boolean
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const monthDropPrefix = 'month:'
const weekDropPrefix = 'week:'

const cloneDate = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, days: number): Date => {
  const nextDate = cloneDate(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const startOfWeek = (date: Date): Date => {
  const startOffset = (date.getDay() + 6) % 7
  return addDays(date, -startOffset)
}

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

const buildWeekDays = (weekDate: Date): CalendarDay[] => {
  const startDate = startOfWeek(weekDate)

  return Array.from({ length: 7 }, (_item, index) => {
    const date = addDays(startDate, index)

    return {
      key: toDayKey(date),
      date,
      inCurrentMonth: true
    }
  })
}

const formatTime = (isoDate: string | null): string => {
  if (!isoDate) {
    return ''
  }

  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoDate))
}

const formatMonthTitle = (date: Date): string =>
  new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric'
  }).format(date)

const formatWeekTitle = (date: Date): string => {
  const firstDay = startOfWeek(date)
  const lastDay = addDays(firstDay, 6)
  const sameMonth = firstDay.getMonth() === lastDay.getMonth()
  const firstFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: sameMonth ? undefined : 'short' })
  const lastFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })

  return `${firstFormat.format(firstDay)} — ${lastFormat.format(lastDay)}`
}

const makeMonthDropId = (dayKey: string): string => `${monthDropPrefix}${dayKey}`
const makeWeekDropId = (dayKey: string, hour: number): string => `${weekDropPrefix}${dayKey}:${hour}`

const parseDropTarget = (id: string): { dayKey: string; hour: number | null } | null => {
  if (id.startsWith(monthDropPrefix)) {
    return {
      dayKey: id.slice(monthDropPrefix.length),
      hour: null
    }
  }

  if (!id.startsWith(weekDropPrefix)) {
    return null
  }

  const [dayKey, hourValue] = id.slice(weekDropPrefix.length).split(':')
  const hour = Number(hourValue)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    return null
  }

  return { dayKey, hour }
}

const mergeWeekSlotWithTaskTime = (dayKey: string, hour: number, isoDate: string | null): string => {
  const [year, month, day] = dayKey.split('-').map(Number)
  const base = isoDate ? new Date(isoDate) : new Date()
  const nextDate = new Date(year, month - 1, day, hour, base.getMinutes(), 0)

  return nextDate.toISOString()
}

const CalendarTask = ({
  task,
  onTaskEdit,
  showTime = false
}: {
  task: TaskDto
  onTaskEdit: (task: TaskDto) => void
  showTime?: boolean
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id
  })

  const style = transform && !isDragging
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)'
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
      {showTime && <span className="calendar-task-time">{formatTime(task.dueDate)}</span>}
      <span>{task.title}</span>
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
  const { setNodeRef, isOver } = useDroppable({ id: makeMonthDropId(day.key) })

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

const WeekSlot = ({
  day,
  hour,
  tasks,
  onTaskEdit
}: {
  day: CalendarDay
  hour: number
  tasks: TaskDto[]
  onTaskEdit: (task: TaskDto) => void
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: makeWeekDropId(day.key, hour) })

  return (
    <div ref={setNodeRef} className={isOver ? 'week-slot week-slot-over' : 'week-slot'}>
      {tasks.map((task) => (
        <CalendarTask key={task.id} task={task} onTaskEdit={onTaskEdit} showTime />
      ))}
    </div>
  )
}

export const CalendarView = ({ tasks, onTaskEdit, onTaskMove }: CalendarViewProps) => {
  const [mode, setMode] = useState<CalendarMode>('month')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => toDayKey(new Date()))
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const monthDays = useMemo(() => buildMonthDays(viewDate), [viewDate])
  const weekDaysData = useMemo(() => buildWeekDays(viewDate), [viewDate])
  const tasksByDay = useMemo(() => {
    return tasks.reduce<Record<string, TaskDto[]>>((acc, task) => {
      const key = taskDueDayKey(task.dueDate)
      if (!key) {
        return acc
      }

      acc[key] = [...(acc[key] ?? []), task].sort((left, right) => {
        const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0
        const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0
        return leftTime - rightTime
      })
      return acc
    }, {})
  }, [tasks])
  const selectedTasks = tasksByDay[selectedDay] ?? []
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null
  const weekDayKeys = new Set(weekDaysData.map((day) => day.key))
  const weekTasks = tasks.filter((task) => {
    const dayKey = taskDueDayKey(task.dueDate)
    return dayKey ? weekDayKeys.has(dayKey) : false
  })
  const weekHours = useMemo(() => {
    const taskHours = weekTasks.map((task) => (task.dueDate ? new Date(task.dueDate).getHours() : 9))
    const minHour = Math.min(8, ...taskHours)
    const maxHour = Math.max(20, ...taskHours)

    return Array.from({ length: maxHour - minHour + 1 }, (_item, index) => minHour + index)
  }, [weekTasks])

  const changePeriod = (delta: number): void => {
    setViewDate((current) => {
      const nextDate = new Date(current)
      if (mode === 'month') {
        nextDate.setMonth(current.getMonth() + delta)
      } else {
        nextDate.setDate(current.getDate() + delta * 7)
      }
      return nextDate
    })
  }

  const selectDay = (dayKey: string): void => {
    setSelectedDay(dayKey)
    setViewDate(new Date(dayKey))
  }

  const handleModeChange = (nextMode: CalendarMode): void => {
    setMode(nextMode)
    setViewDate(new Date(selectedDay))
  }

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveTaskId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (!over) {
      setActiveTaskId(null)
      return
    }

    const task = tasks.find((candidate) => candidate.id === active.id)
    const target = parseDropTarget(String(over.id))

    if (!task || !target) {
      setActiveTaskId(null)
      return
    }

    const dueDate = target.hour === null
      ? mergeDayWithTaskTime(target.dayKey, task.dueDate)
      : mergeWeekSlotWithTaskTime(target.dayKey, target.hour, task.dueDate)

    onTaskMove(task, dueDate)
    selectDay(target.dayKey)
    setActiveTaskId(null)
  }

  return (
    <section className="content-section">
      <div className="calendar-toolbar">
        <button className="button button-secondary" type="button" onClick={() => changePeriod(-1)}>
          Назад
        </button>
        <div className="calendar-toolbar-title">
          <h2>{mode === 'month' ? formatMonthTitle(viewDate) : formatWeekTitle(viewDate)}</h2>
          <div className="calendar-mode-switch" aria-label="Режим календаря">
            <button className={mode === 'month' ? 'mode-button mode-button-active' : 'mode-button'} type="button" onClick={() => handleModeChange('month')}>
              Месяц
            </button>
            <button className={mode === 'week' ? 'mode-button mode-button-active' : 'mode-button'} type="button" onClick={() => handleModeChange('week')}>
              Неделя
            </button>
          </div>
        </div>
        <button className="button button-secondary" type="button" onClick={() => changePeriod(1)}>
          Вперёд
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragCancel={() => setActiveTaskId(null)} onDragEnd={handleDragEnd}>
        <div className={mode === 'month' ? 'calendar-layout' : 'calendar-layout calendar-layout-week'}>
          {mode === 'month' ? (
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
                  onSelect={selectDay}
                  onTaskEdit={onTaskEdit}
                />
              ))}
            </div>
          ) : (
            <div className="week-scheduler">
              <div className="week-scheduler-head time-head" />
              {weekDaysData.map((day, index) => (
                <button
                  className={selectedDay === day.key ? 'week-day-head week-day-head-selected' : 'week-day-head'}
                  key={day.key}
                  type="button"
                  onClick={() => selectDay(day.key)}
                >
                  <span>{weekDays[index]}</span>
                  <strong>{new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(day.date)}</strong>
                </button>
              ))}
              {weekHours.map((hour) => (
                <div className="week-row" key={hour}>
                  <div className="week-time-label">{String(hour).padStart(2, '0')}:00</div>
                  {weekDaysData.map((day) => {
                    const slotTasks = (tasksByDay[day.key] ?? []).filter((task) => task.dueDate && new Date(task.dueDate).getHours() === hour)
                    return <WeekSlot key={`${day.key}-${hour}`} day={day} hour={hour} tasks={slotTasks} onTaskEdit={onTaskEdit} />
                  })}
                </div>
              ))}
            </div>
          )}

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
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <button className="calendar-task calendar-task-overlay" type="button">
              <span>{activeTask.title}</span>
            </button>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
