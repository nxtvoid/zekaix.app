import type { GameLoadout } from '@zekaix/game/client'
import { GameplayCanvas } from './gameplay-canvas'

type GameViewProps = {
  gameId: string
  localPlayerId: string
  loadout: GameLoadout
}

const GameView = ({ gameId, localPlayerId, loadout }: GameViewProps) => {
  return (
    <main className='relative h-dvh w-full overflow-hidden p-3'>
      <GameplayCanvas
        gameId={gameId}
        localPlayerId={localPlayerId}
        loadout={loadout}
      />
    </main>
  )
}

export { GameView }
