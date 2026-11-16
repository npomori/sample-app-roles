import type { PageAccess, PublicUser } from 'participant-app-base'
import { describe, expect, it } from 'vitest'
import { getRolesPrisma } from '@/lib/roles-prisma'
import { updateNote } from '@/server/note'
import { appRoleLabel, readAssignment, readNote, saveNoteBody } from '@/server/roles'

const userId = 'user-1'
const original = '元の本文'

function user(role: string | null, id = userId): PublicUser {
  return { id, email: 'a@example.com', name: 'テスト', role }
}

function admitted(role: string | null, id = userId): PageAccess {
  return { kind: 'ok', user: user(role, id) }
}

function post(body: string): Request {
  return new Request('http://roles.localhost:4000/admin/note', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ body })
  })
}

async function expectUnchanged(response: Response, status: number, message: string): Promise<void> {
  expect(response.status).toBe(status)
  expect(await response.text()).toBe(message)
  expect(await readNote()).toBe(original)
}

describe('割り当てと見本', () => {
  it('行が無い利用者は未割り当てで、本文は空', async () => {
    expect(await readAssignment(userId)).toBeNull()
    expect(appRoleLabel(await readAssignment(userId))).toBe('未割り当て')
    expect(await readNote()).toBe('')
  })

  it('保存した editor と viewer を読む', async () => {
    const prisma = getRolesPrisma()
    await prisma.assignment.create({ data: { userId, role: 'editor' } })
    await prisma.assignment.create({ data: { userId: 'user-2', role: 'viewer' } })
    expect(await readAssignment(userId)).toBe('editor')
    expect(appRoleLabel('editor')).toBe('editor')
    expect(await readAssignment('user-2')).toBe('viewer')
    expect(appRoleLabel('viewer')).toBe('viewer')
  })

  it('二度目の保存は同じ1行を置き換える', async () => {
    await saveNoteBody('一度目')
    await saveNoteBody('二度目')
    expect(await getRolesPrisma().note.count()).toBe(1)
    expect(await readNote()).toBe('二度目')
  })

  it('共通 admin は割り当てが無くても本文を書く', async () => {
    const response = await updateNote(post('管理者が書いた'), admitted('admin'))
    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe('/admin')
    expect(await readNote()).toBe('管理者が書いた')
  })

  it('共通 admin は viewer でも本文を書く', async () => {
    await getRolesPrisma().assignment.create({ data: { userId, role: 'viewer' } })
    const response = await updateNote(post('管理者'), admitted('admin'))
    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe('/admin')
    expect(await readNote()).toBe('管理者')
  })

  it('共通 user は editor のとき本文を書く', async () => {
    await getRolesPrisma().assignment.create({ data: { userId, role: 'editor' } })
    const response = await updateNote(post('ユーザーが書いた'), admitted('user'))
    expect(response.status).toBe(303)
    expect(await readNote()).toBe('ユーザーが書いた')
  })

  it('共通 manager は editor のとき本文を書く', async () => {
    await getRolesPrisma().assignment.create({ data: { userId, role: 'editor' } })
    const response = await updateNote(post('管理者ユーザーが書いた'), admitted('manager'))
    expect(response.status).toBe(303)
    expect(await readNote()).toBe('管理者ユーザーが書いた')
  })

  it('viewer の共通 user は本文を変えない', async () => {
    await saveNoteBody(original)
    await getRolesPrisma().assignment.create({ data: { userId, role: 'viewer' } })
    await expectUnchanged(
      await updateNote(post('変更'), admitted('user')),
      403,
      'この操作を行う権限がありません'
    )
  })

  it('未割り当ての共通 user と manager は本文を変えない', async () => {
    await saveNoteBody(original)
    await expectUnchanged(
      await updateNote(post('変更'), admitted('user')),
      403,
      'この操作を行う権限がありません'
    )
    await expectUnchanged(
      await updateNote(post('変更'), admitted('manager')),
      403,
      'この操作を行う権限がありません'
    )
  })

  it('それ以外の共通ロールは editor が保存されていても本文を変えない', async () => {
    await saveNoteBody(original)
    await getRolesPrisma().assignment.create({ data: { userId, role: 'editor' } })
    await expectUnchanged(
      await updateNote(post('変更'), admitted('guest')),
      403,
      'この操作を行う権限がありません'
    )
    await expectUnchanged(
      await updateNote(post('変更'), admitted(null)),
      403,
      'この操作を行う権限がありません'
    )
  })

  it('入場済みでない更新は本文を変えない', async () => {
    await saveNoteBody(original)
    await expectUnchanged(await updateNote(post('変更'), { kind: 'public' }), 401, 'ログインが必要です')
    await expectUnchanged(
      await updateNote(post('変更'), { kind: 'no-grant', user: user('admin') }),
      401,
      'ログインが必要です'
    )
  })
})
