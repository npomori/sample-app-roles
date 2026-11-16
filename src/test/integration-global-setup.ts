import fs from 'node:fs'
import pg from 'pg'
import { assertDistinctDatabase, testDatabaseUrl } from './integration-env'

export default async function setup(): Promise<void> {
  assertDistinctDatabase()
  const pool = new pg.Pool({
    connectionString: testDatabaseUrl(),
    connectionTimeoutMillis: 5000
  })
  pool.on('error', () => {})
  try {
    const existing = await pool.query<{ ready: string | null }>(
      `SELECT to_regclass('roles."Assignment"')::text AS ready`
    )
    if (!existing.rows[0]?.ready) {
      const sql = fs.readFileSync(
        new URL('../../prisma/migrations/20261116023000_roles/migration.sql', import.meta.url),
        'utf8'
      )
      await pool.query(sql)
    }
  } finally {
    await pool.end()
  }
}
