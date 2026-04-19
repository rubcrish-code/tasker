export const toDateTimeInputValue = (isoDate: string | null): string => {
  if (!isoDate) {
    return ''
  }

  const date = new Date(isoDate)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

export const fromDateTimeInputValue = (value: string): string | null => {
  if (!value) {
    return null
  }

  return new Date(value).toISOString()
}

export const formatDateTime = (isoDate: string | null): string => {
  if (!isoDate) {
    return 'Без срока'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoDate))
}

export const formatDate = (isoDate: string | null): string => {
  if (!isoDate) {
    return 'Без срока'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(isoDate))
}

export const toDayKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const taskDueDayKey = (isoDate: string | null): string | null => {
  return isoDate ? toDayKey(new Date(isoDate)) : null
}

export const mergeDayWithTaskTime = (dayKey: string, isoDate: string | null): string => {
  const [year, month, day] = dayKey.split('-').map(Number)
  const base = isoDate ? new Date(isoDate) : new Date()
  const nextDate = new Date(year, month - 1, day, base.getHours() || 9, base.getMinutes(), 0)
  return nextDate.toISOString()
}

export const deadlineState = (isoDate: string | null): 'none' | 'soon' | 'overdue' | 'ok' => {
  if (!isoDate) {
    return 'none'
  }

  const now = Date.now()
  const due = new Date(isoDate).getTime()
  const dayMs = 24 * 60 * 60 * 1000

  if (due < now) {
    return 'overdue'
  }

  if (due - now <= dayMs) {
    return 'soon'
  }

  return 'ok'
}
