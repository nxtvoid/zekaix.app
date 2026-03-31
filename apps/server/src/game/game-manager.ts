import type { Logger } from '@zekaix/utils/logger'
import type { SocketIOServer, SocketIOSocket } from '../types'
import { db } from '@zekaix/db'
import {
  calculateMuzzlePosition,
  calculateShotTravelDuration
} from '@zekaix/game/canvas'
import {
  GUNS,
  PICKUP_CATALOG,
  PICKUP_WEIGHT_TABLE,
  SINGLE_MAP_DEFINITION,
  TankGun,
  createGrenadeState,
  getRandomMapSpawn,
  pickRandomSpawnPoint,
  simulateGrenadeThrow
} from '@zekaix/game/engine'
import type { GamePickupKind, GamePickupState } from '@zekaix/game/engine'
import { findOrCreateGame, getGameState } from '@zekaix/game/queries'

type WeaponId = keyof typeof GUNS

type PlayerRuntimeState = {
  playerId: string
  playerName: string
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  currentWeapon: WeaponId
  hp: number
  shield: number
  kills: number
  deaths: number
  isDead: boolean
  updatedAt: number
}

type PickupState = GamePickupState & {
  spawnPointId: string
}

const EPSILON = 0.0001

const getRayCircleIntersectionDistance = (
  originX: number,
  originZ: number,
  directionX: number,
  directionZ: number,
  maxDistance: number,
  circleX: number,
  circleZ: number,
  radius: number
) => {
  const offsetX = originX - circleX
  const offsetZ = originZ - circleZ
  const b = 2 * (offsetX * directionX + offsetZ * directionZ)
  const c = offsetX * offsetX + offsetZ * offsetZ - radius * radius
  const discriminant = b * b - 4 * c

  if (discriminant < 0) {
    return null
  }

  const sqrtDiscriminant = Math.sqrt(discriminant)
  const nearDistance = (-b - sqrtDiscriminant) / 2
  const farDistance = (-b + sqrtDiscriminant) / 2

  if (nearDistance >= 0 && nearDistance <= maxDistance) {
    return nearDistance
  }

  if (farDistance >= 0 && farDistance <= maxDistance) {
    return farDistance
  }

  return null
}

const getRayRectIntersectionDistance = (
  originX: number,
  originZ: number,
  directionX: number,
  directionZ: number,
  maxDistance: number,
  rectX: number,
  rectZ: number,
  rectWidth: number,
  rectHeight: number
) => {
  let minDistance = 0
  let maxHitDistance = maxDistance

  if (Math.abs(directionX) < EPSILON) {
    if (originX < rectX || originX > rectX + rectWidth) {
      return null
    }
  } else {
    const invDirectionX = 1 / directionX
    const x1 = (rectX - originX) * invDirectionX
    const x2 = (rectX + rectWidth - originX) * invDirectionX
    const nearX = Math.min(x1, x2)
    const farX = Math.max(x1, x2)

    minDistance = Math.max(minDistance, nearX)
    maxHitDistance = Math.min(maxHitDistance, farX)
  }

  if (Math.abs(directionZ) < EPSILON) {
    if (originZ < rectZ || originZ > rectZ + rectHeight) {
      return null
    }
  } else {
    const invDirectionZ = 1 / directionZ
    const z1 = (rectZ - originZ) * invDirectionZ
    const z2 = (rectZ + rectHeight - originZ) * invDirectionZ
    const nearZ = Math.min(z1, z2)
    const farZ = Math.max(z1, z2)

    minDistance = Math.max(minDistance, nearZ)
    maxHitDistance = Math.min(maxHitDistance, farZ)
  }

  if (maxHitDistance < 0 || minDistance > maxHitDistance || minDistance > maxDistance) {
    return null
  }

  return Math.max(0, minDistance)
}

const getNearestObstacleDistanceOnRay = (
  originX: number,
  originZ: number,
  directionX: number,
  directionZ: number,
  maxDistance: number
) => {
  let nearestDistance = maxDistance

  for (const obstacle of SINGLE_MAP_DEFINITION.obstacles) {
    const distance =
      obstacle.kind === 'circle'
        ? getRayCircleIntersectionDistance(
            originX,
            originZ,
            directionX,
            directionZ,
            maxDistance,
            obstacle.x,
            obstacle.y,
            obstacle.radius
          )
        : getRayRectIntersectionDistance(
            originX,
            originZ,
            directionX,
            directionZ,
            maxDistance,
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
          )

    if (distance === null) {
      continue
    }

    nearestDistance = Math.min(nearestDistance, distance)
  }

  return nearestDistance
}

