import { app, BrowserWindow, Menu, Notification, Tray } from 'electron'
import { join } from 'node:path'
import { APP_NAME } from '@shared/app.constants'
import { createAppIcon } from './app/icon'
import { disconnectPrisma, ensureDatabase } from './database/prisma'
import { registerSettingsHandlers } from './ipc/settings.handlers'
import { registerTaskHandlers } from './ipc/task.handlers'
import { startNotificationScheduler, stopNotificationScheduler } from './services/notification.service'
import { getSettingsSync } from './services/settings.service'
import { ensureDefaultColumns } from './services/task.service'

app.setName(APP_NAME)

if (process.platform === 'win32') {
  app.setAppUserModelId('com.tasker.desktop')
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let backgroundHintShown = false
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
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

const showBackgroundHint = (): void => {
  if (backgroundHintShown || !Notification.isSupported()) {
    return
  }

  backgroundHintShown = true
  new Notification({
    title: `${APP_NAME} работает в фоне`,
    body: 'Окно скрыто, но напоминания о задачах продолжат приходить. Для полного выхода используйте меню в трее.',
    icon: createAppIcon(),
    silent: false
  }).show()
}

const showMainWindow = (): void => {
  if (!app.isReady()) {
    return
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.moveTop()
  mainWindow.focus()
}

if (hasSingleInstanceLock) {
  app.on('second-instance', () => {
    showMainWindow()
  })
}

const createTray = (): void => {
  if (tray) {
    return
  }

  tray = new Tray(createAppIcon())
  tray.setToolTip(APP_NAME)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Открыть Tasker',
        click: showMainWindow
      },
      {
        type: 'separator'
      },
      {
        label: 'Выход',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
  )
  tray.on('double-click', showMainWindow)
}

const createMainWindow = (): void => {
  mainWindow = new BrowserWindow({
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

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return
    }

    if (getSettingsSync().notifications.closeBehavior === 'quit') {
      isQuitting = true
      return
    }

    event.preventDefault()
    mainWindow?.hide()
    showBackgroundHint()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

if (hasSingleInstanceLock) {
  app.whenReady().then(async () => {
    registerTaskHandlers()
    registerSettingsHandlers()
    await ensureDatabase()
    await ensureDefaultColumns()
    createTray()
    startNotificationScheduler()
    createMainWindow()

    app.on('activate', () => {
      showMainWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (isQuitting && process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  stopNotificationScheduler()
  disconnectPrisma().catch(console.error)
})
