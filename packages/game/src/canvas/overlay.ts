import type { MapObstacle } from '../engine/maps/types'
import { advanceGrenadeState } from '../engine/tank/grenade-physics'
import { GUNS } from '../engine/guns'
import { PICKUP_CATALOG } from '../engine/pickups/catalog'
import type {
  ClientMapPickup,
  HitMarker,
  RuntimePlayerState,
  SharedExplosion,
  SharedGrenade,
  ShotProjectile,
  ShotTrail
} from '../types/client-canvas'

const SHOT_TRAIL_MAX_AGE_MS = 170
const HIT_MARKER_MAX_AGE_MS = 400
const DAMAGE_BAR_SHOW_MS = 3000
const DAMAGE_BAR_FADE_MS = 500

export const drawMapPickups = (
  ctx: CanvasRenderingContext2D,
  pickups: Iterable<ClientMapPickup>,
  now: number
) => {
  for (const pickup of pickups) {
    const profile = PICKUP_CATALOG[pickup.kind]
    const pulse = 0.86 + Math.sin(now / 220 + pickup.x * 0.01) * 0.14

    ctx.save()
    ctx.translate(pickup.x, pickup.z)

    ctx.globalAlpha = 0.24
    ctx.fillStyle = profile.glowColor
    ctx.beginPath()
    ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(9, 12, 8, 0.92)'
    ctx.strokeStyle = profile.color
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.roundRect(-13, -13, 26, 26, 7)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = profile.color
    ctx.font = 'bold 8px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(profile.shortLabel, 0, 0.5)
    ctx.restore()
  }
}

type TrailStyle = {
  primary: string
  secondary: string
  width: number
}

const trailStyleForBullet = (bulletStyle: string): TrailStyle => {
  if (bulletStyle === 'sniper') {
    return {
      primary: 'rgba(255, 244, 185, 0.96)',
      secondary: 'rgba(63, 53, 24, 0.94)',
      width: 3
    }
  }
  if (bulletStyle === 'pellet') {
    return {
      primary: 'rgba(222, 255, 145, 0.92)',
      secondary: 'rgba(53, 64, 26, 0.9)',
      width: 2.4
    }
  }
  if (bulletStyle === 'small') {
    return {
      primary: 'rgba(192, 250, 116, 0.88)',
      secondary: 'rgba(35, 46, 19, 0.9)',
      width: 1.8
    }
  }
  return {
    primary: 'rgba(210, 255, 116, 0.95)',
    secondary: 'rgba(34, 37, 16, 0.95)',
    width: 2.2
  }
}

export const pruneAndDrawShotTrails = (
  ctx: CanvasRenderingContext2D,
  trails: Map<string, ShotTrail>,
  now: number
) => {
  const toDelete: string[] = []

  for (const [key, trail] of trails.entries()) {
    const age = now - trail.createdAt

    if (age > SHOT_TRAIL_MAX_AGE_MS) {
      toDelete.push(key)
      continue
    }

    const progress = age / SHOT_TRAIL_MAX_AGE_MS
    const opacity = 1 - progress
    const dashOffset = 14 * progress
    const bulletStyle = GUNS[trail.weaponId]?.bulletStyle ?? 'normal'
    const styleConfig = trailStyleForBullet(bulletStyle)

    ctx.save()
    ctx.globalAlpha = opacity
    ctx.lineCap = 'round'

    ctx.strokeStyle = styleConfig.primary
    ctx.lineWidth = styleConfig.width
    ctx.beginPath()
    ctx.moveTo(trail.fromX, trail.fromY)
    ctx.lineTo(trail.toX, trail.toY)
    ctx.stroke()

    ctx.strokeStyle = styleConfig.secondary
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.lineDashOffset = dashOffset
    ctx.beginPath()
    ctx.moveTo(trail.fromX, trail.fromY)
    ctx.lineTo(trail.toX, trail.toY)
    ctx.stroke()

    ctx.restore()
  }

  for (const key of toDelete) {
    trails.delete(key)
  }
}

