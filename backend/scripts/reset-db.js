// Reset database and reapply schema
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function resetDatabase() {
  // Connect to postgres database to reset
  const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: 'postgres' // Connect to default db to reset caltalk
  })

  try {
    console.log('🔄 Dropping caltalk database...')
    await pool.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'calktalk' AND pid <> pg_backend_pid()
    `)
    await pool.query('DROP DATABASE IF EXISTS calktalk')
    console.log('✅ Database dropped')

    console.log('🔄 Creating caltalk database...')
    await pool.query('CREATE DATABASE calktalk')
    console.log('✅ Database created')

    await pool.end()

    // Connect to new database
    const calktalkPool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: 'calktalk'
    })

    console.log('🔄 Applying schema...')
    const schemaPath = path.join(__dirname, 'database', 'schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    await calktalkPool.query(schemaSql)
    console.log('✅ Schema applied')

    await calktalkPool.end()

    console.log('🎉 Database reset complete!')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

resetDatabase()
