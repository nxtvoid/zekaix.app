import { GUNS, type TankGun } from '../guns'
import type { MapObstacle } from '../maps/types'
import type { TankBullet } from './types'

type BulletImpact = {
  id: number
  x: number
  y: number
  ageMs: number
  ttlMs: number
  radius: number
}

class TankBulletController {
  private bullets: TankBullet[] = []
  private impacts: BulletImpact[] = []
  private bulletSequence = 0

  getBullets() {
    return this.bullets
  }

  clear() {
    this.bullets = []
    this.impacts = []
  }

  spawnFromGun(
    position: { x: number; y: number },
    rotation: number,
    profile: { barrelLength: number; radius: number },
    gun: TankGun,
    maxBullets: number
  ) {
    const gunProfile = gun.getProfile()
    const spawnOffset = profile.barrelLength + profile.radius * 0.35
    const bulletAngles = gun.generateBulletAngles(rotation)

    for (const angle of bulletAngles) {
      const directionX = Math.cos(angle)
      const directionY = Math.sin(angle)

      const bullet: TankBullet = {
        id: ++this.bulletSequence,
        x: position.x + directionX * spawnOffset,
        y: position.y + directionY * spawnOffset,
        vx: directionX * gunProfile.bulletSpeed,
        vy: directionY * gunProfile.bulletSpeed,
        radius: gunProfile.bulletRadius,
        ageMs: 0,
        ttlMs: gunProfile.bulletLifeMs,
        gunId: gun.getId()
      }

      this.bullets.push(bullet)
    }

    if (this.bullets.length > maxBullets) {
      this.bullets.splice(0, this.bullets.length - maxBullets)
    }

    return {
      vx: Math.cos(rotation) * gunProfile.bulletSpeed,
      vy: Math.sin(rotation) * gunProfile.bulletSpeed
    }
  }

  update(
    deltaSeconds: number,
    width: number,
    height: number,
    obstacles: MapObstacle[] = []
  ) {
    const margin = 24
    const deltaMs = deltaSeconds * 1000

    this.impacts = this.impacts.filter((impact) => {
      impact.ageMs += deltaMs

      return impact.ageMs <= impact.ttlMs
    })

    this.bullets = this.bullets.filter((bullet) => {
      bullet.x += bullet.vx * deltaSeconds
      bullet.y += bullet.vy * deltaSeconds
      bullet.ageMs += deltaMs

      const isAliveByTime = bullet.ageMs <= bullet.ttlMs
      const isInsideBounds =
        bullet.x >= -margin &&
        bullet.x <= width + margin &&
        bullet.y >= -margin &&
        bullet.y <= height + margin
      const collidesWithObstacle = obstacles.some((obstacle) => {
        if (obstacle.kind === 'circle') {
          const dx = bullet.x - obstacle.x
          const dy = bullet.y - obstacle.y

          return dx * dx + dy * dy <= (obstacle.radius + bullet.radius) ** 2
        }

        const nearestX = Math.max(
          obstacle.x,
          Math.min(bullet.x, obstacle.x + obstacle.width)
        )
        const nearestY = Math.max(
          obstacle.y,
          Math.min(bullet.y, obstacle.y + obstacle.height)
        )
        const dx = bullet.x - nearestX
        const dy = bullet.y - nearestY

        return dx * dx + dy * dy <= bullet.radius * bullet.radius
      })

      if (collidesWithObstacle) {
        this.impacts.push({
          id: ++this.bulletSequence,
          x: bullet.x,
          y: bullet.y,
          ageMs: 0,
          ttlMs: 180,
          radius: Math.max(5, bullet.radius * 3.2)
        })
      }

      return isAliveByTime && isInsideBounds && !collidesWithObstacle
    })
  }

  draw(context: CanvasRenderingContext2D, accentColor: string) {
    for (const impact of this.impacts) {
      const progress = impact.ageMs / impact.ttlMs
      const alpha = Math.max(0, 1 - progress)
      const ringRadius = impact.radius * (0.5 + progress * 1.2)

      context.save()
      context.globalCompositeOperation = 'lighter'

      const glow = context.createRadialGradient(
        impact.x,
        impact.y,
        ringRadius * 0.15,
        impact.x,
        impact.y,
        ringRadius * 1.6
      )
      glow.addColorStop(0, `rgba(255,245,210,${alpha * 0.95})`)
      glow.addColorStop(0.45, `rgba(255,200,130,${alpha * 0.45})`)
      glow.addColorStop(1, 'rgba(255,180,90,0)')

      context.fillStyle = glow
      context.beginPath()
      context.arc(impact.x, impact.y, ringRadius * 1.6, 0, Math.PI * 2)
      context.fill()

      context.strokeStyle = `rgba(255,240,205,${alpha * 0.85})`
      context.lineWidth = 1.3
      context.beginPath()
      context.arc(impact.x, impact.y, ringRadius, 0, Math.PI * 2)
      context.stroke()

      context.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`
      context.lineWidth = 1

      for (let i = 0; i < 5; i += 1) {
        const angle = ((impact.id + i * 17) % 360) * (Math.PI / 180)
        const sparkLength = ringRadius * (0.7 + i * 0.15)

        context.beginPath()
        context.moveTo(impact.x, impact.y)
        context.lineTo(
          impact.x + Math.cos(angle) * sparkLength,
          impact.y + Math.sin(angle) * sparkLength
        )
        context.stroke()
      }

      context.restore()
    }

    for (const bullet of this.bullets) {
      const style = GUNS[bullet.gunId]?.bulletStyle ?? 'normal'
      const angle = Math.atan2(bullet.vy, bullet.vx)

      context.save()
      context.translate(bullet.x, bullet.y)
      context.rotate(angle)
      context.fillStyle = accentColor
      context.strokeStyle = accentColor

      if (style === 'sniper') {
        context.beginPath()
        context.ellipse(
          0,
          0,
          bullet.radius * 3.2,
          bullet.radius * 0.55,
          0,
          0,
          Math.PI * 2
        )
        context.fill()
      } else if (style === 'pellet') {
        context.beginPath()
        context.arc(0, 0, bullet.radius, 0, Math.PI * 2)
        context.fill()
      } else if (style === 'small') {
        context.beginPath()
        context.ellipse(
          0,
          0,
          bullet.radius * 1.1,
          bullet.radius * 0.72,
          0,
          0,
          Math.PI * 2
        )
        context.fill()
      } else if (style === 'grenade') {
        context.beginPath()
        context.arc(0, 0, bullet.radius, 0, Math.PI * 2)
        context.fill()

        context.lineWidth = 1.1
        context.beginPath()
        context.arc(0, 0, bullet.radius * 0.6, 0, Math.PI * 2)
        context.stroke()
      } else {
        context.beginPath()
        context.ellipse(
          0,
          0,
          bullet.radius * 1.75,
          bullet.radius * 0.82,
          0,
          0,
          Math.PI * 2
        )
        context.fill()
      }

      context.restore()
    }
  }
}

export { TankBulletController }
