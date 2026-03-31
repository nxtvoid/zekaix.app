'use client'

import { cn } from '@zekaix/utils/cn'
import { useEffect, useRef } from 'react'

interface Ship {
  x: number
  y: number
  angle: number
  tx: number
  ty: number
  speed: number
  timer: number
  shootTimer: number
  burstCount: number
  burstTimer: number
}

interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

type BgGameCanvasProps = React.CanvasHTMLAttributes<HTMLCanvasElement> & {
  className?: string
  quantity?: number
}

const getAccentColor = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue('--foreground')
    .trim()

const BgGameCanvas = ({
  className,
  quantity = 8,
  ...props
}: BgGameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = window.innerWidth
    let H = window.innerHeight
    let color = getAccentColor()

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
    }

    resize()
    window.addEventListener('resize', resize)

    const observer = new MutationObserver(() => {
      color = getAccentColor()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    })

    const randomTarget = () => ({
      tx: 40 + Math.random() * (W - 80),
      ty: 40 + Math.random() * (H - 80)
    })

    const ships: Ship[] = Array.from({ length: quantity }, () => {
      const { tx, ty } = randomTarget()
      return {
        x: 40 + Math.random() * (W - 80),
        y: 40 + Math.random() * (H - 80),
        angle: Math.random() * Math.PI * 2,
        tx,
        ty,
        speed: 0.8 + Math.random() * 0.6,
        timer: 0,
        shootTimer: 2 + Math.random() * 3,
        burstCount: 0,
        burstTimer: 0
      }
    })

    const bullets: Bullet[] = []

    let last = 0
    let rafId: number

    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 1000, 0.05)
      last = ts

      ctx.clearRect(0, 0, W, H)

      for (const s of ships) {
        s.timer -= dt
        if (s.timer <= 0) {
          s.timer = 1.5 + Math.random() * 2.5
          const t = randomTarget()
          s.tx = t.tx
          s.ty = t.ty
        }

        if (s.burstCount > 0) {
          s.burstTimer -= dt
          if (s.burstTimer <= 0) {
            s.burstTimer = 0.1 + s.burstTimer
            s.burstCount--
            const bulletSpeed = 260
            bullets.push({
              x: s.x + Math.cos(s.angle) * 12,
              y: s.y + Math.sin(s.angle) * 12,
              vx: Math.cos(s.angle) * bulletSpeed,
              vy: Math.sin(s.angle) * bulletSpeed,
              life: 1.2
            })
          }
        } else {
          s.shootTimer -= dt
          if (s.shootTimer <= 0) {
            s.shootTimer = 2 + Math.random() * 4
            const burst = Math.ceil(Math.random() * 3)
            s.burstCount = burst - 1
            s.burstTimer = 0.1
            const bulletSpeed = 260
            bullets.push({
              x: s.x + Math.cos(s.angle) * 12,
              y: s.y + Math.sin(s.angle) * 12,
              vx: Math.cos(s.angle) * bulletSpeed,
              vy: Math.sin(s.angle) * bulletSpeed,
              life: 1.2
            })
          }
        }

        const ddx = s.tx - s.x
        const ddy = s.ty - s.y
        const d = Math.sqrt(ddx * ddx + ddy * ddy)

        if (d > 2) {
          s.angle = Math.atan2(ddy, ddx)
          s.x += (ddx / d) * s.speed
          s.y += (ddy / d) * s.speed
        }

        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.angle)

        ctx.beginPath()
        ctx.arc(0, 0, 8, 0, Math.PI * 2)
        ctx.globalAlpha = 0.55
        ctx.fillStyle = color
        ctx.fill()

        ctx.globalAlpha = 0.3
        ctx.fillStyle = color
        ctx.fillRect(5, -2, 14, 4)

        ctx.restore()
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]!
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.life -= dt

        if (
          b.life <= 0 ||
          b.x < -20 ||
          b.x > W + 20 ||
          b.y < -20 ||
          b.y > H + 20
        ) {
          bullets.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.globalAlpha = Math.min(b.life, 0.8)
        ctx.translate(b.x, b.y)
        ctx.rotate(Math.atan2(b.vy, b.vx))
        ctx.fillStyle = color
        ctx.fillRect(-4, -0.8, 8, 1.6)
        ctx.restore()
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame((ts) => {
      last = ts
      rafId = requestAnimationFrame(loop)
    })

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [quantity])

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none fixed inset-0 z-0', className)}
      {...props}
    />
  )
}

export { BgGameCanvas }
