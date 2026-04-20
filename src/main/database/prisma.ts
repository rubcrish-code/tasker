import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

type PrismaClientModule = typeof import('@prisma/client')

const require = createRequire(import.meta.url)

const getPrismaClientModule = (): PrismaClientModule => {
  if (app.isPackaged) {
    return require(join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '.prisma', 'client')) as PrismaClientModule
  }

  return require('@prisma/client') as PrismaClientModule
}

const { PrismaClient } = getPrismaClientModule()

const getDatabasePath = (): string => {
  if (process.env.TASKER_DATABASE_PATH) {
    return process.env.TASKER_DATABASE_PATH
  }

  if (app.isPackaged) {
    return join(app.getPath('userData'), 'tasker.db')
  }

  return join(process.cwd(), 'prisma', 'tasker.db')
}

export const databasePath = getDatabasePath()

mkdirSync(dirname(databasePath), { recursive: true })

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${databasePath.replace(/\\/g, '/')}`
    }
  }
})

const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS "KanbanColumn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#dff2e9',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'BACKLOG',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "assigner" TEXT NOT NULL DEFAULT '',
    "assignee" TEXT NOT NULL DEFAULT '',
    "reminderHours" INTEGER NOT NULL DEFAULT 0,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "activityAt" DATETIME,
    "activityCount" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "dueSoonNotifiedAt" DATETIME,
    "overdueNotifiedAt" DATETIME,
    "order" INTEGER NOT NULL DEFAULT 0,
    "columnId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "KanbanColumn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#e3f3ec'
  )`,
  `CREATE TABLE IF NOT EXISTS "TaskTag" (
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("taskId", "tagId"),
    CONSTRAINT "TaskTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "TaskNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskNote_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name")`,
  `CREATE INDEX IF NOT EXISTS "Task_columnId_order_idx" ON "Task"("columnId", "order")`,
  `CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate")`,
  `CREATE INDEX IF NOT EXISTS "Task_pinned_idx" ON "Task"("pinned")`,
  `CREATE INDEX IF NOT EXISTS "ChecklistItem_taskId_order_idx" ON "ChecklistItem"("taskId", "order")`,
  `CREATE INDEX IF NOT EXISTS "TaskNote_taskId_createdAt_idx" ON "TaskNote"("taskId", "createdAt")`
]

export const ensureDatabase = async (): Promise<void> => {
  for (const statement of createTableStatements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect()
}
