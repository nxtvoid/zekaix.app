import type {
  GameplayFeedItem,
  HitMarker,
  LeaderboardEntry,
  LocalCollectedPickup,
  PlayerLeftPayload,
  RuntimePlayerState,
  ClientMapPickup,
  SharedExplosion,
  SharedGrenade,
  ShotProjectile,
  ShotTrail
} from '../types'
import {
  DEFAULT_LOCAL_GAMEPLAY_STATS,
  applyRemotePlayerRespawn,
  applyRemotePlayerStats,
  applyRemotePlayerUpdated,
  createHitMarker,
  createShotProjectile,
  createRemotePlayersSnapshot,
  createShotTrail,
  markRemotePlayerDead,
  upsertRemotePlayer
} from '../canvas'
import type {
  LocalGameplayStats,
  PlayerRespawnedPayload,
  PlayerStatsPayload,
  PlayerUpdatedPayload
} from '../canvas'

type GameSessionSnapshot = {
  leaderboard: LeaderboardEntry[]
  localStats: LocalGameplayStats
  pickups: Map<string, ClientMapPickup>
  eventFeed: GameplayFeedItem[]
  lastCollectedPickup: LocalCollectedPickup | null
  remotePlayers: Map<string, RuntimePlayerState>
}

const createInitialSnapshot = (): GameSessionSnapshot => ({
  leaderboard: [],
  localStats: { ...DEFAULT_LOCAL_GAMEPLAY_STATS },
  pickups: new Map(),
  eventFeed: [],
  lastCollectedPickup: null,
  remotePlayers: new Map()
})

const MAX_FEED_ITEMS = 6

const pushFeedItem = (
  currentFeed: GameplayFeedItem[],
  nextItem: GameplayFeedItem
) => [nextItem, ...currentFeed].slice(0, MAX_FEED_ITEMS)

const getDisplayPlayerName = (
  playerId: string,
  localPlayerId: string,
  remotePlayers: Map<string, RuntimePlayerState>
) => {
  if (playerId === localPlayerId) {
    return 'You'
  }

  return remotePlayers.get(playerId)?.playerName ?? 'Unknown'
}

class GameClientSession {
  private snapshot: GameSessionSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly hitMarkers = new Map<string, HitMarker>()
  private readonly shotTrails = new Map<string, ShotTrail>()
  private readonly shotProjectiles = new Map<string, ShotProjectile>()
  private readonly sharedGrenades = new Map<string, SharedGrenade>()
  private readonly sharedExplosions = new Map<string, SharedExplosion>()

