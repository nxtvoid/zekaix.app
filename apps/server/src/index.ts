import type { SocketIOServer } from './types'
import { Server } from 'socket.io'
import { logger } from '@zekaix/utils/logger'
import { redisCLI } from './lib/redis'
import { GameManager } from './game/game-manager'
import { createServer } from 'node:http'
import { PORT, WEB_ORIGIN } from './constants/config'
import { resolveSocketSession } from './utils/session'

await redisCLI.connect()

const httpServer = createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ service: 'zekaix-server', ok: true }))
    return
  }

  res.writeHead(404, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

const io: SocketIOServer = new Server(httpServer, {
  cors: {
    origin: WEB_ORIGIN,
    credentials: true
  },
  transports: ['websocket', 'polling']
})

httpServer.on('request', (req) => {
  if (!req.url?.startsWith('/socket.io/')) {
    return
  }

  logger.info(
    {
      method: req.method,
      url: req.url,
      host: req.headers.host ?? null,
      origin: req.headers.origin ?? null,
      upgrade: req.headers.upgrade ?? null,
      hasCookieHeader: Boolean(req.headers.cookie)
    },
    'Socket.IO HTTP request received'
  )
})

httpServer.on('upgrade', (req) => {
  logger.info(
    {
      url: req.url ?? null,
      host: req.headers.host ?? null,
      origin: req.headers.origin ?? null,
      upgrade: req.headers.upgrade ?? null,
      connection: req.headers.connection ?? null,
      hasCookieHeader: Boolean(req.headers.cookie)
    },
    'HTTP upgrade request received'
  )
})

io.engine.on('connection_error', (error) => {
  logger.warn(
    {
      code: error.code,
      message: error.message,
      context: error.context
        ? {
            name: error.context.name ?? null,
            path: error.context.path ?? null,
            origin: error.context.request?.headers?.origin ?? null,
            host: error.context.request?.headers?.host ?? null,
            hasCookieHeader: Boolean(error.context.request?.headers?.cookie)
          }
        : null
    },
    'Socket.IO engine connection error'
  )
})

io.use(async (socket, next) => {
  try {
    const session = await resolveSocketSession(socket)

    if (!session) {
      logger.warn(
        {
          socketId: socket.id,
          origin: socket.handshake.headers.origin ?? null,
          host: socket.handshake.headers.host ?? null,
          hasCookieHeader: Boolean(socket.handshake.headers.cookie)
        },
        'Unauthorized socket connection attempt'
      )
      return next(new Error('UNAUTHORIZED'))
    }

    socket.data.playerId = session.id
    socket.data.playerName = session.name

    next()
  } catch (error) {
    logger
      .child({ socketId: socket.id, error })
      .warn('Socket authentication failed')
    next(new Error('UNAUTHORIZED'))
  }
})

const gameManager = new GameManager(io)

io.on('connection', (socket) => {
  const socketLogger = logger.child({
    socketId: socket.id,
    playerId: socket.data.playerId,
    playerName: socket.data.playerName
  })

  socketLogger.info(
    { transport: socket.conn.transport.name },
    'Player connected'
  )

  socket.conn.on('upgrade', () => {
    socketLogger.info(
      { transport: socket.conn.transport.name },
      'Socket upgraded'
    )
  })

  socket.conn.on('close', (reason) => {
    socketLogger.warn({ reason }, 'Socket transport closed')
  })

  socket.conn.on('error', (error) => {
    socketLogger.warn({ error }, 'Socket transport error')
  })

  socket.on('matchmaking:find', () =>
    gameManager.handleMatchmaking(socket, socketLogger)
  )

  socket.on('game:join', ({ gameId }) =>
    gameManager.handleJoin(socket, gameId, socketLogger)
  )

  socket.on('game:player_sync', (payload) =>
    gameManager.handlePlayerSync(socket, payload)
  )

  socket.on('game:shot', (payload) =>
    gameManager.handleShot(socket, payload, socketLogger)
  )

  socket.on('game:grenade_throw', (payload) =>
    gameManager.handleGrenadeThrow(socket, payload, socketLogger)
  )

  socket.on('game:respawn', () => gameManager.handleRespawn(socket))
  socket.on('game:request_runtime_snapshot', () =>
    gameManager.handleRuntimeSnapshotRequest(socket)
  )

  socket.on('disconnect', (reason) => {
    void gameManager.handleDisconnect(socket, socketLogger)
    socketLogger.info({ reason }, 'Player disconnected')
  })
})

let isShuttingDown = false

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  logger.info({ signal }, 'Shutting down server')

  io.close()
  await redisCLI.quit()
  httpServer.close(() => {
    logger.info('HTTP server closed')
  })
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`)
})
