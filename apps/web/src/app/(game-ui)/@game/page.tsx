'use client'

import { useEffect, useState } from 'react'
import { GameView } from './_components/game-view'
import {
  DEFAULT_GAME_LOADOUT,
  LOADOUT_ACTIVE_ABILITIES,
  LOADOUT_PASSIVE_ABILITIES,
  LOADOUT_WEAPONS,
  type GameLoadout
} from '@zekaix/game/client'
import { useSocket } from '@/components/socket-provider'
import { GamePregamePanel } from '@zekaix/ui/game-pregame-panel'
import { BgGameCanvas } from '@zekaix/ui/bg-game-canvas'

type GameScreen = 'connecting' | 'loadout' | 'game' | 'error'

type GameStatePayload = {
  id: string
}

type JoinedPayload = {
  gameId: string
  playerId: string
  playerName: string
}

export default function Page() {
  const [loadout, setLoadout] = useState<GameLoadout>(DEFAULT_GAME_LOADOUT)
  const [screen, setScreen] = useState<GameScreen>('connecting')
  const [isDeploying, setIsDeploying] = useState(false)
  const [activeGameState, setActiveGameState] =
    useState<GameStatePayload | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null)
  const [joinedGameId, setJoinedGameId] = useState<string | null>(null)
  const { isConnected, socket } = useSocket()

  useEffect(() => {
    if (!socket) {
      return
    }

    const onGameState = (payload: GameStatePayload) => {
      setActiveGameState(payload)
    }

    const onJoined = (payload: JoinedPayload) => {
      setLocalPlayerId(payload.playerId)
      setJoinedGameId(payload.gameId)
    }

    const onMatchmakingError = () => {
      setActiveGameState(null)
      setLocalPlayerId(null)
      setJoinedGameId(null)
      setIsDeploying(false)
      setScreen('error')
    }

    const onJoinError = () => {
      setActiveGameState(null)
      setLocalPlayerId(null)
      setJoinedGameId(null)
      setIsDeploying(false)
      setScreen('error')
    }

    socket.on('game:state', onGameState)
    socket.on('game:joined', onJoined)
    socket.on('error:matchmaking', onMatchmakingError)
    socket.on('error:join', onJoinError)

    return () => {
      socket.off('game:state', onGameState)
      socket.off('game:joined', onJoined)
      socket.off('error:matchmaking', onMatchmakingError)
      socket.off('error:join', onJoinError)
    }
  }, [socket])

  useEffect(() => {
    if (!isConnected) {
      setScreen('connecting')
      setIsDeploying(false)
      return
    }

    if (screen === 'game' && activeGameState && localPlayerId) {
      return
    }

    if (
      isDeploying &&
      activeGameState &&
      localPlayerId &&
      joinedGameId &&
      activeGameState.id === joinedGameId
    ) {
      setScreen('game')
      setIsDeploying(false)
      return
    }

    if (isDeploying) {
      setScreen('connecting')
      return
    }

    setScreen('loadout')
  }, [
    activeGameState,
    isConnected,
    isDeploying,
    joinedGameId,
    localPlayerId,
    screen
  ])

  if (screen === 'game' && activeGameState && localPlayerId) {
    return (
      <GameView
        gameId={activeGameState.id}
        localPlayerId={localPlayerId}
        loadout={loadout}
      />
    )
  }

  if (screen === 'loadout') {
    return (
      <main className='relative flex min-h-dvh items-center justify-center px-4 py-10'>
        <GamePregamePanel
          loadout={loadout}
          weapons={LOADOUT_WEAPONS}
          activeAbilities={LOADOUT_ACTIVE_ABILITIES}
          passiveAbilities={LOADOUT_PASSIVE_ABILITIES}
          onLoadoutChange={(nextLoadout) =>
            setLoadout(nextLoadout as GameLoadout)
          }
          onDeploy={() => {
            if (!socket) {
              setScreen('error')
              return
            }

            setActiveGameState(null)
            setLocalPlayerId(null)
            setJoinedGameId(null)
            setIsDeploying(true)
            setScreen('connecting')
            socket.emit('matchmaking:find')
          }}
        />

        <BgGameCanvas quantity={5} className='-z-1 blur-sm' />
      </main>
    )
  }

  return (
    <main className='grid h-dvh place-items-center px-6 text-center'>
      <div className='space-y-2'>
        <h1 className='font-semibold text-4xl'>zekaix FFA</h1>
        <p className='text-muted-foreground text-sm'>
          {screen === 'error'
            ? 'Failed to enter the active world. Reconnecting...'
            : isDeploying
              ? 'Searching for an active world to deploy...'
              : isConnected
                ? 'Connected. Preparing loadout...'
                : 'Connecting to the game server...'}
        </p>
      </div>
    </main>
  )
}