  constructor(readonly localPlayerId: string) {
    this.snapshot = createInitialSnapshot()
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  getHitMarkers = () => this.hitMarkers

  getShotTrails = () => this.shotTrails

  getShotProjectiles = () => this.shotProjectiles

  getSharedGrenades = () => this.sharedGrenades

  getSharedExplosions = () => this.sharedExplosions

  reset = () => {
    this.snapshot = createInitialSnapshot()
    this.hitMarkers.clear()
    this.shotTrails.clear()
    this.shotProjectiles.clear()
    this.sharedGrenades.clear()
    this.sharedExplosions.clear()
    this.emit()
  }

  handlePlayersSnapshot = (payload: RuntimePlayerState[]) => {
    this.snapshot = {
      ...this.snapshot,
      remotePlayers: createRemotePlayersSnapshot(payload, this.localPlayerId)
    }
    this.emit()
  }

  handlePlayerJoined = (payload: RuntimePlayerState) => {
    const nextRemotePlayers = new Map(this.snapshot.remotePlayers)

    upsertRemotePlayer(nextRemotePlayers, payload, this.localPlayerId)

    this.snapshot = {
      ...this.snapshot,
      remotePlayers: nextRemotePlayers
    }
    this.emit()
  }

  handlePlayerMoved = (payload: RuntimePlayerState) => {
    this.handlePlayerJoined(payload)
  }

  handlePlayerUpdated = (payload: PlayerUpdatedPayload) => {
    if (payload.playerId === this.localPlayerId) {
      this.snapshot = {
        ...this.snapshot,
        localStats: {
          ...this.snapshot.localStats,
          hp: payload.hp,
          shield: payload.shield,
          isDead: payload.isDead
        }
      }
      this.emit()
      return
    }

    const remotePlayer = this.snapshot.remotePlayers.get(payload.playerId)

    if (!remotePlayer) {
      return
    }

    const nextRemotePlayers = new Map(this.snapshot.remotePlayers)
    nextRemotePlayers.set(
      payload.playerId,
      applyRemotePlayerUpdated({ ...remotePlayer }, payload, performance.now())
    )

    this.snapshot = {
      ...this.snapshot,
      remotePlayers: nextRemotePlayers
    }
    this.emit()
  }

  handlePlayerLeft = ({ playerId }: PlayerLeftPayload) => {
    if (!this.snapshot.remotePlayers.has(playerId)) {
      return
    }

    const nextRemotePlayers = new Map(this.snapshot.remotePlayers)
    nextRemotePlayers.delete(playerId)

    this.snapshot = {
      ...this.snapshot,
      remotePlayers: nextRemotePlayers
    }
    this.emit()
  }

  handlePlayerStats = (payload: PlayerStatsPayload) => {
    if (payload.playerId === this.localPlayerId) {
      this.snapshot = {
        ...this.snapshot,
        localStats: {
          currentWeapon: payload.currentWeapon,
          kills: payload.kills,
          deaths: payload.deaths,
          hp: payload.hp,
          shield: payload.shield,
          isDead: payload.isDead
        }
      }
      this.emit()
      return
    }

    const remotePlayer = this.snapshot.remotePlayers.get(payload.playerId)

    if (!remotePlayer) {
      return
    }

    const nextRemotePlayers = new Map(this.snapshot.remotePlayers)
    nextRemotePlayers.set(
      payload.playerId,
      applyRemotePlayerStats({ ...remotePlayer }, payload, performance.now())
    )

    this.snapshot = {
      ...this.snapshot,
      remotePlayers: nextRemotePlayers
    }
    this.emit()
  }

  handleLeaderboard = (payload: LeaderboardEntry[]) => {
    this.snapshot = {
      ...this.snapshot,
      leaderboard: payload
    }
    this.emit()
  }

  handlePickupsSnapshot = (payload: ClientMapPickup[]) => {
    const pickups = new Map<string, ClientMapPickup>()

    for (const pickup of payload) {
      pickups.set(pickup.id, pickup)
    }

    this.snapshot = {
      ...this.snapshot,
      pickups
    }
    this.emit()
  }

  handlePickupSpawned = (payload: ClientMapPickup) => {
    const pickups = new Map(this.snapshot.pickups)
    pickups.set(payload.id, payload)
    this.snapshot = {
      ...this.snapshot,
      pickups
    }
    this.emit()
  }

  handlePickupCollected = (payload: {
    pickupId: string
    collectorId: string
    kind: ClientMapPickup['kind']
    value: number
    label: string
  }) => {
    const pickups = new Map(this.snapshot.pickups)
    pickups.delete(payload.pickupId)

    this.snapshot = {
      ...this.snapshot,
      pickups,
      lastCollectedPickup:
        payload.collectorId === this.localPlayerId
          ? {
              id: `${payload.pickupId}:${performance.now()}`,
              kind: payload.kind,
              label: payload.label,
              value: payload.value,
              collectedAt: performance.now()
            }
          : this.snapshot.lastCollectedPickup,
      eventFeed:
        payload.collectorId === this.localPlayerId
          ? pushFeedItem(this.snapshot.eventFeed, {
              id: `pickup:${payload.pickupId}:${performance.now()}`,
              kind: 'pickup',
              tone:
                payload.kind === 'repair_kit'
                  ? 'neutral'
                  : payload.kind === 'ability_charge'
                    ? 'accent'
                    : 'accent',
              title:
                payload.kind === 'ammo'
                  ? `Ammo +${payload.value} mag`
                  : payload.kind === 'ability_charge'
                    ? 'Ability ready'
                    : `${payload.label} +${payload.value}`,
              detail: payload.label,
              createdAt: performance.now()
            })
          : this.snapshot.eventFeed
    }
    this.emit()
  }

  handlePlayerDied = (payload: {
    playerId: string
    killedBy?: string
    killerName?: string
    victimName?: string
  }) => {
    const killerId = payload.killedBy ?? ''
    const victimId = payload.playerId
    const killerName =
      payload.killerName ??
      getDisplayPlayerName(
        killerId,
        this.localPlayerId,
        this.snapshot.remotePlayers
      )
    const victimName =
      payload.victimName ??
      getDisplayPlayerName(
        victimId,
        this.localPlayerId,
        this.snapshot.remotePlayers
      )

    if (payload.playerId === this.localPlayerId) {
      this.snapshot = {
        ...this.snapshot,
        localStats: {
          ...this.snapshot.localStats,
          hp: 0,
          shield: 0,
          isDead: true
        },
        eventFeed: killerId
          ? pushFeedItem(this.snapshot.eventFeed, {
              id: `kill:${killerId}:${victimId}:${performance.now()}`,
              kind: 'kill',
              tone: 'danger',
              title: `${killerName} eliminated ${victimName}`,
              detail: 'Combat',
              createdAt: performance.now()
            })
          : this.snapshot.eventFeed
      }
      this.emit()
      return
    }

    const remotePlayer = this.snapshot.remotePlayers.get(payload.playerId)

    if (!remotePlayer) {
      return
    }

    const nextRemotePlayers = new Map(this.snapshot.remotePlayers)
    nextRemotePlayers.set(
      payload.playerId,
      markRemotePlayerDead({ ...remotePlayer }, performance.now())
    )

    this.snapshot = {
      ...this.snapshot,
      remotePlayers: nextRemotePlayers,
      eventFeed: killerId
        ? pushFeedItem(this.snapshot.eventFeed, {
            id: `kill:${killerId}:${victimId}:${performance.now()}`,
            kind: 'kill',
            tone:
              killerId === this.localPlayerId || victimId === this.localPlayerId
                ? 'danger'
                : 'neutral',
            title: `${killerName} eliminated ${victimName}`,
            detail: 'Combat',
            createdAt: performance.now()
          })
        : this.snapshot.eventFeed
    }
    this.emit()
  }

  handlePlayerRespawned = (payload: PlayerRespawnedPayload) => {
    if (payload.playerId === this.localPlayerId) {
      this.snapshot = {
        ...this.snapshot,
        localStats: {
          ...this.snapshot.localStats,
          currentWeapon: payload.currentWeapon,
          hp: payload.hp,
          shield: payload.shield,
          isDead: false
        }
      }
      this.emit()
      return
    }

    const remotePlayer = this.snapshot.remotePlayers.get(payload.playerId)

    if (!remotePlayer) {
      return
    }

    const nextRemotePlayers = new Map(this.snapshot.remotePlayers)
    nextRemotePlayers.set(
      payload.playerId,
      applyRemotePlayerRespawn({ ...remotePlayer }, payload, performance.now())
    )

    this.snapshot = {
      ...this.snapshot,
      remotePlayers: nextRemotePlayers
    }
    this.emit()
  }

  handleHit = (payload: {
    targetPlayerId: string
    damage: number
    isDead: boolean
  }) => {
    const target = this.snapshot.remotePlayers.get(payload.targetPlayerId)

    if (!target) {
      return
    }

    const timestamp = performance.now()
    this.hitMarkers.set(
      `${timestamp}:${payload.targetPlayerId}`,
      createHitMarker(target, payload, timestamp)
    )
  }

  handleShotFired = (payload: {
    shooterPlayerId: string
    weaponId: string
    projectiles: Array<{
      projectileId: string
      targetPlayerId: string | null
      fromX: number
      fromZ: number
      toX: number
      toZ: number
    }>
  }) => {
    const timestamp = performance.now()

    for (const projectile of payload.projectiles) {
      const key = projectile.projectileId
      const projectilePayload = {
        shooterPlayerId: payload.shooterPlayerId,
        projectileId: projectile.projectileId,
        targetPlayerId: projectile.targetPlayerId,
        fromX: projectile.fromX,
        fromZ: projectile.fromZ,
        toX: projectile.toX,
        toZ: projectile.toZ,
        weaponId: payload.weaponId
      }

      this.shotTrails.set(key, createShotTrail(projectilePayload, timestamp))
      this.shotProjectiles.set(
        key,
        createShotProjectile(projectilePayload, timestamp)
      )
    }
  }

  handleGrenadeThrown = (payload: {
    grenadeId: string
    shooterPlayerId: string
    x: number
    z: number
    vx: number
    vz: number
    speed: number
    toX: number
    toZ: number
    radius: number
    blastRadius: number
    maxDamage: number
    fuseMs: number
  }) => {
    const now = performance.now()
    this.sharedGrenades.set(payload.grenadeId, {
      id: payload.grenadeId,
      shooterPlayerId: payload.shooterPlayerId,
      x: payload.x,
      y: payload.z,
      vx: payload.vx,
      vy: payload.vz,
      speed: payload.speed,
      targetX: payload.toX,
      targetY: payload.toZ,
      radius: payload.radius,
      blastRadius: payload.blastRadius,
      maxDamage: payload.maxDamage,
      createdAt: now,
      fuseMs: payload.fuseMs,
      baseFuseMs: payload.fuseMs,
      fuseRemainingMs: payload.fuseMs,
      isResting: false,
      lastUpdatedAt: now
    })
  }

  handleGrenadeExploded = (payload: {
    grenadeId: string
    x: number
    z: number
    blastRadius: number
  }) => {
    this.sharedGrenades.delete(payload.grenadeId)
    this.sharedExplosions.set(payload.grenadeId, {
      id: payload.grenadeId,
      x: payload.x,
      y: payload.z,
      blastRadius: payload.blastRadius,
      createdAt: performance.now(),
      durationMs: 260
    })
  }

  private emit() {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

export { GameClientSession }
export type { GameSessionSnapshot }
