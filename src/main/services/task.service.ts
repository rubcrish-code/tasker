import { DEFAULT_COLUMNS } from '@shared/app.constants'
import type {
  KanbanColumnDto,
  TagDto,
  TagInput,
  TaskAppState,
  TaskDto,
  TaskInput,
  TaskPriority,
  TaskReorderItem
} from '@shared/task.types'
import { prisma } from '../database/prisma'

type TaskWithRelations = Awaited<ReturnType<typeof getTaskById>>

const TASK_INCLUDE = {
  checklistItems: {
    orderBy: {
      order: 'asc' as const
    }
  },
  notes: {
    orderBy: {
      createdAt: 'asc' as const
    }
  },
  tags: {
    include: {
      tag: true
    }
  }
}

const tagPalette = ['#dff2e9', '#e7f0ff', '#fff0c2', '#f3e8ff', '#ffe2e8', '#e3f7f7']
const columnPalette = ['#dff2e9', '#e7f0ff', '#fff0c2', '#f3e8ff', '#e3f7f7', '#f2eadf']

const toIso = (date: Date | null): string | null => {
  return date ? date.toISOString() : null
}

const normalizeTitle = (value: string): string => {
  return value.trim()
}

const statusForColumn = (columnId: string): string => {
  return DEFAULT_COLUMNS.find((column) => column.id === columnId)?.status ?? columnId.toUpperCase()
}

const colorForName = (name: string, palette = tagPalette): string => {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0)
  return palette[sum % palette.length]
}

const normalizeColor = (color: string | undefined, fallback: string): string => {
  return /^#[0-9a-fA-F]{6}$/.test(color ?? '') ? (color as string) : fallback
}

const getTaskById = (id: string) => {
  return prisma.task.findUnique({
    where: { id },
    include: TASK_INCLUDE
  })
}

const toColumnDto = (column: { id: string; title: string; color: string; order: number }): KanbanColumnDto => ({
  id: column.id,
  title: column.title,
  color: column.color,
  order: column.order
})

const toTagDto = (tag: { id: string; name: string; color: string }): TagDto => ({
  id: tag.id,
  name: tag.name,
  color: tag.color
})

const toTaskDto = (task: NonNullable<TaskWithRelations>): TaskDto => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority as TaskPriority,
  dueDate: toIso(task.dueDate),
  assigner: task.assigner,
  assignee: task.assignee,
  reminderHours: task.reminderHours,
  reminderMinutes: task.reminderMinutes,
  activityAt: toIso(task.activityAt),
  activityCount: task.activityCount,
  pinned: task.pinned,
  isCompleted: task.isCompleted,
  order: task.order,
  columnId: task.columnId,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
  checklistItems: task.checklistItems.map((item) => ({
    id: item.id,
    title: item.title,
    completed: item.completed,
    order: item.order
  })),
  tags: task.tags.map((taskTag) => toTagDto(taskTag.tag)),
  notes: task.notes.map((note) => ({
    id: note.id,
    body: note.body,
    createdAt: note.createdAt.toISOString()
  }))
})

const cleanInput = (input: TaskInput): TaskInput => ({
  ...input,
  title: normalizeTitle(input.title),
  description: input.description.trim(),
  assigner: input.assigner.trim(),
  assignee: input.assignee.trim(),
  reminderHours: Math.max(0, Math.trunc(Number(input.reminderHours) || 0)),
  reminderMinutes: Math.max(0, Math.trunc(Number(input.reminderMinutes) || 0)),
  checklistItems: input.checklistItems
    .map((item, index) => ({
      ...item,
      title: item.title.trim(),
      order: index
    }))
    .filter((item) => item.title.length > 0),
  tags: [
    ...new Map(
      input.tags
        .map((tag) => ({
          name: tag.name.trim(),
          color: normalizeColor(tag.color, colorForName(tag.name.trim()))
        }))
        .filter((tag) => tag.name.length > 0)
        .map((tag) => [tag.name, tag])
    ).values()
  ],
  notes: input.notes.map((note) => ({ ...note, body: note.body.trim() })).filter((note) => note.body.length > 0)
})

