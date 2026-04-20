const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { applyWinIcon } = require('./win-icon.cjs')

module.exports = async (context) => {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const productExePath = join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)
  const electronExePath = join(context.appOutDir, 'electron.exe')
  const exePath = existsSync(productExePath) ? productExePath : electronExePath

  await applyWinIcon(exePath)
  await new Promise((resolve) => setTimeout(resolve, 1200))
}
