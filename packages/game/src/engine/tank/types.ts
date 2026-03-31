import type { MapObstacle } from '../maps/types'

type TankMovementInput = {
  up?: boolean
  down?: boolean
  left?: boolean
  right?: boolean
}

type TankBullet = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  ageMs: number
  ttlMs: number
  gunId: string
}

type TankShotPayload = {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
}

type TankAmmoState = {
  inMagazine: number
  reserveMagazines: number
}

type TankReloadState = {
  isReloading: boolean
  gunId: string
  remainingMs: number
  durationMs: number
  progress: number
  canReload: boolean
  shouldReload: boolean
  noReserveMagazines: boolean
  isOutOfAmmo: boolean
}

type TankCombatState = {
  hp: number
  maxHp: number
  shield: number
  maxShield: number
  isAlive: boolean
  canRegenerate: boolean
}

type TankRegenConfig = {
  regenRatePerSecond: number
  regenDelayMs: number
  maxRegenHp: number
}

type TankGrenade = {
  id: number
  x: number
  y: number
  targetX: number
  targetY: number
  vx: number
  vy: number
  speed: number
  fuseRemainingMs: number
  baseFuseMs: number
  blastRadius: number
  maxDamage: number
  radius: number
  isResting: boolean
}

type TankGrenadeThrowOptions = {
  speed?: number
  fuseMs?: number
  blastRadius?: number
  maxDamage?: number
  radius?: number
  maxThrowDistance?: number
}

type TankDamageTarget = {
  id: string
  x: number
  y: number
}

type TankAreaDamageEvent = {
  targetId: string
  damage: number
  source: 'grenade'
}

type TankOptions = {
  autoRotate?: boolean
  rotation?: number
  rotationSpeed?: number
  moveSpeed?: number
  drawGrid?: boolean
  initialPosition?: { x: number; y: number }
  maxBullets?: number
  onShoot?: (payload: TankShotPayload) => void
  gunId?: string
  maxHp?: number
  maxShield?: number
  initialHp?: number
  initialShield?: number
  mapWidth?: number
  mapHeight?: number
  obstacles?: MapObstacle[]
}

export type {
  TankMovementInput,
  TankBullet,
  TankShotPayload,
  TankAmmoState,
  TankReloadState,
  TankCombatState,
  TankRegenConfig,
  TankGrenade,
  TankGrenadeThrowOptions,
  TankDamageTarget,
  TankAreaDamageEvent,
  TankOptions
}
