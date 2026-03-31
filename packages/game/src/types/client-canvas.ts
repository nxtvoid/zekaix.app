export type RuntimePlayerState = {
  playerId: string
  playerName: string
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  currentWeapon: string
  hp: number
  shield?: number
  kills?: number
  deaths?: number
  isDead?: boolean
  updatedAt: number
}

export type PlayerLeftPayload = {
  playerId: string
}

export type LeaderboardEntry = {
  rank: number
  playerId: string
  playerName: string
  kills: number
  isDead: boolean
}

export type HitMarker = {
  x: number
  y: number
  targetPlayerId: string
  damage: number
  createdAt: number
}

export type ShotTrail = {
  shooterPlayerId: string
  targetPlayerId: string | null
  weaponId: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  createdAt: number
}

export type ShotProjectile = {
  id: string
  shooterPlayerId: string
  targetPlayerId: string | null
  weaponId: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  createdAt: number
  durationMs: number
}

export type SharedGrenade = {
  id: string
  shooterPlayerId: string
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  targetX: number
  targetY: number
  radius: number
  blastRadius: number
  maxDamage: number
  createdAt: number
  fuseMs: number
  baseFuseMs: number
  fuseRemainingMs: number
  isResting: boolean
  lastUpdatedAt: number
}

export type SharedExplosion = {
  id: string
  x: number
  y: number
  blastRadius: number
  createdAt: number
  durationMs: number
}

export type ClientMapPickup = {
  id: string
  kind: 'ammo' | 'ability_charge' | 'repair_kit'
  x: number
  z: number
  value: number
  spawnedAt: number
}

export type LocalCollectedPickup = {
  id: string
  kind: ClientMapPickup['kind']
  label: string
  value: number
  collectedAt: number
}

export type GameplayFeedItem = {
  id: string
  kind: 'pickup' | 'kill'
  tone: 'accent' | 'neutral' | 'danger'
  title: string
  detail: string
  createdAt: number
}
