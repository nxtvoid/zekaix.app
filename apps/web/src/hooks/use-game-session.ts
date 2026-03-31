'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { GameClientSession } from '@zekaix/game/client'
import type { Socket } from 'socket.io-client'
import { useSocket } from '@/components/socket-provider'

type UseGameSessionResult = {
  session: GameClientSession
  snapshot: ReturnType<GameClientSession['getSnapshot']>
  socket: Socket | null
}

const useGameSession = (localPlayerId: string): UseGameSessionResult => {
  const { socket } = useSocket()
  const sessionRef = useRef<GameClientSession | null>(null)

  if (
    !sessionRef.current ||
    sessionRef.current.localPlayerId !== localPlayerId
  ) {
    sessionRef.current = new GameClientSession(localPlayerId)
  }

  const session = sessionRef.current
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  )

  useEffect(() => {
    if (!socket) {
      session.reset()
      return
    }

    const onDisconnect = () => {
      session.reset()
    }

    socket.on('disconnect', onDisconnect)
    socket.on('game:players_snapshot', session.handlePlayersSnapshot)
    socket.on('game:player_joined', session.handlePlayerJoined)
    socket.on('game:player_moved', session.handlePlayerMoved)
    socket.on('game:player_updated', session.handlePlayerUpdated)
    socket.on('game:player_left', session.handlePlayerLeft)
    socket.on('game:player_stats', session.handlePlayerStats)
    socket.on('game:leaderboard', session.handleLeaderboard)
    socket.on('game:pickups_snapshot', session.handlePickupsSnapshot)
    socket.on('game:pickup_spawned', session.handlePickupSpawned)
    socket.on('game:pickup_collected', session.handlePickupCollected)
    socket.on('game:player_died', session.handlePlayerDied)
    socket.on('game:player_respawned', session.handlePlayerRespawned)
    socket.on('game:hit_confirmed', session.handleHit)
    socket.on('game:shot_fired', session.handleShotFired)
    socket.on('game:grenade_thrown', session.handleGrenadeThrown)
    socket.on('game:grenade_exploded', session.handleGrenadeExploded)
    socket.emit('game:request_runtime_snapshot')

    return () => {
      socket.off('disconnect', onDisconnect)
      socket.off('game:players_snapshot', session.handlePlayersSnapshot)
      socket.off('game:player_joined', session.handlePlayerJoined)
      socket.off('game:player_moved', session.handlePlayerMoved)
      socket.off('game:player_updated', session.handlePlayerUpdated)
      socket.off('game:player_left', session.handlePlayerLeft)
      socket.off('game:player_stats', session.handlePlayerStats)
      socket.off('game:leaderboard', session.handleLeaderboard)
      socket.off('game:pickups_snapshot', session.handlePickupsSnapshot)
      socket.off('game:pickup_spawned', session.handlePickupSpawned)
      socket.off('game:pickup_collected', session.handlePickupCollected)
      socket.off('game:player_died', session.handlePlayerDied)
      socket.off('game:player_respawned', session.handlePlayerRespawned)
      socket.off('game:hit_confirmed', session.handleHit)
      socket.off('game:shot_fired', session.handleShotFired)
      socket.off('game:grenade_thrown', session.handleGrenadeThrown)
      socket.off('game:grenade_exploded', session.handleGrenadeExploded)
    }
  }, [session, socket])

  return {
    session,
    snapshot,
    socket
  }
}

export { useGameSession }
