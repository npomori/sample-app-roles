import 'dotenv/config'

function databaseName(connectionString: string): string {
  const url = new URL(connectionString)
  const name = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error('データベース名は単純な識別子にしてください')
  }
  return name
}

function databaseIdentity(connectionString: string): string {
  const url = new URL(connectionString)
  const port = url.port || '5432'
  return `${url.hostname}:${port}:${databaseName(connectionString)}`
}

export function testDatabaseUrl(): string {
  const url = process.env['TEST_DATABASE_URL']
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL がありません。起動済みの PostgreSQL にある、開発用とは別のデータベースを指定してください。'
    )
  }
  return url
}

export function assertDistinctDatabase(): void {
  const testUrl = testDatabaseUrl()
  const appUrl = process.env['DATABASE_URL']
  if (appUrl && databaseIdentity(appUrl) === databaseIdentity(testUrl)) {
    throw new Error('TEST_DATABASE_URL は DATABASE_URL と同じデータベースにはできません')
  }
}