export const pruneAndDrawShotProjectiles = (
  ctx: CanvasRenderingContext2D,
  projectiles: Map<string, ShotProjectile>,
  now: number
) => {
  const toDelete: string[] = []

  for (const [key, projectile] of projectiles.entries()) {
    const age = now - projectile.createdAt

    if (age > projectile.durationMs) {
      toDelete.push(key)
      continue
    }

    const progress =
      projectile.durationMs > 0
        ? Math.max(0, Math.min(1, age / projectile.durationMs))
        : 1
    const x = projectile.fromX + (projectile.toX - projectile.fromX) * progress
    const y = projectile.fromY + (projectile.toY - projectile.fromY) * progress
    const angle = Math.atan2(
      projectile.toY - projectile.fromY,
      projectile.toX - projectile.fromX
    )
    const profile = GUNS[projectile.weaponId]
    const bulletStyle = profile?.bulletStyle ?? 'normal'
    const bulletRadius = profile?.bulletRadius ?? 2.2
    const alpha = 1 - progress * 0.35

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.globalAlpha = alpha

    if (bulletStyle === 'sniper') {
      ctx.fillStyle = 'rgba(255, 246, 194, 0.98)'
      ctx.beginPath()
      ctx.ellipse(
        0,
        0,
        bulletRadius * 3.2,
        bulletRadius * 0.58,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    } else if (bulletStyle === 'pellet') {
      ctx.fillStyle = 'rgba(220, 255, 156, 0.95)'
      ctx.beginPath()
      ctx.arc(0, 0, bulletRadius, 0, Math.PI * 2)
      ctx.fill()
    } else if (bulletStyle === 'small') {
      ctx.fillStyle = 'rgba(173, 248, 115, 0.95)'
      ctx.beginPath()
      ctx.ellipse(
        0,
        0,
        bulletRadius * 1.15,
        bulletRadius * 0.75,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    } else if (bulletStyle === 'grenade') {
      ctx.fillStyle = 'rgba(255, 213, 89, 0.98)'
      ctx.beginPath()
      ctx.arc(0, 0, bulletRadius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(68, 47, 0, 0.95)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, bulletRadius * 0.62, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.fillStyle = 'rgba(217, 255, 129, 0.96)'
      ctx.beginPath()
      ctx.ellipse(
        0,
        0,
        bulletRadius * 1.8,
        bulletRadius * 0.84,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    ctx.restore()
  }

  for (const key of toDelete) {
    projectiles.delete(key)
  }
}

export const pruneAndDrawHitMarkers = (
  ctx: CanvasRenderingContext2D,
  markers: Map<string, HitMarker>,
  now: number
) => {
  const toDelete: string[] = []

  for (const [key, hitMarker] of markers.entries()) {
    const age = now - hitMarker.createdAt

    if (age > HIT_MARKER_MAX_AGE_MS) {
      toDelete.push(key)
      continue
    }

    const opacity = 1 - age / HIT_MARKER_MAX_AGE_MS
    const scale = 1 + (age / HIT_MARKER_MAX_AGE_MS) * 0.5

    ctx.save()
    ctx.globalAlpha = opacity

    const size = 10 + 8 * scale
    const ringRadius = 16 + 8 * scale

    ctx.strokeStyle = 'rgba(207, 247, 101, 0.95)'
    ctx.fillStyle = 'rgba(39, 44, 19, 0.85)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(hitMarker.x, hitMarker.y, ringRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = 'rgba(125, 145, 58, 0.85)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(hitMarker.x - size, hitMarker.y)
    ctx.lineTo(hitMarker.x - size + 6, hitMarker.y)
    ctx.moveTo(hitMarker.x + size, hitMarker.y)
    ctx.lineTo(hitMarker.x + size - 6, hitMarker.y)
    ctx.moveTo(hitMarker.x, hitMarker.y - size)
    ctx.lineTo(hitMarker.x, hitMarker.y - size + 6)
    ctx.moveTo(hitMarker.x, hitMarker.y + size)
    ctx.lineTo(hitMarker.x, hitMarker.y + size - 6)
    ctx.stroke()

    ctx.fillStyle = 'rgba(229, 255, 166, 0.98)'
    ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(`-${hitMarker.damage}`, hitMarker.x, hitMarker.y - 30)

    ctx.restore()
  }

  for (const key of toDelete) {
    markers.delete(key)
  }
}

export const pruneAndDrawSharedGrenades = (
  ctx: CanvasRenderingContext2D,
  grenades: Map<string, SharedGrenade>,
  explosions: Map<string, SharedExplosion>,
  now: number,
  bounds: { width: number; height: number },
  obstacles: MapObstacle[] = []
) => {
  const grenadesToDelete: string[] = []
  const explosionsToDelete: string[] = []

  for (const [key, grenade] of grenades.entries()) {
    const deltaSeconds = Math.max(0, (now - grenade.lastUpdatedAt) / 1000)

    if (deltaSeconds > 0) {
      advanceGrenadeState(grenade, deltaSeconds, bounds, obstacles)
      grenade.lastUpdatedAt = now
    }

    if (grenade.fuseRemainingMs <= 0) {
      grenadesToDelete.push(key)
      continue
    }

    const x = grenade.x
    const y = grenade.y
    const fuseRatio = Math.max(
      0,
      Math.min(1, grenade.fuseRemainingMs / Math.max(1, grenade.fuseMs))
    )
    const pulse = 0.45 + (1 - fuseRatio) * 0.55

    ctx.save()
    ctx.strokeStyle = 'rgba(255, 206, 92, 0.22)'
    ctx.globalAlpha = 0.16 * pulse
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, grenade.blastRadius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(255, 214, 102, 0.98)'
    ctx.beginPath()
    ctx.arc(x, y, grenade.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.beginPath()
    ctx.arc(
      x + grenade.radius * 0.2,
      y - grenade.radius * 0.2,
      grenade.radius * 0.35,
      0,
      Math.PI * 2
    )
    ctx.fill()
    ctx.restore()
  }

  for (const [key, explosion] of explosions.entries()) {
    const age = now - explosion.createdAt

    if (age > explosion.durationMs) {
      explosionsToDelete.push(key)
      continue
    }

    const life = Math.max(0, Math.min(1, age / explosion.durationMs))
    const radius = explosion.blastRadius * (0.3 + life * 0.9)

    ctx.save()
    ctx.globalAlpha = 0.35 * (1 - life)
    ctx.fillStyle = 'rgba(255, 176, 77, 0.9)'
    ctx.beginPath()
    ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 0.5 * (1 - life)
    ctx.strokeStyle = 'rgba(255, 217, 102, 0.95)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(explosion.x, explosion.y, radius * 0.75, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  for (const key of grenadesToDelete) {
    grenades.delete(key)
  }

  for (const key of explosionsToDelete) {
    explosions.delete(key)
  }
}

const barOpacityFromDamageTime = (now: number, damageAt: number) => {
  const elapsed = now - damageAt
  return Math.max(
    0,
    1 - Math.max(0, elapsed - DAMAGE_BAR_SHOW_MS) / DAMAGE_BAR_FADE_MS
  )
}

export const drawRemoteHpShieldBars = (
  ctx: CanvasRenderingContext2D,
  players: Iterable<RuntimePlayerState>,
  now: number,
  lastRemoteDamageAt: number,
  maxHp = 100
) => {
  const barOpacity = barOpacityFromDamageTime(now, lastRemoteDamageAt)
  if (barOpacity <= 0) {
    return
  }

  const barWidth = 32
  const barHeight = 2.5

  for (const player of players) {
    const barX = player.x - barWidth / 2
    const barY = player.z - 55

    ctx.save()
    ctx.globalAlpha = barOpacity

    const shieldRatio = Math.min(1, (player.shield || 0) / 100)
    if (shieldRatio > 0) {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.9)'
      ctx.fillRect(barX, barY, barWidth * shieldRatio, barHeight)
    }

    const hpRatio = Math.max(0, player.hp / maxHp)
    ctx.fillStyle = 'rgba(101, 232, 79, 0.9)'
    ctx.fillRect(barX, barY + barHeight + 1, barWidth * hpRatio, barHeight)

    ctx.restore()
  }
}

export const drawLocalHpShieldBars = (
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  hp: number,
  shield: number,
  now: number,
  lastLocalDamageAt: number
) => {
  const barOpacity = barOpacityFromDamageTime(now, lastLocalDamageAt)
  if (barOpacity <= 0) {
    return
  }

  const barWidth = 32
  const barHeight = 2.5
  const barX = position.x - barWidth / 2
  const barY = position.y - 55

  ctx.save()
  ctx.globalAlpha = barOpacity

  const shieldRatio = Math.min(1, shield / 100)
  if (shieldRatio > 0) {
    ctx.fillStyle = 'rgba(100, 200, 255, 0.9)'
    ctx.fillRect(barX, barY, barWidth * shieldRatio, barHeight)
  }

  const hpRatio = Math.max(0, hp / 100)
  ctx.fillStyle = 'rgba(101, 232, 79, 0.9)'
  ctx.fillRect(barX, barY + barHeight + 1, barWidth * hpRatio, barHeight)

  ctx.restore()
}

export const drawRemotePlayerNames = (
  ctx: CanvasRenderingContext2D,
  players: Iterable<RuntimePlayerState>
) => {
  ctx.font = '12px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  for (const player of players) {
    ctx.fillText(player.playerName, player.x, player.z - 35)
  }
}
