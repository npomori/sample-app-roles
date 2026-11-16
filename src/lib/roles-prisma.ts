import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/roles/client'

const globalForRoles = globalThis as unknown as {
  rolesPrisma?: PrismaClient
}

function databaseUrl(): string {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL がありません')
  return url
}

export function getRolesPrisma(): PrismaClient {
  if (globalForRoles.rolesPrisma) return globalForRoles.rolesPrisma
  const prisma = new PrismaClient({
    adapter: new PrismaPg(databaseUrl()),
    log: ['error', 'warn']
  })
  if (process.env['NODE_ENV'] !== 'production') globalForRoles.rolesPrisma = prisma
  return prisma
}
