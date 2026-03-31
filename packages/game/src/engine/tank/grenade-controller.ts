import type { MapObstacle } from '../maps/types'
import { advanceGrenadeState } from './grenade-physics'
import type { TankGrenade } from './types'

type TankExplosion = {
  x: number
  y: number
  radius: number
  ageMs: number
  ttlMs: number
}

class TankGrenadeController {
  private grenades: TankGrenade[] = []
  private explosions: TankExplosion[] = []
  private sequence = 0

  throwGrenade(grenade: TankGrenade) {
    this.grenades.push({
      ...grenade,
      id: grenade.id || ++this.sequence
    })
  }

  getGrenades() {
    return this.grenades
  }

  update(
    deltaSeconds: number,
    bounds: { width: number; height: number },
    obstacles: MapObstacle[] = [],
    targets: Array<{ id: string; x: number; y: number }>,
    onExplosionDamage: (targetId: string, damage: number) => void
  ) {
    this.grenades = this.grenades.filter((grenade) => {
      advanceGrenadeState(grenade, deltaSeconds, bounds, obstacles)

      if (grenade.fuseRemainingMs > 0) {
        return true
      }

      this.explosions.push({
        x: grenade.x,
        y: grenade.y,
        radius: grenade.blastRadius,
        ageMs: 0,
        ttlMs: 260
      })

      for (const target of targets) {
        const dx = target.x - grenade.x
        const dy = target.y - grenade.y
        const distance = Math.hypot(dx, dy)

        if (distance <= grenade.blastRadius) {
          const falloff = 1 - distance / grenade.blastRadius
          const damage = Math.max(0, grenade.maxDamage * falloff)

          if (damage > 0) {
            onExplosionDamage(target.id, damage)
          }
        }
      }

      return false
    })

    this.explosions = this.explosions.filter((explosion) => {
      explosion.ageMs += deltaSeconds * 1000
      return explosion.ageMs <= explosion.ttlMs
    })
  }

  draw(context: CanvasRenderingContext2D, accentColor: string) {
    for (const grenade of this.grenades) {
      const fuseRatio = Math.max(
        0,
        Math.min(1, grenade.fuseRemainingMs / grenade.baseFuseMs)
      )
      const pulse = 0.4 + (1 - fuseRatio) * 0.6

      context.strokeStyle = accentColor
      context.globalAlpha = 0.18 * pulse
      context.lineWidth = 1.5
      context.beginPath()
      context.arc(grenade.x, grenade.y, grenade.blastRadius, 0, Math.PI * 2)
      context.stroke()

      context.globalAlpha = 1
      context.fillStyle = accentColor
      context.beginPath()
      context.arc(grenade.x, grenade.y, grenade.radius, 0, Math.PI * 2)
      context.fill()

      context.fillStyle = 'rgba(255,255,255,0.4)'
      context.beginPath()
      context.arc(
        grenade.x + grenade.radius * 0.2,
        grenade.y - grenade.radius * 0.2,
        grenade.radius * 0.35,
        0,
        Math.PI * 2
      )
      context.fill()
    }

    for (const explosion of this.explosions) {
      const life = Math.max(0, Math.min(1, explosion.ageMs / explosion.ttlMs))
      const radius = explosion.radius * (0.3 + life * 0.9)

      context.globalAlpha = 0.35 * (1 - life)
      context.fillStyle = 'rgba(255, 176, 77, 0.9)'
      context.beginPath()
      context.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2)
      context.fill()

      context.globalAlpha = 0.5 * (1 - life)
      context.strokeStyle = 'rgba(255, 217, 102, 0.95)'
      context.lineWidth = 2
      context.beginPath()
      context.arc(explosion.x, explosion.y, radius * 0.75, 0, Math.PI * 2)
      context.stroke()
      context.globalAlpha = 1
    }
  }
}

export { TankGrenadeController }
