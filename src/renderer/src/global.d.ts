import type { TaskerApi } from '../../shared/task.types'

declare global {
  interface Window {
    tasker: TaskerApi
  }
}

export {}
