import { z } from 'zod'
import { NextResponse } from 'next/server'
import { logger } from '@zekaix/utils/logger'

export const ErrorCode = z.enum([
  'bad_request',
  'not_found',
  'internal_server_error',
  'unauthorized',
  'forbidden',
  'rate_limit_exceeded',
  'invite_expired',
  'invite_pending',
  'exceeded_limit',
  'conflict',
  'unprocessable_entity'
])

const errorCodeToHttpStatus: Record<z.infer<typeof ErrorCode>, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  exceeded_limit: 403,
  not_found: 404,
  conflict: 409,
  invite_pending: 409,
  invite_expired: 410,
  unprocessable_entity: 422,
  rate_limit_exceeded: 429,
  internal_server_error: 500
}

export class ApiError extends Error {
  public readonly code: z.infer<typeof ErrorCode>
  public readonly tips?: string

  constructor({
    code,
    message,
    tips
  }: {
    code: z.infer<typeof ErrorCode>
    message: string
    tips?: string
  }) {
    super(message)
    this.code = code
    this.tips = tips || undefined
  }
}

// TODO: improve any typing
// biome-ignore lint/suspicious/noExplicitAny: any
export function handleApiError(error: any) {
  logger
    .child({ code: error.code, error: error.message })
    .error('API error occurred')

  // ApiError errors
  if (error instanceof ApiError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        tips: error.tips
      },
      status: errorCodeToHttpStatus[error.code]
    }
  }

  // Prisma record not found error
  if (error.code === 'P2025') {
    return {
      error: {
        code: 'not_found',
        message:
          error?.meta?.cause ||
          error.message ||
          'The requested resource was not found.',
        tips: 'Please try again.'
      },
      status: 404
    }
  }

  // Prisma foreign key constraint error
  if (error.code === 'P2003') {
    return {
      error: {
        code: 'unprocessable_entity',
        message:
          'Cannot delete this item because it is linked to other records in the system.',
        tips: 'Please try again.'
      },
      status: 422
    }
  }

  // Prisma unique constraint error
  if (error.code === 'P2002') {
    const target = (error.meta?.target as string[] | undefined)?.join(', ')
    return {
      error: {
        code: 'conflict',
        message: `A record with the same unique value already exists (${target}).`,
        tips: 'Please try again with a different value.'
      },
      status: 409
    }
  }

  // Fallback
  // Unhandled errors are not user-facing, so we don't expose the actual error
  return {
    error: {
      code: 'internal_server_error',
      message: 'An unexpected error occurred. Please try again later.',
      tips: 'Please try again.'
    },
    status: 500
  }
}

export function handleAndReturnErrorResponse(
  err: unknown,
  headers?: Record<string, string>
) {
  const { error, status } = handleApiError(err)
  return NextResponse.json({ error }, { headers, status })
}
