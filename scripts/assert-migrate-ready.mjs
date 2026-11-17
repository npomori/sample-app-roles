import 'dotenv/config'
import pg from 'pg'

const ROLE = 'app_participant'
const SCHEMA = 'roles'

class CheckError extends Error {}

function fail(message) {
  throw new CheckError(message)
}

async function failedMigration(client, sql, relation) {
  const found = await client.query('SELECT to_regclass($1)::text AS name', [relation])
  if (!found.rows[0]?.name) return null
  const failed = await client.query(sql)
  return failed.rows[0]?.migration_name ?? null
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) fail('DATABASE_URL がありません')

  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    const current = await client.query('SELECT current_user AS name')
    const name = current.rows[0]?.name
    if (name !== ROLE) {
      fail(`接続ユーザーは app_participant にしてください。いまのユーザーは ${name} です`)
    }

    const schema = await client.query(
      `SELECT has_schema_privilege(current_user, nspname, 'CREATE') AS can_create
       FROM pg_namespace
       WHERE nspname = $1`,
      [SCHEMA]
    )
    if (schema.rowCount === 0) {
      fail('スキーマ roles がありません。pnpm db:init または手入力のあと再デプロイしてください')
    }
    if (!schema.rows[0]?.can_create) {
      fail('スキーマ roles にテーブルを作る権限がありません。所有者を app_participant にしてください')
    }

    const failedInRoles = await failedMigration(
      client,
      'SELECT migration_name FROM roles."_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL LIMIT 1',
      'roles."_prisma_migrations"'
    )
    const failedInPublic = await failedMigration(
      client,
      'SELECT migration_name FROM public."_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL LIMIT 1',
      'public."_prisma_migrations"'
    )
    const failed = failedInRoles ?? failedInPublic
    if (failed) {
      fail(`マイグレーション ${failed} は失敗した記録が残っています。記録を消してから再デプロイしてください`)
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  if (error instanceof CheckError) console.error(error.message)
  else console.error(error)
  process.exit(1)
})
