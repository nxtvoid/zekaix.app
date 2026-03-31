import { db, type Game } from '@zekaix/db'
import { MAX_PLAYERS_PER_LOBBY } from '../constants/config'

export const findOrCreateGame = async (): Promise<Game> => {
  const maxPlayers = MAX_PLAYERS_PER_LOBBY

  const candidateShards = await db.game.findMany({
    where: {
      maxPlayers
    },
    include: {
      _count: {
        select: {
          players: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    },
    take: 50
  })

  const existingFfaShard = candidateShards.find(
    (game) => game._count.players < game.maxPlayers
  )

  if (existingFfaShard) {
    return existingFfaShard
  }

  const createdGame = await db.game.create({
    data: {
      maxPlayers,
      isPrimaryShard: true,
      shardIndex: 0,
      shardRegion: 'global-1'
    }
  })

  if (!createdGame) {
    throw new Error('Failed to create FFA lobby shard')
  }

  return createdGame
}
