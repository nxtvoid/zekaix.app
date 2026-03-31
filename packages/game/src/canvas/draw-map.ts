import type { GameMapDefinition } from '../engine/maps/types'

export const drawMap = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  map: GameMapDefinition
) => {
  const tileSize = 48
  const floorA = '#0f0f0d'
  const floorB = '#0d0d0b'

  const wallBase = '#161614'
  const wallInner = '#1a1a17'
  const wallEdgeShadow = '#0d0d0b'

  context.fillStyle = floorB
  context.fillRect(0, 0, width, height)

  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      const isA = ((x / tileSize + y / tileSize) & 1) === 0

      context.fillStyle = isA ? floorA : floorB
      context.fillRect(x, y, tileSize, tileSize)
    }
  }

  context.fillStyle = wallBase
  for (let x = 0; x < width; x += tileSize) {
    context.fillRect(x, 0, tileSize, tileSize)
    context.fillRect(x, height - tileSize, tileSize, tileSize)
  }

  for (let y = tileSize; y < height - tileSize; y += tileSize) {
    context.fillRect(0, y, tileSize, tileSize)
    context.fillRect(width - tileSize, y, tileSize, tileSize)
  }

  context.fillStyle = wallInner
  context.fillRect(1, 1, width - 2, tileSize - 2)
  context.fillRect(1, height - tileSize + 1, width - 2, tileSize - 2)
  context.fillRect(1, tileSize + 1, tileSize - 2, height - tileSize * 2 - 2)
  context.fillRect(
    width - tileSize + 1,
    tileSize + 1,
    tileSize - 2,
    height - tileSize * 2 - 2
  )

  context.strokeStyle = wallEdgeShadow
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0.5, 0.5)
  context.lineTo(width - 0.5, 0.5)
  context.stroke()
  context.beginPath()
  context.moveTo(0.5, 0.5)
  context.lineTo(0.5, height - 0.5)
  context.stroke()

  for (const obstacle of map.obstacles) {
    if (obstacle.kind === 'rect') {
      context.fillStyle = floorA
      context.fillRect(
        obstacle.x - 1,
        obstacle.y - 1,
        obstacle.width + 2,
        obstacle.height + 2
      )

      context.fillStyle = '#1a1d0e'
      context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)

      context.fillStyle = '#1e2210'
      context.fillRect(
        obstacle.x + 3,
        obstacle.y + 3,
        Math.max(0, obstacle.width - 6),
        Math.max(0, obstacle.height - 6)
      )

      context.strokeStyle = '#252a12'
      context.lineWidth = 0.5
      context.strokeRect(
        obstacle.x + 0.5,
        obstacle.y + 0.5,
        Math.max(0, obstacle.width - 1),
        Math.max(0, obstacle.height - 1)
      )

      context.strokeStyle = 'rgba(50, 56, 24, 0.75)'
      context.lineWidth = 0.5
      const hatchStep = 10

      for (
        let x = obstacle.x + 5;
        x < obstacle.x + obstacle.width - 5;
        x += hatchStep
      ) {
        context.beginPath()
        context.moveTo(x, obstacle.y + 4)
        context.lineTo(x, obstacle.y + obstacle.height - 4)
        context.stroke()
      }

      for (
        let y = obstacle.y + 5;
        y < obstacle.y + obstacle.height - 5;
        y += hatchStep
      ) {
        context.beginPath()
        context.moveTo(obstacle.x + 4, y)
        context.lineTo(obstacle.x + obstacle.width - 4, y)
        context.stroke()
      }

      continue
    }

    if (obstacle.kind === 'cover_box') {
      context.fillStyle = floorA
      context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)

      context.fillStyle = '#1a1d0e'
      context.fillRect(
        obstacle.x + 3,
        obstacle.y + 3,
        Math.max(0, obstacle.width - 6),
        Math.max(0, obstacle.height - 6)
      )

      context.strokeStyle = '#252a12'
      context.lineWidth = 0.5
      context.strokeRect(
        obstacle.x + 3.5,
        obstacle.y + 3.5,
        Math.max(0, obstacle.width - 7),
        Math.max(0, obstacle.height - 7)
      )

      context.fillStyle = '#1e2210'
      context.fillRect(
        obstacle.x + 7,
        obstacle.y + 7,
        Math.max(0, obstacle.width - 14),
        Math.max(0, obstacle.height - 14)
      )

      context.strokeStyle = '#252a12'
      context.lineWidth = 0.5
      const innerLeft = obstacle.x + 7
      const innerTop = obstacle.y + 7
      const innerRight = obstacle.x + obstacle.width - 7
      const innerBottom = obstacle.y + obstacle.height - 7

      context.beginPath()
      context.moveTo(innerLeft, innerTop)
      context.lineTo(innerRight, innerBottom)
      context.stroke()

      context.beginPath()
      context.moveTo(innerRight, innerTop)
      context.lineTo(innerLeft, innerBottom)
      context.stroke()

      continue
    }

    context.fillStyle = '#1a1d0e'
    context.beginPath()
    context.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = '#1e2210'
    context.beginPath()
    context.arc(obstacle.x, obstacle.y, obstacle.radius * 0.75, 0, Math.PI * 2)
    context.fill()

    context.strokeStyle = '#252a12'
    context.lineWidth = 0.5
    context.beginPath()
    context.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2)
    context.stroke()
  }
}
