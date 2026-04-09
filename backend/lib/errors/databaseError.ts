/**
 * Custom error class for database operations
 * Preserves PostgreSQL error codes for proper HTTP status code mapping
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly constraint?: string,
    public readonly detail?: string
  ) {
    super(message)
    this.name = 'DatabaseError'
  }

  /**
   * Check if this is a unique constraint violation
   */
  isUniqueViolation(): boolean {
    return this.code === '23505'
  }

  /**
   * Check if this is a foreign key constraint violation
   */
  isForeignKeyViolation(): boolean {
    return this.code === '23503'
  }

  /**
   * Check if this is a check constraint violation
   */
  isCheckConstraintViolation(): boolean {
    return this.code === '23514'
  }

  /**
   * Check if this is a not null constraint violation
   */
  isNotNullViolation(): boolean {
    return this.code === '23502'
  }
}

/**
 * Wrap a database operation in error handling that preserves PG error codes
 * 
 * @example
 * try {
 *   const result = await withDbErrorHandling(() => 
 *     pool.query<User>(
 *       `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *`,
 *       [email, name, hash]
 *     )
 *   )
 * } catch (err) {
 *   if (err instanceof DatabaseError && err.isUniqueViolation()) {
 *     return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 })
 *   }
 *   throw err
 * }
 */
export async function withDbErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (err) {
    const pgError = err as { code?: string; constraint?: string; detail?: string; message: string }
    throw new DatabaseError(
      pgError.message,
      pgError.code,
      pgError.constraint,
      pgError.detail
    )
  }
}

/**
 * Map database errors to appropriate HTTP status codes
 */
export function getHttpErrorStatus(err: unknown): number {
  if (err instanceof DatabaseError) {
    if (err.isUniqueViolation()) return 409
    if (err.isForeignKeyViolation()) return 400
    if (err.isCheckConstraintViolation()) return 400
    if (err.isNotNullViolation()) return 400
    return 500
  }
  return 500
}

/**
 * Get user-friendly error message from database error
 */
export function getDatabaseErrorMessage(err: unknown): string {
  if (err instanceof DatabaseError) {
    if (err.isUniqueViolation()) {
      if (err.constraint?.includes('email')) {
        return '이미 사용 중인 이메일입니다.'
      }
      if (err.constraint?.includes('join_requests')) {
        return '이미 가입 신청이 진행 중입니다.'
      }
      return '중복된 데이터가 존재합니다.'
    }
    if (err.isForeignKeyViolation()) {
      return '존재하지 않는 리소스를 참조하고 있습니다.'
    }
    return '데이터 처리 중 오류가 발생했습니다.'
  }
  return '서버 내부 오류가 발생했습니다.'
}
