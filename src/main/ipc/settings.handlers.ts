import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import type { AppSettings } from '@shared/settings.types'
import {
  backupDatabase,
  exportData,
  getSettings,
  getSettingsInfo,
  importData,
  openDataFolder,
  updateSettings
} from '../services/settings.service'
import { restartNotificationScheduler } from '../services/notification.service'

export const registerSettingsHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.settingsGet, () => getSettings())
  ipcMain.handle(IPC_CHANNELS.settingsGetInfo, () => getSettingsInfo())
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, async (_event, settings: Partial<AppSettings>) => {
    const nextSettings = await updateSettings(settings)
    restartNotificationScheduler()
    return nextSettings
  })
  ipcMain.handle(IPC_CHANNELS.dataExport, () => exportData())
  ipcMain.handle(IPC_CHANNELS.dataImport, async () => {
    const result = await importData()
    restartNotificationScheduler()
    return result
  })
  ipcMain.handle(IPC_CHANNELS.dataBackup, () => backupDatabase())
  ipcMain.handle(IPC_CHANNELS.dataOpenFolder, () => openDataFolder())
}
