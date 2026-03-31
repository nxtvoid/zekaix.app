import type {
  HitMarker,
  RuntimePlayerState,
  ShotProjectile,
  ShotTrail
} from '../types'
import { TANK_PROFILE } from '../constants'
import { GUNS } from '../engine/guns'

type LocalGameplayStats = {
  currentWeapon: string
  kills: number
  deaths: number
  hp: number
  shield: number
  isDead: boolean
}

type PlayerUpdatedPayload = {
  playerId: string
  hp: number
  shield: number
  isDead: boolean
}

type PlayerStatsPayload = {
  playerId: string
  currentWeapon: string
  kills: number
  deaths: number
  hp: number
  shield: number
  isDead: boolean
}

type PlayerRespawnedPayload = {
  playerId: string
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  hp: number
  shield: number
  currentWeapon: string
}

const DEFAULT_LOCAL_GAMEPLAY_STATS: LocalGameplayStats = {
  currentWeapon: 'pistol',
  kills: 0,
  deaths: 0,
  hp: 100,
  shield: 100,
  isDead: false
}

const isRemotePlayerWorldVisible = (player: RuntimePlayerState) =>
  !player.isDead && player.hp > 0

const getVisibleRemotePlayers = (
  remotePlayers: Map<string, RuntimePlayerState>
) => Array.from(remotePlayers.values()).filter(isRemotePlayerWorldVisible)

const createRemotePlayersSnapshot = (
  players: RuntimePlayerState[],
  localPlayerId: string
) => {
  const snapshot = new Map<string, RuntimePlayerState>()

  for (const player of players) {
    if (player.playerId !== localPlayerId) {
      snapshot.set(player.playerId, player)
    }
  }

  return snapshot
}

const upsertRemotePlayer = (
  remotePlayers: Map<string, RuntimePlayerState>,
  player: RuntimePlayerState,
  localPlayerId: string
) => {
  if (player.playerId === localPlayerId) {
    return remotePlayers
  }

  remotePlayers.set(player.playerId, player)
  return remotePlayers
}

const applyRemotePlayerUpdated = (
  remotePlayer: RuntimePlayerState,
  payload: PlayerUpdatedPayload,
  now: number
) => {
  remotePlayer.hp = payload.hp
  remotePlayer.shield = payload.shield
  remotePlayer.isDead = payload.isDead
  remotePlayer.updatedAt = now

  return remotePlayer
}

const applyRemotePlayerStats = (
  remotePlayer: RuntimePlayerState,
  payload: PlayerStatsPayload,
  now: number
) => {
  remotePlayer.currentWeapon = payload.currentWeapon
  remotePlayer.kills = payload.kills
  remotePlayer.deaths = payload.deaths
  remotePlayer.hp = payload.hp
  remotePlayer.shield = payload.shield
  remotePlayer.isDead = payload.isDead
  remotePlayer.updatedAt = now

  return remotePlayer
}

const markRemotePlayerDead = (
  remotePlayer: RuntimePlayerState,
  now: number
) => {
  remotePlayer.isDead = true
  remotePlayer.hp = 0
  remotePlayer.shield = 0
  remotePlayer.updatedAt = now

  return remotePlayer
}

const applyRemotePlayerRespawn = (
  remotePlayer: RuntimePlayerState,
  payload: PlayerRespawnedPayload,
  now: number
) => {
  remotePlayer.x = payload.x
  remotePlayer.y = payload.y
  remotePlayer.z = payload.z
  remotePlayer.yaw = payload.yaw
  remotePlayer.pitch = payload.pitch
  remotePlayer.hp = payload.hp
  remotePlayer.shield = payload.shield
  remotePlayer.currentWeapon = payload.currentWeapon
  remotePlayer.isDead = false
  remotePlayer.updatedAt = now

  return remotePlayer
}

const createHitMarker = (
  target: RuntimePlayerState,
  payload: {
    targetPlayerId: string
    damage: number
  },
  now: number
): HitMarker => ({
  x: target.x,
  y: target.z,
  targetPlayerId: payload.targetPlayerId,
  damage: payload.damage,
  createdAt: now
})

const createShotTrail = (
  payload: {
    shooterPlayerId: string
    targetPlayerId: string | null
    fromX: number
    fromZ: number
    toX: number
    toZ: number
    weaponId: string
  },
  now: number
): ShotTrail => ({
  shooterPlayerId: payload.shooterPlayerId,
  targetPlayerId: payload.targetPlayerId,
  weaponId: payload.weaponId,
  fromX: payload.fromX,
  fromY: payload.fromZ,
  toX: payload.toX,
  toY: payload.toZ,
  createdAt: now
})

const createShotProjectile = (
  payload: {
    projectileId: string
    shooterPlayerId: string
    targetPlayerId: string | null
    fromX: number
    fromZ: number
    toX: number
    toZ: number
    weaponId: string
  },
  now: number
): ShotProjectile => {
  const distance = Math.hypot(
    payload.toX - payload.fromX,
    payload.toZ - payload.fromZ
  )
  const durationMs = calculateShotTravelDuration(payload.weaponId, distance)

  return {
    id: payload.projectileId,
    shooterPlayerId: payload.shooterPlayerId,
    targetPlayerId: payload.targetPlayerId,
    weaponId: payload.weaponId,
    fromX: payload.fromX,
    fromY: payload.fromZ,
    toX: payload.toX,
    toY: payload.toZ,
    createdAt: now,
    durationMs
  }
}

const calculateMuzzlePosition = (x: number, y: number, rotation: number) => {
  const spawnOffset = TANK_PROFILE.barrelLength + TANK_PROFILE.radius * 0.35

  return {
    x: x + Math.cos(rotation) * spawnOffset,
    y: y + Math.sin(rotation) * spawnOffset
  }
}

const calculateShotTravelDuration = (weaponId: string, distance: number) => {
  const weapon = GUNS[weaponId]
  const speed = Math.max(1, weapon?.bulletSpeed ?? 500)

  return Math.max(45, Math.min(900, (distance / speed) * 1000))
}

export {
  DEFAULT_LOCAL_GAMEPLAY_STATS,
  applyRemotePlayerRespawn,
  applyRemotePlayerStats,
  applyRemotePlayerUpdated,
  calculateMuzzlePosition,
  calculateShotTravelDuration,
  createHitMarker,
  createShotProjectile,
  createRemotePlayersSnapshot,
  createShotTrail,
  getVisibleRemotePlayers,
  isRemotePlayerWorldVisible,
  markRemotePlayerDead,
  upsertRemotePlayer
}
export type {
  LocalGameplayStats,
  PlayerRespawnedPayload,
  PlayerStatsPayload,
  PlayerUpdatedPayload
}
