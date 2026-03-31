import type { Socket } from 'socket.io'
import { logger } from '@zekaix/utils/logger'
import { authNode } from '../lib/auth'

export async function resolveSocketSession(socket: Socket) {
  const headers = new Headers()

  for (const [key, rawValue] of Object.entries(socket.handshake.headers)) {
    if (typeof rawValue === 'undefined') {
      continue
    }

    headers.set(key, Array.isArray(rawValue) ? rawValue.join(',') : rawValue)
  }

  const sessionData = await authNode.api.getSession({ headers })

  logger.info(
    {
      socketId: socket.id,
      hasCookieHeader: headers.has('cookie'),
      origin: headers.get('origin') ?? null,
      host: headers.get('host') ?? null,
      hasSession: Boolean(sessionData?.user?.id)
    },
    'Socket session check'
  )

  if (!sessionData?.user?.id) {
    return null
  }

  const { name = 'Player', ...rest } = sessionData.user

  return {
    name: name.trim(),
    ...rest
  }
}
