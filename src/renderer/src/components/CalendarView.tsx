import { useEffect, useMemo, useState } from 'react'
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
import type { AppSettings } from '@shared/settings.types'
import type { TaskDto } from '@shared/task.types'
import { formatDateTime, mergeDayWithTaskTime, taskDueDayKey, toDayKey } from '../utils/date'

type CalendarViewProps = {
  tasks: TaskDto[]
  settings: AppSettings['calendar']
  onTaskEdit: (task: TaskDto) => void
  onTaskMove: (task: TaskDto, dueDate: string) => void
}

type CalendarMode = 'month' | 'week'

type CalendarDay = {
  key: string
  date: Date
  inCurrentMonth: boolean
}

const weekDayLabels = {
  monday: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  sunday: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
}
const monthDropPrefix = 'month:'
const weekDropPrefix = 'week:'

const cloneDate = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, days: number): Date => {
  const nextDate = cloneDate(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const dateFromDayKey = (dayKey: string): Date => {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const getWeekOffset = (date: Date, firstDayOfWeek: AppSettings['calendar']['firstDayOfWeek']): number => {
  return firstDayOfWeek === 'monday' ? (date.getDay() + 6) % 7 : date.getDay()
}

const startOfWeek = (date: Date, firstDayOfWeek: AppSettings['calendar']['firstDayOfWeek']): Date => {
  return addDays(date, -getWeekOffset(date, firstDayOfWeek))
}

const buildMonthDays = (monthDate: Date, firstDayOfWeek: AppSettings['calendar']['firstDayOfWeek']): CalendarDay[] => {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = getWeekOffset(firstDay, firstDayOfWeek)
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

const buildWeekDays = (weekDate: Date, firstDayOfWeek: AppSettings['calendar']['firstDayOfWeek']): CalendarDay[] => {
  const startDate = startOfWeek(weekDate, firstDayOfWeek)

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

const formatWeekTitle = (date: Date, firstDayOfWeek: AppSettings['calendar']['firstDayOfWeek']): string => {
  const firstDay = startOfWeek(date, firstDayOfWeek)
  const lastDay = addDays(firstDay, 6)
  const sameMonth = firstDay.getMonth() === lastDay.getMonth()
  const firstFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: sameMonth ? undefined : 'short' })
  const lastFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })

  return `${firstFormat.format(firstDay)} — ${lastFormat.format(lastDay)}`
}

const makeMonthDropId = (dayKey: string): string => `${monthDropPrefix}${dayKey}`
const makeWeekDropId = (dayKey: string, minuteOfDay: number): string => `${weekDropPrefix}${dayKey}:${minuteOfDay}`

const parseDropTarget = (id: string): { dayKey: string; minuteOfDay: number | null } | null => {
  if (id.startsWith(monthDropPrefix)) {
    return {
      dayKey: id.slice(monthDropPrefix.length),
      minuteOfDay: null
    }
  }

  if (!id.startsWith(weekDropPrefix)) {
    return null
  }

  const [dayKey, minuteValue] = id.slice(weekDropPrefix.length).split(':')
  const minuteOfDay = Number(minuteValue)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1439) {
    return null
  }

  return { dayKey, minuteOfDay }
}

const mergeWeekSlotWithTaskTime = (dayKey: string, minuteOfDay: number): string => {
  const [year, month, day] = dayKey.split('-').map(Number)
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = minuteOfDay % 60
  const nextDate = new Date(year, month - 1, day, hours, minutes, 0)

  return nextDate.toISOString()
}

const getSlotMinute = (isoDate: string, step: 30 | 60): number => {
  const date = new Date(isoDate)
  const minutes = date.getHours() * 60 + date.getMinutes()
  return Math.floor(minutes / step) * step
}

