import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function run(args, env) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env })
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(['scripts/assert-migrate-ready.mjs'], process.env)

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL がありません')
  process.exit(1)
}

const url = new URL(databaseUrl)
url.searchParams.set('schema', 'roles')

run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
  ...process.env,
  DATABASE_URL: url.href
})
