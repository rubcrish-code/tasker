import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcChannels'
import type { AppSettings } from '../shared/settings.types'
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
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    update: (settings: Partial<AppSettings>) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, settings),
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGetInfo)
  },
  data: {
    export: () => ipcRenderer.invoke(IPC_CHANNELS.dataExport),
    import: () => ipcRenderer.invoke(IPC_CHANNELS.dataImport),
    backup: () => ipcRenderer.invoke(IPC_CHANNELS.dataBackup),
    openFolder: () => ipcRenderer.invoke(IPC_CHANNELS.dataOpenFolder)
  }
}

contextBridge.exposeInMainWorld('tasker', taskerApi)
