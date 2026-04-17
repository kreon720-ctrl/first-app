import { pool } from '@/lib/db/pool'

export interface User {
  id: string
  email: string
  name: string
  password_hash: string
  created_at: Date
}

export interface CreateUserParams {
  email: string
  name: string
  password_hash: string
}

export async function createUser(params: CreateUserParams): Promise<User> {
  const { email, name, password_hash } = params
  try {
    const result = await pool.query<User>(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, password_hash, created_at`,
      [email, name, password_hash]
    )
    return result.rows[0]
  } catch (err) {
    throw new Error(`createUser 실패: ${(err as Error).message}`)
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await pool.query<User>(
      `SELECT id, email, name, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [email]
    )
    return result.rows[0] ?? null
  } catch (err) {
    throw new Error(`getUserByEmail 실패: ${(err as Error).message}`)
  }
}

export async function updateUserName(id: string, name: string): Promise<User | null> {
  try {
    const result = await pool.query<User>(
      `UPDATE users SET name = $1 WHERE id = $2
       RETURNING id, email, name, password_hash, created_at`,
      [name, id]
    )
    return result.rows[0] ?? null
  } catch (err) {
    throw new Error(`updateUserName 실패: ${(err as Error).message}`)
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await pool.query<User>(
      `SELECT id, email, name, password_hash, created_at
       FROM users
       WHERE id = $1`,
      [id]
    )
    return result.rows[0] ?? null
  } catch (err) {
    throw new Error(`getUserById 실패: ${(err as Error).message}`)
  }
}
