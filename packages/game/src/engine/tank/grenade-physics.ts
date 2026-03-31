import type { MapObstacle } from '../maps/types'
import type { TankGrenade, TankGrenadeThrowOptions } from './types'

type GrenadeBounds = {
  width: number
  height: number
}

type GrenadePhysicsState = {
  x: number
  y: number
  vx: number
  vy: number
  fuseRemainingMs: number
  radius: number
  isResting: boolean
}

const GRENADE_BOUNCE_DAMPING = 0.74
const GRENADE_DRAG_PER_SECOND = 1.35
const GRENADE_MIN_SPEED = 26

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const reflectVelocity = (
  vx: number,
  vy: number,
  normalX: number,
  normalY: number
) => {
  const dot = vx * normalX + vy * normalY

  return {
    vx: (vx - 2 * dot * normalX) * GRENADE_BOUNCE_DAMPING,
    vy: (vy - 2 * dot * normalY) * GRENADE_BOUNCE_DAMPING
  }
}

const resolveRectCollision = (
  x: number,
  y: number,
  radius: number,
  obstacle: Extract<MapObstacle, { kind: 'rect' | 'cover_box' }>
) => {
  const nearestX = clamp(x, obstacle.x, obstacle.x + obstacle.width)
  const nearestY = clamp(y, obstacle.y, obstacle.y + obstacle.height)
  let dx = x - nearestX
  let dy = y - nearestY
  let distanceSq = dx * dx + dy * dy

  if (distanceSq > radius * radius) {
    return null
  }

  if (distanceSq <= 0.0001) {
    const leftPenetration = Math.abs(x - obstacle.x)
    const rightPenetration = Math.abs(obstacle.x + obstacle.width - x)
    const topPenetration = Math.abs(y - obstacle.y)
    const bottomPenetration = Math.abs(obstacle.y + obstacle.height - y)
    const minPenetration = Math.min(
      leftPenetration,
      rightPenetration,
      topPenetration,
      bottomPenetration
    )

    if (minPenetration === leftPenetration) {
      dx = -1
      dy = 0
    } else if (minPenetration === rightPenetration) {
      dx = 1
      dy = 0
    } else if (minPenetration === topPenetration) {
      dx = 0
      dy = -1
    } else {
      dx = 0
      dy = 1
    }

    distanceSq = 1
  }

  const distance = Math.sqrt(distanceSq)
  const overlap = radius - distance + 0.05
  const normalX = dx / distance
  const normalY = dy / distance

  return {
    normalX,
    normalY,
    correctionX: normalX * overlap,
    correctionY: normalY * overlap
  }
}

const resolveCircleCollision = (
  x: number,
  y: number,
  radius: number,
  obstacle: Extract<MapObstacle, { kind: 'circle' }>
) => {
  let dx = x - obstacle.x
  let dy = y - obstacle.y
  let distanceSq = dx * dx + dy * dy
  const combinedRadius = obstacle.radius + radius

  if (distanceSq > combinedRadius * combinedRadius) {
    return null
  }

  if (distanceSq <= 0.0001) {
    dx = 1
    dy = 0
    distanceSq = 1
  }

  const distance = Math.sqrt(distanceSq)
  const overlap = combinedRadius - distance + 0.05
  const normalX = dx / distance
  const normalY = dy / distance

  return {
    normalX,
    normalY,
    correctionX: normalX * overlap,
    correctionY: normalY * overlap
  }
}

const createGrenadeState = (
  position: { x: number; y: number },
  target: { x: number; y: number },
  options: TankGrenadeThrowOptions = {},
  id = 0
): TankGrenade => {
  const dx = target.x - position.x
  const dy = target.y - position.y
  const distanceToCursor = Math.hypot(dx, dy)
  const maxThrowDistance = Math.max(20, options.maxThrowDistance ?? 340)
  const clampedDistance = Math.min(distanceToCursor, maxThrowDistance)
  const normalizedX = distanceToCursor > 0 ? dx / distanceToCursor : 1
  const normalizedY = distanceToCursor > 0 ? dy / distanceToCursor : 0
  const targetX = position.x + normalizedX * clampedDistance
  const targetY = position.y + normalizedY * clampedDistance
  const speed = Math.max(80, options.speed ?? 420)
  const fuseMs = Math.max(300, options.fuseMs ?? 1800)

  return {
    id,
    x: position.x,
    y: position.y,
    targetX,
    targetY,
    vx: normalizedX * speed,
    vy: normalizedY * speed,
    speed,
    fuseRemainingMs: fuseMs,
    baseFuseMs: fuseMs,
    blastRadius: options.blastRadius ?? 180,
    maxDamage: options.maxDamage ?? 90,
    radius: options.radius ?? 6,
    isResting: false
  }
}

