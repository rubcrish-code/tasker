import { Notification } from 'electron'
import { APP_NAME } from '@shared/app.constants'
import { createAppIcon } from '../app/icon'
import { getTasksForNotifications, markDueSoonNotified, markOverdueNotified } from './task.service'

let notificationTimer: NodeJS.Timeout | null = null

const pluralizeMinutes = (minutes: number): string => {
  const lastTwoDigits = minutes % 100
  const lastDigit = minutes % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${minutes} минут`
  }

  if (lastDigit === 1) {
    return `${minutes} минуту`
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${minutes} минуты`
  }

  return `${minutes} минут`
}

const formatLeadTime = (dueTime: number, now: number): string => {
  const totalMinutes = Math.max(1, Math.ceil((dueTime - now) / 60_000))

  if (totalMinutes < 60) {
    return pluralizeMinutes(totalMinutes)
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`
}

const showNotification = (title: string, body: string): void => {
  if (!Notification.isSupported()) {
    return
  }

  new Notification({
    title,
    body,
    icon: createAppIcon(),
    silent: false
  }).show()
}

const checkTaskNotifications = async (): Promise<void> => {
  const now = Date.now()
  const tasks = await getTasksForNotifications()

  for (const task of tasks) {
    if (!task.dueDate) {
      continue
    }

    const dueTime = task.dueDate.getTime()
    const reminderMs = (task.reminderHours * 60 + task.reminderMinutes) * 60 * 1000
    const shouldNotifySoon = now >= dueTime - reminderMs && now < dueTime
    const isOverdue = now >= dueTime

    if (shouldNotifySoon && !task.dueSoonNotifiedAt) {
      showNotification(`${APP_NAME} — скоро срок задачи`, `Через ${formatLeadTime(dueTime, now)} наступит срок задачи «${task.title}».`)
      await markDueSoonNotified(task.id)
    }

    if (isOverdue && !task.overdueNotifiedAt) {
      showNotification(`${APP_NAME} — задача просрочена`, `Срок задачи «${task.title}» уже истёк.`)
      await markOverdueNotified(task.id)
    }
  }
}

export const startNotificationScheduler = (): void => {
  if (notificationTimer) {
    return
  }

  checkTaskNotifications().catch(console.error)
  notificationTimer = setInterval(() => {
    checkTaskNotifications().catch(console.error)
  }, 30_000)
}

export const stopNotificationScheduler = (): void => {
  if (!notificationTimer) {
    return
  }

  clearInterval(notificationTimer)
  notificationTimer = null
}
