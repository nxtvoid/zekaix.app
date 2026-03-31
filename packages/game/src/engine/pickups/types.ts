type GamePickupKind = 'ammo' | 'ability_charge' | 'repair_kit'

type GamePickupState = {
  id: string
  kind: GamePickupKind
  x: number
  z: number
  value: number
  spawnedAt: number
}

type GamePickupCollectedPayload = {
  pickupId: string
  collectorId: string
  kind: GamePickupKind
  value: number
}

export type { GamePickupCollectedPayload, GamePickupKind, GamePickupState }
