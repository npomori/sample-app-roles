import { afterAll, beforeEach } from 'vitest'
import pg from 'pg'
import { assertDistinctDatabase, testDatabaseUrl } from './integration-env'

assertDistinctDatabase()
process.env['DATABASE_URL'] = testDatabaseUrl()

const pool = new pg.Pool({
  connectionString: testDatabaseUrl(),
  connectionTimeoutMillis: 5000
})
pool.on('error', () => {})

beforeEach(async () => {
  await pool.query('DELETE FROM roles."Note"')
  await pool.query('DELETE FROM roles."Assignment"')
})

afterAll(async () => {
  await pool.end()
})
