// Reset database and reapply schema.
// Prerequisite:
//   - Docker container `postgres-db` running on localhost:5432
//   - backend/.env.local with DATABASE_URL=postgresql://teamworks-manager:...@localhost:5432/teamworks
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const SCHEMA_PATH = path.join(REPO_ROOT, 'database', 'schema.sql')
const ENV_PATH = path.join(REPO_ROOT, 'backend', '.env.local')

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`DATABASE_URL not set and ${ENV_PATH} not found`)
  }
  const line = fs.readFileSync(ENV_PATH, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='))
  if (!line) throw new Error(`DATABASE_URL missing in ${ENV_PATH}`)
  return line.slice('DATABASE_URL='.length).trim()
}

function parseDatabaseUrl(url) {
  const m = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/)
  if (!m) throw new Error(`Cannot parse DATABASE_URL: ${url}`)
  return {
    user: decodeURIComponent(m[1]),
    password: decodeURIComponent(m[2]),
    host: m[3],
    port: Number(m[4]),
    database: m[5],
  }
}

async function resetDatabase() {
  const cfg = parseDatabaseUrl(loadDatabaseUrl())

  const adminPool = new Pool({ ...cfg, database: 'postgres' })

  try {
    console.log(`🔄 Dropping database "${cfg.database}"...`)
    await adminPool.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [cfg.database]
    )
    await adminPool.query(`DROP DATABASE IF EXISTS "${cfg.database}"`)
    console.log('✅ Database dropped')

    console.log(`🔄 Creating database "${cfg.database}"...`)
    await adminPool.query(`CREATE DATABASE "${cfg.database}"`)
    console.log('✅ Database created')
  } finally {
    await adminPool.end()
  }

  const targetPool = new Pool(cfg)
  try {
    console.log(`🔄 Applying schema (${SCHEMA_PATH})...`)
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8')
    await targetPool.query(schemaSql)
    console.log('✅ Schema applied')
  } finally {
    await targetPool.end()
  }

  console.log('🎉 Database reset complete!')
}

resetDatabase().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