export class GameManager {
  private static readonly DISCONNECT_GRACE_MS = 4000
  private static readonly PLAYER_HITBOX_RADIUS = 30
  private static readonly PICKUP_COLLECTION_RADIUS = 52
  private shotSequence = 0

  private socketToGameId = new Map<string, string>()
  private socketToPresenceKey = new Map<string, string>()
  private activeSocketCountByPresence = new Map<string, number>()
  private pendingRuntimeStateByPresence = new Map<string, PlayerRuntimeState>()
  private disconnectCleanupTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()

  private playerStateByGame = new Map<string, Map<string, PlayerRuntimeState>>()
  private pickupsByGame = new Map<string, Map<string, PickupState>>()
  private recentPickupSpawnPointsByGame = new Map<string, string[]>()
  private pickupSpawnIntervalByGame = new Map<
    string,
    ReturnType<typeof setInterval>
  >()

  constructor(private io: SocketIOServer) {}

  private buildPresenceKey(gameId: string, playerId: string) {
    return `${gameId}:${playerId}`
  }

  private clearDisconnectCleanupTimer(presenceKey: string) {
    const timer = this.disconnectCleanupTimers.get(presenceKey)

    if (!timer) {
      return
    }

    clearTimeout(timer)
    this.disconnectCleanupTimers.delete(presenceKey)
  }

  private consumePendingRuntimeState(presenceKey: string) {
    const pendingState = this.pendingRuntimeStateByPresence.get(presenceKey)

    if (!pendingState) {
      return null
    }

    this.pendingRuntimeStateByPresence.delete(presenceKey)

    return pendingState
  }

  private registerSocketPresence(
    socketId: string,
    gameId: string,
    playerId: string
  ) {
    const nextPresenceKey = this.buildPresenceKey(gameId, playerId)
    const previousPresenceKey = this.socketToPresenceKey.get(socketId)

    if (previousPresenceKey && previousPresenceKey !== nextPresenceKey) {
      this.unregisterSocketPresence(socketId)
    }

    this.socketToPresenceKey.set(socketId, nextPresenceKey)
    this.activeSocketCountByPresence.set(
      nextPresenceKey,
      (this.activeSocketCountByPresence.get(nextPresenceKey) ?? 0) + 1
    )
    this.clearDisconnectCleanupTimer(nextPresenceKey)
  }

  private unregisterSocketPresence(socketId: string) {
    const presenceKey = this.socketToPresenceKey.get(socketId)

    if (!presenceKey) {
      return null
    }

    this.socketToPresenceKey.delete(socketId)

    const currentCount = this.activeSocketCountByPresence.get(presenceKey) ?? 0

    if (currentCount <= 1) {
      this.activeSocketCountByPresence.delete(presenceKey)

      return {
        presenceKey,
        remainingConnections: 0
      }
    }

    const nextCount = currentCount - 1

    this.activeSocketCountByPresence.set(presenceKey, nextCount)

    return {
      presenceKey,
      remainingConnections: nextCount
    }
  }

  private getRandomSpawn(gameId: string) {
    const currentPlayers = Array.from(
      this.playerStateByGame.get(gameId)?.values() ?? []
    ).map((player) => ({
      x: player.x,
      y: player.z,
      radius: 170
    }))
    const spawn = getRandomMapSpawn(SINGLE_MAP_DEFINITION, {
      padding: 160,
      radius: GameManager.PLAYER_HITBOX_RADIUS + 12,
      attempts: 120,
      avoidPoints: currentPlayers
    })

    return {
      x: spawn.x,
      z: spawn.y,
      yaw: Math.random() * Math.PI * 2,
      pitch: 0
    }
  }