const syncTags = async (taskId: string, tags: TagInput[]): Promise<void> => {
  await prisma.taskTag.deleteMany({
    where: { taskId }
  })

  for (const tagInput of tags) {
    const tag = await prisma.tag.upsert({
      where: { name: tagInput.name },
      update: {
        color: tagInput.color
      },
      create: {
        name: tagInput.name,
        color: tagInput.color
      }
    })

    await prisma.taskTag.create({
      data: {
        taskId,
        tagId: tag.id
      }
    })
  }
}

const deleteOrphanTags = async (): Promise<void> => {
  await prisma.tag.deleteMany({
    where: {
      tasks: {
        none: {}
      }
    }
  })
}

const replaceTaskChildren = async (taskId: string, input: TaskInput): Promise<void> => {
  await prisma.checklistItem.deleteMany({ where: { taskId } })
  await prisma.taskNote.deleteMany({ where: { taskId } })

  if (input.checklistItems.length > 0) {
    await prisma.checklistItem.createMany({
      data: input.checklistItems.map((item, index) => ({
        taskId,
        title: item.title,
        completed: item.completed,
        order: index
      }))
    })
  }

  if (input.notes.length > 0) {
    await prisma.taskNote.createMany({
      data: input.notes.map((note) => ({
        taskId,
        body: note.body,
        createdAt: note.createdAt ? new Date(note.createdAt) : new Date()
      }))
    })
  }

  await syncTags(taskId, input.tags)
}

export const ensureDefaultColumns = async (): Promise<void> => {
  for (const [index, column] of DEFAULT_COLUMNS.entries()) {
    await prisma.kanbanColumn.upsert({
      where: { id: column.id },
      update: {},
      create: {
        id: column.id,
        title: column.title,
        color: column.color,
        order: index
      }
    })
  }

  const defaultColumns = await prisma.kanbanColumn.findMany({
    where: {
      id: {
        in: DEFAULT_COLUMNS.map((column) => column.id)
      }
    }
  })
  const allDefaultColumnsUseMigrationColor =
    defaultColumns.length === DEFAULT_COLUMNS.length && defaultColumns.every((column) => column.color === DEFAULT_COLUMNS[0].color)

  if (allDefaultColumnsUseMigrationColor) {
    await prisma.$transaction(
      DEFAULT_COLUMNS.map((column) =>
        prisma.kanbanColumn.update({
          where: { id: column.id },
          data: { color: column.color }
        })
      )
    )
  }
}

export const getAppState = async (): Promise<TaskAppState> => {
  await ensureDefaultColumns()
  await deleteOrphanTags()

  const [tasks, columns, tags] = await Promise.all([
    prisma.task.findMany({
      include: TASK_INCLUDE,
      orderBy: [{ pinned: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }]
    }),
    prisma.kanbanColumn.findMany({
      orderBy: { order: 'asc' }
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' }
    })
  ])

  return {
    tasks: tasks.map(toTaskDto),
    columns: columns.map(toColumnDto),
    tags: tags.map(toTagDto)
  }
}

export const createTask = async (rawInput: TaskInput): Promise<TaskAppState> => {
  await ensureDefaultColumns()

  const input = cleanInput(rawInput)
  if (!input.title) {
    throw new Error('Название задачи обязательно')
  }

  const column = await prisma.kanbanColumn.findFirst({
    where: { id: input.columnId },
    orderBy: { order: 'asc' }
  })
  const targetColumnId = column?.id ?? DEFAULT_COLUMNS[0].id
  const lastTask = await prisma.task.findFirst({
    where: { columnId: targetColumnId },
    orderBy: { order: 'desc' }
  })

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      status: input.status ?? statusForColumn(targetColumnId),
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigner: input.assigner,
      assignee: input.assignee,
      reminderHours: input.reminderHours,
      reminderMinutes: input.reminderMinutes,
      activityAt: new Date(),
      activityCount: 1,
      columnId: targetColumnId,
      order: (lastTask?.order ?? -1) + 1
    }
  })

  await replaceTaskChildren(task.id, input)
  return getAppState()
}

