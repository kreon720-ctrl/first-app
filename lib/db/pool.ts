// ⚠️ WARNING: Vercel Serverless 환경에서는 함수 인스턴스마다 새 연결이 생성될 수 있음.
// 글로벌 싱글턴 패턴으로 동일 인스턴스 내 재사용. PgBouncer 또는 Neon serverless driver 사용 권장.
import { Pool } from 'pg'

const globalForPg = global as unknown as { pgPool: Pool }

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool
}
