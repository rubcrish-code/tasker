import type { TaskDto } from '@shared/task.types'

export const checklistProgress = (task: TaskDto): string => {
  const total = task.checklistItems.length

  if (total === 0) {
    return '0/0'
  }

  const completed = task.checklistItems.filter((item) => item.completed).length
  return `${completed}/${total}`
}

export const initials = (name: string): string => {
  const cleanName = name.trim()

  if (!cleanName) {
    return '—'
  }

  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export const personName = (name: string): string => {
  return name.trim() || 'Не указан'
}