  private ensurePlayerState(
    socket: SocketIOSocket,
    gameId: string,
    restoredState?: PlayerRuntimeState | null
  ) {
    let gamePlayers = this.playerStateByGame.get(gameId)

    if (!gamePlayers) {
      gamePlayers = new Map<string, PlayerRuntimeState>()
      this.playerStateByGame.set(gameId, gamePlayers)
    }

    const existing = gamePlayers.get(socket.data.playerId)

    if (existing) {
      existing.playerName = socket.data.playerName
      existing.updatedAt = Date.now()
      return existing
    }

    const state: PlayerRuntimeState = restoredState
      ? {
          ...restoredState,
          playerName: socket.data.playerName,
          updatedAt: Date.now()
        }
      : (() => {
          const spawn = this.getRandomSpawn(gameId)

          return {
            playerId: socket.data.playerId,
            playerName: socket.data.playerName,
            x: spawn.x,
            y: 0,
            z: spawn.z,
            yaw: spawn.yaw,
            pitch: spawn.pitch,
            currentWeapon: 'pistol',
            hp: 100,
            shield: 100,
            kills: 0,
            deaths: 0,
            isDead: false,
            updatedAt: Date.now()
          }
        })()

    gamePlayers.set(socket.data.playerId, state)
    return state
  }