const formatSlotLabel = (minuteOfDay: number): string => {
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = minuteOfDay % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
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
  minuteOfDay,
  tasks,
  onTaskEdit
}: {
  day: CalendarDay
  minuteOfDay: number
  tasks: TaskDto[]
  onTaskEdit: (task: TaskDto) => void
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: makeWeekDropId(day.key, minuteOfDay) })

  return (
    <div ref={setNodeRef} className={isOver ? 'week-slot week-slot-over' : 'week-slot'}>
      {tasks.map((task) => (
        <CalendarTask key={task.id} task={task} onTaskEdit={onTaskEdit} showTime />
      ))}
    </div>
  )
}

export const CalendarView = ({ tasks, settings, onTaskEdit, onTaskMove }: CalendarViewProps) => {
  const [mode, setMode] = useState<CalendarMode>(settings.defaultMode)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => toDayKey(new Date()))
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const labels = weekDayLabels[settings.firstDayOfWeek]
  const monthDays = useMemo(() => buildMonthDays(viewDate, settings.firstDayOfWeek), [settings.firstDayOfWeek, viewDate])
  const weekDaysData = useMemo(() => buildWeekDays(viewDate, settings.firstDayOfWeek), [settings.firstDayOfWeek, viewDate])

  useEffect(() => {
    setMode(settings.defaultMode)
  }, [settings.defaultMode])

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
  const weekSlots = useMemo(() => {
    const step = settings.timeGridStepMinutes
    const configuredStart = Math.min(23, Math.max(0, settings.workdayStartHour)) * 60
    const configuredEnd = Math.min(24, Math.max(1, settings.workdayEndHour)) * 60
    const startMinute = Math.min(configuredStart, configuredEnd - step)
    const endMinute = Math.max(startMinute + step, configuredEnd)
    const taskMinutes = weekTasks
      .filter((task) => task.dueDate)
      .map((task) => getSlotMinute(task.dueDate as string, step))
    const minMinute = Math.min(startMinute, ...taskMinutes)
    const maxMinute = Math.max(endMinute - step, ...taskMinutes)

    return Array.from({ length: Math.floor((maxMinute - minMinute) / step) + 1 }, (_item, index) => minMinute + index * step)
  }, [settings.timeGridStepMinutes, settings.workdayEndHour, settings.workdayStartHour, weekTasks])

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
    setViewDate(dateFromDayKey(dayKey))
  }

  const handleModeChange = (nextMode: CalendarMode): void => {
    setMode(nextMode)
    setViewDate(dateFromDayKey(selectedDay))
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

    const dueDate = target.minuteOfDay === null
      ? mergeDayWithTaskTime(target.dayKey, task.dueDate)
      : mergeWeekSlotWithTaskTime(target.dayKey, target.minuteOfDay)

    onTaskMove(task, dueDate)
    selectDay(target.dayKey)
    setActiveTaskId(null)
  }

  return (
    <section className="content-section calendar-view">
      <div className="calendar-toolbar">
        <button className="button button-secondary" type="button" onClick={() => changePeriod(-1)}>
          Назад
        </button>
        <div className="calendar-toolbar-title">
          <h2>{mode === 'month' ? formatMonthTitle(viewDate) : formatWeekTitle(viewDate, settings.firstDayOfWeek)}</h2>
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
              {labels.map((day) => (
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
                  <span>{labels[index]}</span>
                  <strong>{new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(day.date)}</strong>
                </button>
              ))}
              {weekSlots.map((minuteOfDay) => (
                <div className="week-row" key={minuteOfDay}>
                  <div className="week-time-label">{formatSlotLabel(minuteOfDay)}</div>
                  {weekDaysData.map((day) => {
                    const slotTasks = (tasksByDay[day.key] ?? []).filter(
                      (task) => task.dueDate && getSlotMinute(task.dueDate, settings.timeGridStepMinutes) === minuteOfDay
                    )
                    return <WeekSlot key={`${day.key}-${minuteOfDay}`} day={day} minuteOfDay={minuteOfDay} tasks={slotTasks} onTaskEdit={onTaskEdit} />
                  })}
                </div>
              ))}
            </div>
          )}

          <aside className="day-panel">
            <h3>Задачи на дату</h3>
            <p>{new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(dateFromDayKey(selectedDay))}</p>
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
