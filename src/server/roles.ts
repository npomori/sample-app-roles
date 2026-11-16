import { getRolesPrisma } from '@/lib/roles-prisma'

export type AppRoleName = 'editor' | 'viewer'

const NOTE_ID = 1

export function canEditNote(commonRole: string | null, appRole: AppRoleName | null): boolean {
  if (commonRole === 'admin') return true
  if (commonRole !== 'user' && commonRole !== 'manager') return false
  return appRole === 'editor'
}

export function appRoleLabel(role: AppRoleName | null): string {
  if (role === 'editor' || role === 'viewer') return role
  return '未割り当て'
}

function toAppRole(role: string): AppRoleName | null {
  if (role === 'editor' || role === 'viewer') return role
  return null
}

export async function readAssignment(userId: string): Promise<AppRoleName | null> {
  const row = await getRolesPrisma().assignment.findUnique({ where: { userId } })
  if (!row) return null
  return toAppRole(row.role)
}

export async function readNote(): Promise<string> {
  const row = await getRolesPrisma().note.findUnique({ where: { id: NOTE_ID } })
  return row?.body ?? ''
}

export async function saveNoteBody(body: string): Promise<void> {
  await getRolesPrisma().note.upsert({
    where: { id: NOTE_ID },
    create: { id: NOTE_ID, body },
    update: { body }
  })
}