export const updateTask = async (id: string, rawInput: TaskInput): Promise<TaskAppState> => {
  const input = cleanInput(rawInput)
  if (!input.title) {
    throw new Error('Название задачи обязательно')
  }

  await prisma.task.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      status: input.status ?? statusForColumn(input.columnId),
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigner: input.assigner,
      assignee: input.assignee,
      reminderHours: input.reminderHours,
      reminderMinutes: input.reminderMinutes,
      columnId: input.columnId,
      activityAt: new Date(),
      activityCount: {
        increment: 1
      },
      dueSoonNotifiedAt: null,
      overdueNotifiedAt: null
    }
  })

  await replaceTaskChildren(id, input)
  return getAppState()
}

export const deleteTask = async (id: string): Promise<TaskAppState> => {
  await prisma.task.delete({
    where: { id }
  })
  return getAppState()
}

export const reorderTasks = async (items: TaskReorderItem[]): Promise<TaskAppState> => {
  await prisma.$transaction(
    items.map((item) =>
      prisma.task.update({
        where: { id: item.id },
        data: {
          columnId: item.columnId,
          status: statusForColumn(item.columnId),
          order: item.order,
          activityAt: new Date()
        }
      })
    )
  )
  return getAppState()
}

export const setPinned = async (id: string, pinned: boolean): Promise<TaskAppState> => {
  await prisma.task.update({
    where: { id },
    data: { pinned }
  })
  return getAppState()
}

export const setCompleted = async (id: string, completed: boolean): Promise<TaskAppState> => {
  await prisma.task.update({
    where: { id },
    data: {
      isCompleted: completed,
      status: completed ? 'DONE' : undefined,
      columnId: completed ? 'done' : undefined,
      activityAt: new Date()
    }
  })
  return getAppState()
}

export const updateDueDate = async (id: string, dueDate: string | null): Promise<TaskAppState> => {
  await prisma.task.update({
    where: { id },
    data: {
      dueDate: dueDate ? new Date(dueDate) : null,
      dueSoonNotifiedAt: null,
      overdueNotifiedAt: null,
      activityAt: new Date(),
      activityCount: {
        increment: 1
      }
    }
  })
  return getAppState()
}

export const createColumn = async (title: string, color?: string): Promise<TaskAppState> => {
  const cleanTitle = normalizeTitle(title)
  if (!cleanTitle) {
    throw new Error('Название колонки обязательно')
  }

  const lastColumn = await prisma.kanbanColumn.findFirst({
    orderBy: { order: 'desc' }
  })

  await prisma.kanbanColumn.create({
    data: {
      title: cleanTitle,
      color: normalizeColor(color, colorForName(cleanTitle, columnPalette)),
      order: (lastColumn?.order ?? -1) + 1
    }
  })

  return getAppState()
}

export const updateColumn = async (id: string, title: string, color?: string): Promise<TaskAppState> => {
  const cleanTitle = normalizeTitle(title)
  if (!cleanTitle) {
    throw new Error('Название колонки обязательно')
  }

  await prisma.kanbanColumn.update({
    where: { id },
    data: {
      title: cleanTitle,
      color: normalizeColor(color, colorForName(cleanTitle, columnPalette))
    }
  })

  return getAppState()
}

export const deleteColumn = async (id: string): Promise<TaskAppState> => {
  const columns = await prisma.kanbanColumn.findMany({
    orderBy: { order: 'asc' }
  })

  if (columns.length <= 1) {
    throw new Error('Нельзя удалить единственную колонку')
  }

  const fallback = columns.find((column) => column.id !== id)
  if (!fallback) {
    throw new Error('Не найдена колонка для переноса задач')
  }

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { columnId: id },
      data: {
        columnId: fallback.id,
        status: statusForColumn(fallback.id)
      }
    }),
    prisma.kanbanColumn.delete({
      where: { id }
    })
  ])

  return getAppState()
}

export const getTasksForNotifications = async () => {
  return prisma.task.findMany({
    where: {
      dueDate: {
        not: null
      },
      isCompleted: false
    }
  })
}

export const markDueSoonNotified = async (id: string): Promise<void> => {
  await prisma.task.update({
    where: { id },
    data: {
      dueSoonNotifiedAt: new Date()
    }
  })
}