const advanceGrenadeState = (
  grenade: GrenadePhysicsState,
  deltaSeconds: number,
  bounds: GrenadeBounds,
  obstacles: MapObstacle[] = []
) => {
  grenade.fuseRemainingMs = Math.max(
    0,
    grenade.fuseRemainingMs - deltaSeconds * 1000
  )

  if (grenade.isResting) {
    return
  }

  const speed = Math.hypot(grenade.vx, grenade.vy)

  if (speed <= GRENADE_MIN_SPEED) {
    grenade.vx = 0
    grenade.vy = 0
    grenade.isResting = true
    return
  }

  const steps = Math.max(1, Math.ceil((speed * deltaSeconds) / 10))
  const stepSeconds = deltaSeconds / steps

  for (let step = 0; step < steps; step += 1) {
    let nextX = grenade.x + grenade.vx * stepSeconds
    let nextY = grenade.y + grenade.vy * stepSeconds
    let collisionNormalX = 0
    let collisionNormalY = 0
    let didCollide = false

    if (nextX - grenade.radius < 0) {
      nextX = grenade.radius
      collisionNormalX = 1
      collisionNormalY = 0
      didCollide = true
    } else if (nextX + grenade.radius > bounds.width) {
      nextX = bounds.width - grenade.radius
      collisionNormalX = -1
      collisionNormalY = 0
      didCollide = true
    }

    if (nextY - grenade.radius < 0) {
      nextY = grenade.radius
      collisionNormalX = 0
      collisionNormalY = 1
      didCollide = true
    } else if (nextY + grenade.radius > bounds.height) {
      nextY = bounds.height - grenade.radius
      collisionNormalX = 0
      collisionNormalY = -1
      didCollide = true
    }

    for (const obstacle of obstacles) {
      const collision =
        obstacle.kind === 'circle'
          ? resolveCircleCollision(nextX, nextY, grenade.radius, obstacle)
          : resolveRectCollision(nextX, nextY, grenade.radius, obstacle)

      if (!collision) {
        continue
      }

      nextX += collision.correctionX
      nextY += collision.correctionY
      collisionNormalX = collision.normalX
      collisionNormalY = collision.normalY
      didCollide = true
      break
    }

    grenade.x = nextX
    grenade.y = nextY

    if (didCollide) {
      const reflected = reflectVelocity(
        grenade.vx,
        grenade.vy,
        collisionNormalX,
        collisionNormalY
      )

      grenade.vx = reflected.vx
      grenade.vy = reflected.vy

      if (Math.hypot(grenade.vx, grenade.vy) <= GRENADE_MIN_SPEED) {
        grenade.vx = 0
        grenade.vy = 0
        grenade.isResting = true
        break
      }
    }
  }

  if (!grenade.isResting) {
    const drag = Math.max(0, 1 - GRENADE_DRAG_PER_SECOND * deltaSeconds)
    grenade.vx *= drag
    grenade.vy *= drag

    if (Math.hypot(grenade.vx, grenade.vy) <= GRENADE_MIN_SPEED) {
      grenade.vx = 0
      grenade.vy = 0
      grenade.isResting = true
    }
  }
}

const simulateGrenadeThrow = (
  position: { x: number; y: number },
  target: { x: number; y: number },
  options: TankGrenadeThrowOptions,
  bounds: GrenadeBounds,
  obstacles: MapObstacle[] = []
) => {
  const grenade = createGrenadeState(position, target, options)
  const stepMs = 1000 / 60

  while (grenade.fuseRemainingMs > 0) {
    advanceGrenadeState(grenade, stepMs / 1000, bounds, obstacles)
  }

  return grenade
}

export { advanceGrenadeState, createGrenadeState, simulateGrenadeThrow }
export type { GrenadeBounds, GrenadePhysicsState }
