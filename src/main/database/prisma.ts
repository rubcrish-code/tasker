import { PrismaClient } from '@prisma/client'
import { join } from 'node:path'

const databasePath = join(process.cwd(), 'prisma', 'tasker.db').replace(/\\/g, '/')

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${databasePath}`
    }
  }
})

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect()
}
