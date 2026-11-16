import type { PageAccess } from 'participant-app-base'
import { canEditNote, readAssignment, saveNoteBody } from '@/server/roles'

function text(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

export async function updateNote(request: Request, access: PageAccess): Promise<Response> {
  if (access.kind !== 'ok') return text(401, 'ログインが必要です')
  const form = await request.formData()
  const raw = form.get('body')
  const body = typeof raw === 'string' ? raw : ''
  const appRole = await readAssignment(access.user.id)
  if (!canEditNote(access.user.role, appRole)) return text(403, 'この操作を行う権限がありません')
  await saveNoteBody(body)
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/admin',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer'
    }
  })
}