  private getTopLeaderboard(gameId: string) {
    const gamePlayers = this.playerStateByGame.get(gameId)

    if (!gamePlayers) {
      return []
    }

    return Array.from(gamePlayers.values())
      .sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills
        return a.playerName.localeCompare(b.playerName)
      })
      .slice(0, 5)
      .map((player, index) => ({
        rank: index + 1,
        playerId: player.playerId,
        playerName: player.playerName,
        kills: player.kills,
        isDead: player.isDead
      }))
  }

  private emitLeaderboard(gameId: string) {
    this.io.to(gameId).emit('game:leaderboard', this.getTopLeaderboard(gameId))
  }

  private emitPlayerStats(gameId: string, player: PlayerRuntimeState) {
    this.io.to(gameId).emit('game:player_stats', {
      playerId: player.playerId,
      currentWeapon: player.currentWeapon,
      kills: player.kills,
      deaths: player.deaths,
      hp: player.hp,
      shield: player.shield,
      isDead: player.isDead
    })
  }

  private emitRuntimeSnapshot(
    socket: SocketIOSocket,
    gameId: string,
    playerId = socket.data.playerId
  ) {
    const gamePlayers = this.playerStateByGame.get(gameId)
    const pickupBucket = this.pickupsByGame.get(gameId)
    const player = gamePlayers?.get(playerId)

    socket.emit('game:players_snapshot', Array.from(gamePlayers?.values() ?? []))
    socket.emit('game:pickups_snapshot', Array.from(pickupBucket?.values() ?? []))
    socket.emit('game:leaderboard', this.getTopLeaderboard(gameId))

    if (player) {
      socket.emit('game:player_stats', {
        playerId: player.playerId,
        currentWeapon: player.currentWeapon,
        kills: player.kills,
        deaths: player.deaths,
        hp: player.hp,
        shield: player.shield,
        isDead: player.isDead
      })
    }
  }

  private startPickupSpawner(gameId: string) {
    if (this.pickupSpawnIntervalByGame.has(gameId)) {
      return
    }

    const spawnPickup = () => {
      let pickupBucket = this.pickupsByGame.get(gameId)

      if (!pickupBucket) {
        pickupBucket = new Map<string, PickupState>()
        this.pickupsByGame.set(gameId, pickupBucket)
      }

      if (pickupBucket.size >= 6) {
        return
      }

      const recentPoints = this.recentPickupSpawnPointsByGame.get(gameId) ?? []
      const occupiedSpawnPointIds = Array.from(pickupBucket.values()).map(
        (pickup) => pickup.spawnPointId
      )
      const spawnPoint = pickRandomSpawnPoint(
        occupiedSpawnPointIds,
        recentPoints
      )

      if (!spawnPoint) {
        return
      }

      const roll = Math.random()
      let weightCursor = 0
      let kind: GamePickupKind = 'ammo'

      for (const entry of PICKUP_WEIGHT_TABLE) {
        weightCursor += entry.weight

        if (roll <= weightCursor) {
          kind = entry.kind
          break
        }
      }

      const profile = PICKUP_CATALOG[kind]
      const pickup: PickupState = {
        id: `${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
        kind,
        x: spawnPoint.x,
        z: spawnPoint.z,
        value: profile.value,
        spawnedAt: Date.now(),
        spawnPointId: spawnPoint.id
      }

      pickupBucket.set(pickup.id, pickup)
      this.io.to(gameId).emit('game:pickup_spawned', {
        id: pickup.id,
        kind: pickup.kind,
        x: pickup.x,
        z: pickup.z,
        value: pickup.value,
        spawnedAt: pickup.spawnedAt
      })

      const nextRecentPoints = [...recentPoints, spawnPoint.id].slice(-4)
      this.recentPickupSpawnPointsByGame.set(gameId, nextRecentPoints)
    }

    spawnPickup()
    spawnPickup()
    spawnPickup()

    const interval = setInterval(() => {
      spawnPickup()
    }, 12000)

    this.pickupSpawnIntervalByGame.set(gameId, interval)
  }

  private stopPickupSpawner(gameId: string) {
    const interval = this.pickupSpawnIntervalByGame.get(gameId)

    if (!interval) {
      return
    }

    clearInterval(interval)
    this.pickupSpawnIntervalByGame.delete(gameId)
    this.pickupsByGame.delete(gameId)
    this.recentPickupSpawnPointsByGame.delete(gameId)
  }

  private collectNearbyPickups(gameId: string, player: PlayerRuntimeState) {
    const pickupBucket = this.pickupsByGame.get(gameId)

    if (!pickupBucket || pickupBucket.size === 0) {
      return
    }

    for (const pickup of pickupBucket.values()) {
      const dx = pickup.x - player.x
      const dz = pickup.z - player.z

      if (
        dx * dx + dz * dz >
        GameManager.PICKUP_COLLECTION_RADIUS *
          GameManager.PICKUP_COLLECTION_RADIUS
      ) {
        continue
      }

      pickupBucket.delete(pickup.id)

      if (pickup.kind === 'repair_kit') {
        player.hp = Math.min(100, player.hp + pickup.value)
      }

      player.updatedAt = Date.now()

      this.io.to(gameId).emit('game:pickup_collected', {
        pickupId: pickup.id,
        collectorId: player.playerId,
        kind: pickup.kind,
        value: pickup.value,
        label: PICKUP_CATALOG[pickup.kind].label
      })

      if (pickup.kind === 'repair_kit') {
        this.emitPlayerStats(gameId, player)
        this.io.to(gameId).emit('game:player_updated', {
          playerId: player.playerId,
          hp: player.hp,
          shield: player.shield,
          isDead: player.isDead
        })
      }
    }
  }

  private async cleanupDisconnectedPlayer(
    gameId: string,
    playerId: string,
    presenceKey: string,
    logger: Logger
  ) {
    this.disconnectCleanupTimers.delete(presenceKey)

    if ((this.activeSocketCountByPresence.get(presenceKey) ?? 0) > 0) {
      return
    }

    this.pendingRuntimeStateByPresence.delete(presenceKey)

    try {
      await db.gamePlayers.deleteMany({
        where: {
          gameId,
          playerId
        }
      })

      const gamePlayers = this.playerStateByGame.get(gameId)

      if (!gamePlayers || gamePlayers.size === 0) {
        this.stopPickupSpawner(gameId)
      }

      const gameState = await getGameState(gameId, logger)

      if (gameState) {
        this.io.to(gameId).emit('game:state', gameState)
      }
    } catch (error) {
      logger
        .child({ error, gameId, playerId })
        .warn('Failed to cleanup disconnected player from game')
    }
  }

  private async persistKillStats(
    killerPlayerId: string,
    victimPlayerId: string
  ) {
    await Promise.all([
      db.playerStats.upsert({
        where: {
          userId: killerPlayerId
        },
        create: {
          userId: killerPlayerId,
          kills: 1,
          deaths: 0
        },
        update: {
          kills: {
            increment: 1
          }
        }
      }),
      db.playerStats.upsert({
        where: {
          userId: victimPlayerId
        },
        create: {
          userId: victimPlayerId,
          kills: 0,
          deaths: 1
        },
        update: {
          deaths: {
            increment: 1
          }
        }
      })
    ])
  }

  private async resolveShotImpact(
    gameId: string,
    shooterPlayerId: string,
    targetPlayerId: string,
    damage: number,
    logger: Logger
  ) {
    const gamePlayers = this.playerStateByGame.get(gameId)

    if (!gamePlayers) {
      return
    }

    const shooter = gamePlayers.get(shooterPlayerId)
    const target = gamePlayers.get(targetPlayerId)

    if (!shooter || !target || shooter.isDead || target.isDead) {
      return
    }

    let remainingDamage = damage

    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remainingDamage)
      target.shield -= absorbed
      remainingDamage -= absorbed
    }

    if (remainingDamage > 0) {
      target.hp = Math.max(0, target.hp - remainingDamage)
    }

    target.updatedAt = Date.now()

    const lethalHit = target.hp <= 0
    const isDeadNow = lethalHit || target.isDead

    this.io.to(gameId).emit('game:player_updated', {
      playerId: target.playerId,
      hp: target.hp,
      shield: target.shield,
      isDead: isDeadNow
    })

    this.io.to(gameId).emit('game:hit_confirmed', {
      shooterPlayerId,
      targetPlayerId: target.playerId,
      damage,
      isDead: lethalHit
    })

    if (!lethalHit || target.isDead) {
      return
    }

    target.isDead = true
    target.deaths += 1
    target.updatedAt = Date.now()

    shooter.kills += 1
    shooter.updatedAt = Date.now()

    this.io.to(gameId).emit('game:player_died', {
      playerId: target.playerId,
      killedBy: shooter.playerId,
      killerName: shooter.playerName,
      victimName: target.playerName,
      canRespawn: true
    })

    this.emitPlayerStats(gameId, shooter)
    this.emitPlayerStats(gameId, target)
    this.emitLeaderboard(gameId)

    try {
      await this.persistKillStats(shooter.playerId, target.playerId)
    } catch (error) {
      logger.child({ error }).warn('Failed to persist kill stats')
    }
  }

  private async resolveExplosionDamage(
    gameId: string,
    shooterPlayerId: string,
    payload: {
      x: number
      z: number
      blastRadius: number
      maxDamage: number
    },
    logger: Logger
  ) {
    const gamePlayers = this.playerStateByGame.get(gameId)

    if (!gamePlayers) {
      return
    }

    const shooter = gamePlayers.get(shooterPlayerId)

    if (!shooter || shooter.isDead) {
      return
    }

    for (const target of gamePlayers.values()) {
      if (target.isDead) {
        continue
      }

      const distance = Math.hypot(target.x - payload.x, target.z - payload.z)

      if (distance > payload.blastRadius) {
        continue
      }

      const falloff = 1 - distance / payload.blastRadius
      const damage = Math.max(0, Math.floor(payload.maxDamage * falloff))

      if (damage <= 0) {
        continue
      }

      await this.resolveShotImpact(
        gameId,
        shooterPlayerId,
        target.playerId,
        damage,
        logger
      )
    }
  }

  async handleAutoJoin(socket: SocketIOSocket, logger: Logger) {
    try {
      const game = await findOrCreateGame()
      await this.handleJoin(socket, game.id, logger)
    } catch (error) {
      logger.child({ error }).error('Auto-join failed')
      socket.emit('error:join', { reason: 'Failed to auto-join active world.' })
    }
  }

  async handleMatchmaking(socket: SocketIOSocket, logger: Logger) {
    socket.emit('matchmaking:searching')

    try {
      const game = await findOrCreateGame()
      socket.emit('matchmaking:found', { gameId: game.id })
      await this.handleJoin(socket, game.id, logger)
    } catch (error) {
      logger.child({ error }).error('Matchmaking failed')
      socket.emit('error:matchmaking', {
        reason: 'Failed to find an active FFA world.'
      })
    }
  }

  async handleJoin(socket: SocketIOSocket, gameId: string, logger: Logger) {
    const { playerId } = socket.data
    let didPersistPlayer = false
    let joinedSuccessfully = false

    try {
      const game = await db.game.findUnique({
        where: { id: gameId },
        include: { _count: { select: { players: true } } }
      })

      if (!game) {
        socket.emit('error:join', { reason: 'Active world not available.' })
        return
      }

      if (game._count.players >= game.maxPlayers) {
        const fallbackGame = await findOrCreateGame()

        if (fallbackGame.id !== gameId) {
          await this.handleJoin(socket, fallbackGame.id, logger)
          return
        }
      }

      await db.gamePlayers.upsert({
        where: {
          gameId_playerId: {
            gameId,
            playerId
          }
        },
        update: {},
        create: {
          gameId,
          playerId,
          isHost: false
        }
      })
      didPersistPlayer = true

      const gameState = await getGameState(gameId, logger)

      if (!gameState) {
        await db.gamePlayers.deleteMany({
          where: {
            gameId,
            playerId
          }
        })
        socket.emit('error:join', { reason: 'Game state unavailable.' })
        return
      }

      socket.join(gameId)
      this.socketToGameId.set(socket.id, gameId)
      this.registerSocketPresence(socket.id, gameId, playerId)

      const presenceKey = this.buildPresenceKey(gameId, playerId)
      const restoredState = this.consumePendingRuntimeState(presenceKey)
      const playerState = this.ensurePlayerState(socket, gameId, restoredState)

      let pickupBucket = this.pickupsByGame.get(gameId)

      if (!pickupBucket) {
        pickupBucket = new Map<string, PickupState>()
        this.pickupsByGame.set(gameId, pickupBucket)
      }

      this.startPickupSpawner(gameId)

      socket.emit('game:joined', {
        gameId,
        playerId: socket.data.playerId,
        playerName: socket.data.playerName
      })
      socket.emit('game:state', gameState)
      this.emitRuntimeSnapshot(socket, gameId, socket.data.playerId)
      socket.to(gameId).emit('game:player_joined', playerState)
      this.emitLeaderboard(gameId)
      this.emitPlayerStats(gameId, playerState)
      joinedSuccessfully = true
    } catch (error) {
      if (didPersistPlayer && !joinedSuccessfully) {
        try {
          await db.gamePlayers.deleteMany({
            where: {
              gameId,
              playerId
            }
          })
        } catch (rollbackError) {
          logger
            .child({ rollbackError, gameId, playerId })
            .warn('Failed to rollback player after join error')
        }
      }

      logger.child({ error, gameId }).error('Error joining game')
      socket.emit('error:join', { reason: 'Unexpected error.' })
    }
  }

  handlePlayerSync(
    socket: SocketIOSocket,
    payload: {
      x: number
      y: number
      z: number
      yaw: number
      pitch: number
      currentWeapon: string
    }
  ) {
    const gameId = this.socketToGameId.get(socket.id)

    if (!gameId) {
      return
    }

    const gamePlayers = this.playerStateByGame.get(gameId)

    if (!gamePlayers) {
      return
    }

    const prev = gamePlayers.get(socket.data.playerId)

    if (!prev || prev.isDead) {
      return
    }

    const nextWeapon =
      payload.currentWeapon in GUNS
        ? (payload.currentWeapon as WeaponId)
        : prev.currentWeapon
    const didWeaponChange = nextWeapon !== prev.currentWeapon

    const nextState: PlayerRuntimeState = {
      ...prev,
      x: Number.isFinite(payload.x) ? payload.x : prev.x,
      y: Number.isFinite(payload.y) ? payload.y : prev.y,
      z: Number.isFinite(payload.z) ? payload.z : prev.z,
      yaw: Number.isFinite(payload.yaw) ? payload.yaw : prev.yaw,
      pitch: Number.isFinite(payload.pitch) ? payload.pitch : prev.pitch,
      currentWeapon: nextWeapon,
      updatedAt: Date.now()
    }

    gamePlayers.set(socket.data.playerId, nextState)
    this.collectNearbyPickups(gameId, nextState)
    socket.to(gameId).emit('game:player_moved', nextState)

    if (didWeaponChange) {
      this.emitPlayerStats(gameId, nextState)
    }
  }

  async handleShot(
    socket: SocketIOSocket,
    payload: {
      yaw?: number
    },
    logger: Logger
  ) {
    const gameId = this.socketToGameId.get(socket.id)

    if (!gameId) {
      return
    }

    const gamePlayers = this.playerStateByGame.get(gameId)

    if (!gamePlayers) {
      return
    }

    const shooter = gamePlayers.get(socket.data.playerId)

    if (!shooter || shooter.isDead) {
      return
    }

    const fallbackWeapon = GUNS.pistol

    if (!fallbackWeapon) {
      return
    }

    const weaponProfile = GUNS[shooter.currentWeapon] || fallbackWeapon
    const shotYaw =
      typeof payload.yaw === 'number' && Number.isFinite(payload.yaw)
        ? payload.yaw
        : shooter.yaw
    const muzzlePosition = calculateMuzzlePosition(
      shooter.x,
      shooter.z,
      shotYaw
    )
    const maxRange = Math.max(100, weaponProfile.maxRange)
    const shotAngles = new TankGun(shooter.currentWeapon).generateBulletAngles(
      shotYaw
    )
    const damage = Math.max(1, Math.floor(weaponProfile.damage))
    const projectiles: Array<{
      projectileId: string
      targetPlayerId: string | null
      fromX: number
      fromZ: number
      toX: number
      toZ: number
    }> = []

    for (let index = 0; index < shotAngles.length; index += 1) {
      const projectileYaw = shotAngles[index] ?? shotYaw
      const directionX = Math.cos(projectileYaw)
      const directionZ = Math.sin(projectileYaw)
      const nearestObstacleDistance = getNearestObstacleDistanceOnRay(
        muzzlePosition.x,
        muzzlePosition.y,
        directionX,
        directionZ,
        maxRange
      )

      let target: PlayerRuntimeState | null = null
      let nearestDistanceOnRay = nearestObstacleDistance

      for (const candidate of gamePlayers.values()) {
        if (candidate.playerId === shooter.playerId || candidate.isDead) {
          continue
        }

        const relativeX = candidate.x - muzzlePosition.x
        const relativeZ = candidate.z - muzzlePosition.y
        const distanceOnRay = relativeX * directionX + relativeZ * directionZ

        if (distanceOnRay < 0 || distanceOnRay > nearestObstacleDistance) {
          continue
        }

        const closestX = muzzlePosition.x + directionX * distanceOnRay
        const closestZ = muzzlePosition.y + directionZ * distanceOnRay
        const offsetX = candidate.x - closestX
        const offsetZ = candidate.z - closestZ
        const radialDistanceSq = offsetX * offsetX + offsetZ * offsetZ

        if (
          radialDistanceSq >
          GameManager.PLAYER_HITBOX_RADIUS * GameManager.PLAYER_HITBOX_RADIUS
        ) {
          continue
        }

        if (distanceOnRay < nearestDistanceOnRay) {
          nearestDistanceOnRay = distanceOnRay
          target = candidate
        }
      }

      const shotDistance = Math.min(maxRange, nearestDistanceOnRay)
      const shotEndX = muzzlePosition.x + directionX * shotDistance
      const shotEndZ = muzzlePosition.y + directionZ * shotDistance
      const projectileId = `${Date.now()}:${shooter.playerId}:${++this.shotSequence}:${index}`

      projectiles.push({
        projectileId,
        targetPlayerId: target?.playerId ?? null,
        fromX: muzzlePosition.x,
        fromZ: muzzlePosition.y,
        toX: shotEndX,
        toZ: shotEndZ
      })

      if (!target) {
        continue
      }

      const shotTravelMs = calculateShotTravelDuration(
        shooter.currentWeapon,
        shotDistance
      )

      setTimeout(() => {
        void this.resolveShotImpact(
          gameId,
          shooter.playerId,
          target.playerId,
          damage,
          logger
        )
      }, shotTravelMs)
    }

    this.io.to(gameId).emit('game:shot_fired', {
      shooterPlayerId: shooter.playerId,
      weaponId: shooter.currentWeapon,
      projectiles
    })
  }

  handleGrenadeThrow(
    socket: SocketIOSocket,
    payload: {
      x: number
      z: number
      targetX: number
      targetZ: number
    },
    logger: Logger
  ) {
    const gameId = this.socketToGameId.get(socket.id)

    if (!gameId) {
      return
    }

    const gamePlayers = this.playerStateByGame.get(gameId)

    if (!gamePlayers) {
      return
    }

    const shooter = gamePlayers.get(socket.data.playerId)

    if (!shooter || shooter.isDead) {
      return
    }

    const grenadeRadius = 180
    const grenadeMaxDamage = 90
    const grenadeFuseMs = 1800
    const grenadeThrowSpeed = 420
    const maxThrowDistance = 340

    const initialGrenade = createGrenadeState(
      { x: shooter.x, y: shooter.z },
      { x: payload.targetX, y: payload.targetZ },
      {
        blastRadius: grenadeRadius,
        maxDamage: grenadeMaxDamage,
        fuseMs: grenadeFuseMs,
        speed: grenadeThrowSpeed,
        maxThrowDistance
      }
    )
    const finalGrenade = simulateGrenadeThrow(
      { x: shooter.x, y: shooter.z },
      { x: payload.targetX, y: payload.targetZ },
      {
        blastRadius: grenadeRadius,
        maxDamage: grenadeMaxDamage,
        fuseMs: grenadeFuseMs,
        speed: grenadeThrowSpeed,
        maxThrowDistance,
        radius: initialGrenade.radius
      },
      {
        width: SINGLE_MAP_DEFINITION.width,
        height: SINGLE_MAP_DEFINITION.height
      },
      SINGLE_MAP_DEFINITION.obstacles
    )
    const grenadeId = `${Date.now()}:${shooter.playerId}:grenade:${++this.shotSequence}`

    this.io.to(gameId).emit('game:grenade_thrown', {
      grenadeId,
      shooterPlayerId: shooter.playerId,
      x: initialGrenade.x,
      z: initialGrenade.y,
      vx: initialGrenade.vx,
      vz: initialGrenade.vy,
      speed: initialGrenade.speed,
      toX: initialGrenade.targetX,
      toZ: initialGrenade.targetY,
      radius: initialGrenade.radius,
      blastRadius: grenadeRadius,
      maxDamage: grenadeMaxDamage,
      fuseMs: grenadeFuseMs
    })

    setTimeout(() => {
      this.io.to(gameId).emit('game:grenade_exploded', {
        grenadeId,
        x: finalGrenade.x,
        z: finalGrenade.y,
        blastRadius: grenadeRadius
      })

      void this.resolveExplosionDamage(
        gameId,
        shooter.playerId,
        {
          x: finalGrenade.x,
          z: finalGrenade.y,
          blastRadius: grenadeRadius,
          maxDamage: grenadeMaxDamage
        },
        logger
      )
    }, grenadeFuseMs)
  }

  handleRespawn(socket: SocketIOSocket) {
    const gameId = this.socketToGameId.get(socket.id)

    if (!gameId) {
      return
    }

    const gamePlayers = this.playerStateByGame.get(gameId)

    if (!gamePlayers) {
      return
    }

    const player = gamePlayers.get(socket.data.playerId)

    if (!player || !player.isDead) {
      return
    }

    const spawn = this.getRandomSpawn(gameId)

    player.x = spawn.x
    player.z = spawn.z
    player.yaw = spawn.yaw
    player.pitch = spawn.pitch
    player.hp = 100
    player.shield = 100
    player.isDead = false
    player.updatedAt = Date.now()

    this.io.to(gameId).emit('game:player_respawned', {
      playerId: player.playerId,
      x: player.x,
      y: player.y,
      z: player.z,
      yaw: player.yaw,
      pitch: player.pitch,
      hp: player.hp,
      shield: player.shield,
      currentWeapon: player.currentWeapon
    })

    this.emitRuntimeSnapshot(socket, gameId, player.playerId)
    this.emitPlayerStats(gameId, player)
    this.emitLeaderboard(gameId)
  }

  handleRuntimeSnapshotRequest(socket: SocketIOSocket) {
    const gameId = this.socketToGameId.get(socket.id)

    if (!gameId) {
      return
    }

    this.emitRuntimeSnapshot(socket, gameId, socket.data.playerId)
  }

  async handleDisconnect(socket: SocketIOSocket, logger: Logger) {
    const gameId = this.socketToGameId.get(socket.id)
    const playerId = socket.data.playerId

    if (!gameId) {
      return
    }

    this.socketToGameId.delete(socket.id)

    const presence = this.unregisterSocketPresence(socket.id)

    if (!presence) {
      return
    }

    if (presence.remainingConnections > 0) {
      return
    }

    const gamePlayers = this.playerStateByGame.get(gameId)

    if (gamePlayers) {
      const currentRuntimeState = gamePlayers.get(playerId)

      if (currentRuntimeState) {
        if (!currentRuntimeState.isDead) {
          this.pendingRuntimeStateByPresence.set(
            presence.presenceKey,
            currentRuntimeState
          )
        }
      }

      gamePlayers.delete(playerId)
      this.io.to(gameId).emit('game:player_left', { playerId })
      this.emitLeaderboard(gameId)

      if (gamePlayers.size === 0) {
        this.playerStateByGame.delete(gameId)
        this.stopPickupSpawner(gameId)
      }
    }

    this.clearDisconnectCleanupTimer(presence.presenceKey)

    const cleanupTimer = setTimeout(() => {
      void this.cleanupDisconnectedPlayer(
        gameId,
        playerId,
        presence.presenceKey,
        logger
      )
    }, GameManager.DISCONNECT_GRACE_MS)

    this.disconnectCleanupTimers.set(presence.presenceKey, cleanupTimer)
  }
}
