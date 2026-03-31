import { TANK_PROFILE } from '../constants'

export const drawRemoteTank = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  yaw: number
) => {
  const profile = TANK_PROFILE

  context.save()
  context.translate(x, y)
  context.rotate(yaw)

  context.fillStyle = 'rgba(0, 0, 0, 0.28)'
  context.beginPath()
  context.roundRect(
    -profile.radius * 1.38,
    -profile.radius * 1.06,
    profile.radius * 2.76,
    profile.radius * 2.12,
    profile.radius * 0.72
  )
  context.fill()

  context.fillStyle = TANK_PROFILE.treadColor
  context.beginPath()
  context.roundRect(
    -profile.radius * 1.32,
    -profile.radius * 1.02,
    profile.radius * 0.62,
    profile.radius * 2.04,
    profile.radius * 0.42
  )
  context.fill()
  context.beginPath()
  context.roundRect(
    profile.radius * 0.7,
    -profile.radius * 1.02,
    profile.radius * 0.62,
    profile.radius * 2.04,
    profile.radius * 0.42
  )
  context.fill()

  context.strokeStyle = TANK_PROFILE.accentColor
  context.lineCap = 'round'
  context.lineWidth = profile.barrelWidth
  context.beginPath()
  context.moveTo(profile.radius * 0.28, 0)
  context.lineTo(profile.barrelLength, 0)
  context.stroke()

  context.fillStyle = TANK_PROFILE.bodyShadowColor
  context.beginPath()
  context.roundRect(
    -profile.radius * 0.96,
    -profile.radius * 0.8,
    profile.radius * 1.92,
    profile.radius * 1.6,
    profile.radius * 0.48
  )
  context.fill()

  context.fillStyle = TANK_PROFILE.bodyColor
  context.beginPath()
  context.roundRect(
    -profile.radius * 0.9,
    -profile.radius * 0.74,
    profile.radius * 1.8,
    profile.radius * 1.48,
    profile.radius * 0.44
  )
  context.fill()

  context.strokeStyle = TANK_PROFILE.trimColor
  context.lineWidth = 1.4
  context.beginPath()
  context.roundRect(
    -profile.radius * 0.9,
    -profile.radius * 0.74,
    profile.radius * 1.8,
    profile.radius * 1.48,
    profile.radius * 0.44
  )
  context.stroke()

  context.fillStyle = TANK_PROFILE.trimColor
  context.beginPath()
  context.arc(0, 0, profile.radius * 0.58, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = TANK_PROFILE.bodyShadowColor
  context.beginPath()
  context.arc(0, 0, profile.radius * 0.42, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = TANK_PROFILE.accentColor
  context.beginPath()
  context.arc(0, 0, profile.radius * 0.18, 0, Math.PI * 2)
  context.fill()

  context.restore()
}
