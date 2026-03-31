import type { Logger } from '@zekaix/utils/logger'
import { db } from '@zekaix/db'

const SINGLE_MAP_WIDTH = 5200
const SINGLE_MAP_HEIGHT = 3600

export const getGameWithPlayerCount = async (gameId: string) => {
  try {
    const game = await db.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        maxPlayers: true,
        _count: {
          select: {
            players: true
          }
        }
      }
    })

    if (!game) {
      return null
    }

    return game
  } catch {
    return null
  }
}

export const getGameState = async (gameId: string, logger: Logger) => {
  try {
    const game = await db.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        maxPlayers: true,
        players: {
          select: {
            playerId: true,
            isHost: true,
            joinedAt: true,
            player: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            joinedAt: 'asc'
          }
        }
      }
    })

    if (!game) {
      logger.child({ gameId }).error('Game not found')
      return null
    }

    return {
      id: game.id,
      mapWidth: SINGLE_MAP_WIDTH,
      mapHeight: SINGLE_MAP_HEIGHT,
      maxPlayers: game.maxPlayers,
      players: game.players.map((gp) => ({
        id: gp.player.id,
        name: gp.player.name,
        image: gp.player.image,
        isHost: gp.isHost,
        joinedAt: gp.joinedAt
      })),
      playerCount: game.players.length,
      isFull: game.players.length >= game.maxPlayers
    }
  } catch (error) {
    logger.child({ error, gameId }).error('Error fetching game state')
    return null
  }
}
