import { nativeImage, type NativeImage } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const iconFileName = process.platform === 'win32' ? 'tasker-icon.ico' : 'tasker-icon.png'

export const getAppIconPath = (): string => {
  const iconPaths = [
    join(process.cwd(), 'resources', iconFileName),
    join(process.resourcesPath, 'resources', iconFileName),
    join(process.resourcesPath, iconFileName),
    join(process.cwd(), 'resources', 'tasker-icon.png'),
    join(process.resourcesPath, 'resources', 'tasker-icon.png'),
    join(process.resourcesPath, 'tasker-icon.png')
  ]

  for (const iconPath of iconPaths) {
    if (existsSync(iconPath)) {
      return iconPath
    }
  }

  return join(process.cwd(), 'resources', 'tasker-icon.png')
}

export const createAppIcon = (): NativeImage => nativeImage.createFromPath(getAppIconPath())
