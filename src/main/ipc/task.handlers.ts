import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import type { TaskInput, TaskReorderItem } from '@shared/task.types'
import {
  createColumn,
  createTask,
  deleteColumn,
  deleteTask,
  getAppState,
  reorderTasks,
  setCompleted,
  setPinned,
  updateColumn,
  updateDueDate,
  updateTask
} from '../services/task.service'

export const registerTaskHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.tasksGetState, () => getAppState())
  ipcMain.handle(IPC_CHANNELS.tasksCreate, (_event, input: TaskInput) => createTask(input))
  ipcMain.handle(IPC_CHANNELS.tasksUpdate, (_event, id: string, input: TaskInput) => updateTask(id, input))
  ipcMain.handle(IPC_CHANNELS.tasksDelete, (_event, id: string) => deleteTask(id))
  ipcMain.handle(IPC_CHANNELS.tasksReorder, (_event, items: TaskReorderItem[]) => reorderTasks(items))
  ipcMain.handle(IPC_CHANNELS.tasksSetPinned, (_event, id: string, pinned: boolean) => setPinned(id, pinned))
  ipcMain.handle(IPC_CHANNELS.tasksSetCompleted, (_event, id: string, completed: boolean) => setCompleted(id, completed))
  ipcMain.handle(IPC_CHANNELS.tasksUpdateDueDate, (_event, id: string, dueDate: string | null) => updateDueDate(id, dueDate))
  ipcMain.handle(IPC_CHANNELS.columnsCreate, (_event, title: string, color: string) => createColumn(title, color))
  ipcMain.handle(IPC_CHANNELS.columnsUpdate, (_event, id: string, title: string, color: string) => updateColumn(id, title, color))
  ipcMain.handle(IPC_CHANNELS.columnsDelete, (_event, id: string) => deleteColumn(id))
}
