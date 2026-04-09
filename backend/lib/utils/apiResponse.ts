import { NextResponse } from 'next/server'

/**
 * Standard API response helper
 * Ensures consistent response format across all API routes
 */

/**
 * Success response with optional data
 */
export function successResponse<T>(data?: T, status: number = 200): NextResponse {
  return NextResponse.json(data ?? { message: 'Success' }, { status })
}

/**
 * Created response (201)
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

/**
 * Error response with consistent format
 */
export function errorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Bad request error (400)
 */
export function badRequest(message: string): NextResponse {
  return errorResponse(message, 400)
}

/**
 * Unauthorized error (401)
 */
export function unauthorized(message: string = '인증이 필요합니다.'): NextResponse {
  return errorResponse(message, 401)
}

/**
 * Forbidden error (403)
 */
export function forbidden(message: string = '접근 권한이 없습니다.'): NextResponse {
  return errorResponse(message, 403)
}

/**
 * Not found error (404)
 */
export function notFound(message: string = '리소스를 찾을 수 없습니다.'): NextResponse {
  return errorResponse(message, 404)
}

/**
 * Conflict error (409)
 */
export function conflict(message: string): NextResponse {
  return errorResponse(message, 409)
}

/**
 * Internal server error (500)
 */
export function internalError(message: string = '서버 내부 오류가 발생했습니다.'): NextResponse {
  return errorResponse(message, 500)
}

/**
 * Validate required fields from request body
 * Returns error response if any field is missing
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  fields: string[]
): { error?: NextResponse } {
  const missing = fields.find(field => !body[field])
  
  if (missing) {
    return {
      error: errorResponse(`${missing}은(는) 필수 입력 항목입니다.`, 400)
    }
  }
  
  return {}
}
