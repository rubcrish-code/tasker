import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcChannels'
import type { TaskInput, TaskReorderItem, TaskerApi } from '../shared/task.types'

const taskerApi: TaskerApi = {
  tasks: {
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.tasksGetState),
    create: (input: TaskInput) => ipcRenderer.invoke(IPC_CHANNELS.tasksCreate, input),
    update: (id: string, input: TaskInput) => ipcRenderer.invoke(IPC_CHANNELS.tasksUpdate, id, input),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.tasksDelete, id),
    reorder: (items: TaskReorderItem[]) => ipcRenderer.invoke(IPC_CHANNELS.tasksReorder, items),
    setPinned: (id: string, pinned: boolean) => ipcRenderer.invoke(IPC_CHANNELS.tasksSetPinned, id, pinned),
    setCompleted: (id: string, completed: boolean) => ipcRenderer.invoke(IPC_CHANNELS.tasksSetCompleted, id, completed),
    updateDueDate: (id: string, dueDate: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.tasksUpdateDueDate, id, dueDate)
  },
  columns: {
    create: (title: string, color: string) => ipcRenderer.invoke(IPC_CHANNELS.columnsCreate, title, color),
    update: (id: string, title: string, color: string) => ipcRenderer.invoke(IPC_CHANNELS.columnsUpdate, id, title, color),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.columnsDelete, id)
  }
}

contextBridge.exposeInMainWorld('tasker', taskerApi)