export const markOverdueNotified = async (id: string): Promise<void> => {
  await prisma.task.update({
    where: { id },
    data: {
      overdueNotifiedAt: new Date()
    }
  })
}

const parseNullableDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const parseDateOrNow = (value: string | null | undefined): Date => {
  const date = parseNullableDate(value)
  return date ?? new Date()
}

const normalizePriority = (priority: string): TaskPriority => {
  return priority === 'LOW' || priority === 'HIGH' || priority === 'MEDIUM' ? priority : 'MEDIUM'
}

export const replaceAppState = async (state: TaskAppState): Promise<TaskAppState> => {
  await prisma.$transaction([
    prisma.taskTag.deleteMany(),
    prisma.checklistItem.deleteMany(),
    prisma.taskNote.deleteMany(),
    prisma.task.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.kanbanColumn.deleteMany()
  ])

  const columns = state.columns.length > 0
    ? state.columns
    : DEFAULT_COLUMNS.map((column, index) => ({
        id: column.id,
        title: column.title,
        color: column.color,
        order: index
      }))

  for (const [index, column] of columns.entries()) {
    await prisma.kanbanColumn.create({
      data: {
        id: column.id,
        title: normalizeTitle(column.title) || `Column ${index + 1}`,
        color: normalizeColor(column.color, colorForName(column.title || `Column ${index + 1}`, columnPalette)),
        order: Number.isFinite(column.order) ? column.order : index
      }
    })
  }

  for (const tag of state.tags) {
    const cleanName = tag.name.trim()
    if (!cleanName) {
      continue
    }

    await prisma.tag.create({
      data: {
        id: tag.id,
        name: cleanName,
        color: normalizeColor(tag.color, colorForName(cleanName))
      }
    })
  }

  const validColumnIds = new Set(columns.map((column) => column.id))
  const fallbackColumnId = columns[0]?.id ?? DEFAULT_COLUMNS[0].id

  for (const [index, task] of state.tasks.entries()) {
    const columnId = validColumnIds.has(task.columnId) ? task.columnId : fallbackColumnId

    await prisma.task.create({
      data: {
        id: task.id,
        title: normalizeTitle(task.title) || `Task ${index + 1}`,
        description: task.description ?? '',
        status: task.status || statusForColumn(columnId),
        priority: normalizePriority(task.priority),
        dueDate: parseNullableDate(task.dueDate),
        assigner: task.assigner ?? '',
        assignee: task.assignee ?? '',
        reminderHours: Math.max(0, Math.trunc(Number(task.reminderHours) || 0)),
        reminderMinutes: Math.max(0, Math.trunc(Number(task.reminderMinutes) || 0)),
        activityAt: parseNullableDate(task.activityAt),
        activityCount: Math.max(0, Math.trunc(Number(task.activityCount) || 0)),
        pinned: Boolean(task.pinned),
        isCompleted: Boolean(task.isCompleted),
        order: Number.isFinite(task.order) ? task.order : index,
        columnId,
        createdAt: parseDateOrNow(task.createdAt)
      }
    })

    if (task.checklistItems.length > 0) {
      await prisma.checklistItem.createMany({
        data: task.checklistItems
          .filter((item) => item.title.trim().length > 0)
          .map((item, checklistIndex) => ({
            id: item.id,
            taskId: task.id,
            title: item.title.trim(),
            completed: Boolean(item.completed),
            order: Number.isFinite(item.order) ? item.order : checklistIndex
          }))
      })
    }

    if (task.notes.length > 0) {
      await prisma.taskNote.createMany({
        data: task.notes
          .filter((note) => note.body.trim().length > 0)
          .map((note) => ({
            id: note.id,
            taskId: task.id,
            body: note.body.trim(),
            createdAt: parseDateOrNow(note.createdAt)
          }))
      })
    }

    for (const tag of task.tags) {
      const savedTag = await prisma.tag.findUnique({
        where: { name: tag.name }
      })

      if (savedTag) {
        await prisma.taskTag.create({
          data: {
            taskId: task.id,
            tagId: savedTag.id
          }
        })
      }
    }
  }

  await ensureDefaultColumns()
  return getAppState()
}
