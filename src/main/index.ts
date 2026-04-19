import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { APP_NAME } from '@shared/app.constants'
import { createAppIcon } from './app/icon'
import { disconnectPrisma } from './database/prisma'
import { registerTaskHandlers } from './ipc/task.handlers'
import { startNotificationScheduler, stopNotificationScheduler } from './services/notification.service'
import { ensureDefaultColumns } from './services/task.service'

app.setName(APP_NAME)

if (process.platform === 'win32') {
  app.setAppUserModelId('com.tasker.desktop')
}

const loadRenderer = (mainWindow: BrowserWindow): void => {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  if (!rendererUrl) {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    return
  }

  const maxAttempts = 20
  const retryDelayMs = 250

  const loadDevServer = (attempt = 1): void => {
    mainWindow.loadURL(rendererUrl).catch(() => {
      if (attempt < maxAttempts) {
        setTimeout(() => loadDevServer(attempt + 1), retryDelayMs)
      }
    })
  }

  loadDevServer()
}

const createMainWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: APP_NAME,
    icon: createAppIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  loadRenderer(mainWindow)
}

app.whenReady().then(() => {
  registerTaskHandlers()
  ensureDefaultColumns().catch(console.error)
  startNotificationScheduler()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopNotificationScheduler()
  disconnectPrisma().catch(console.error)
})
