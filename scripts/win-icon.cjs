const { existsSync } = require('node:fs')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')
const iconPath = join(rootDir, 'resources', 'tasker-icon.ico')

const applyWinIcon = async (exePath) => {
  if (!existsSync(exePath)) {
    return false
  }

  const { rcedit } = await import('rcedit')
  await rcedit(exePath, {
    icon: iconPath
  })

  return true
}

module.exports = {
  applyWinIcon,
  rootDir
}
