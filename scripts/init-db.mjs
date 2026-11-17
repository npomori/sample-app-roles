import 'dotenv/config'
import pg from 'pg'

const ROLE = 'app_participant'
const SCHEMA = 'roles'

class InitError extends Error {}

function fail(message) {
  throw new InitError(message)
}

function connectionTarget(raw, label) {
  let url
  try {
    url = new URL(raw)
  } catch {
    fail(`${label} を読み取れません`)
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(database)) {
    fail(`${label} のデータベース名が識別子ではありません`)
  }
  return {
    database,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password)
  }
}

function quoteIdent(name) {
  return `"${name.replaceAll('"', '""')}"`
}

async function main() {
  const adminRaw = process.env.ADMIN_DATABASE_URL
  const appRaw = process.env.DATABASE_URL
  if (!adminRaw) fail('ADMIN_DATABASE_URL がありません')
  if (!appRaw) fail('DATABASE_URL がありません')

  const admin = connectionTarget(adminRaw, 'ADMIN_DATABASE_URL')
  const app = connectionTarget(appRaw, 'DATABASE_URL')
  if (app.user !== ROLE) fail('DATABASE_URL のユーザーは app_participant にしてください')
  if (admin.user === ROLE) fail('ADMIN_DATABASE_URL は読み書きできるユーザーにしてください')
  if (admin.database !== app.database) fail('データベース名が一致しません')
  if (!app.password) fail('DATABASE_URL にパスワードがありません')

  const client = new pg.Client({ connectionString: adminRaw })
  await client.connect()
  try {
    const existing = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [ROLE])
    if (existing.rowCount === 0) {
      const created = await client.query(
        "SELECT format('CREATE ROLE app_participant LOGIN PASSWORD %L', $1::text) AS sql",
        [app.password]
      )
      await client.query(created.rows[0].sql)
      console.log('ロール app_participant を作成しました')
    } else {
      console.log('ロール app_participant は既にあるので、パスワードは変えません')
    }

    const database = quoteIdent(admin.database)
    await client.query(`GRANT ${ROLE} TO CURRENT_USER`)
    await client.query(`GRANT CONNECT ON DATABASE ${database} TO ${ROLE}`)
    await client.query(`GRANT USAGE ON SCHEMA public TO ${ROLE}`)
    await client.query(
      `GRANT SELECT (id, email, name, role, "disabledAt") ON TABLE "User" TO ${ROLE}`
    )
    await client.query(`GRANT SELECT (id, "userId") ON TABLE "WebAuthnCredential" TO ${ROLE}`)
    await client.query(`GRANT SELECT ON TABLE "App", "AppGrant" TO ${ROLE}`)
    console.log('参照権限を付与しました')

    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA} AUTHORIZATION ${ROLE}`)
    await client.query(`ALTER SCHEMA ${SCHEMA} OWNER TO ${ROLE}`)
    console.log('スキーマ roles の所有者を app_participant にしました')
  } finally {
    await client.end()
  }
  console.log('初期化が完了しました')
}

main().catch((error) => {
  if (error instanceof InitError) console.error(error.message)
  else console.error(error)
  process.exit(1)
})
