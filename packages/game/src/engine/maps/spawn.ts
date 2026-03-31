import type { GameMapDefinition, MapObstacle } from './types'

type SpawnCandidate = {
  x: number
  y: number
}

type SpawnOptions = {
  padding?: number
  radius?: number
  attempts?: number
  avoidPoints?: Array<{ x: number; y: number; radius?: number }>
}

const collidesWithObstacle = (
  point: SpawnCandidate,
  radius: number,
  obstacle: MapObstacle
) => {
  if (obstacle.kind === 'circle') {
    const dx = point.x - obstacle.x
    const dy = point.y - obstacle.y

    return dx * dx + dy * dy < (obstacle.radius + radius) ** 2
  }

  const nearestX = Math.max(
    obstacle.x,
    Math.min(point.x, obstacle.x + obstacle.width)
  )
  const nearestY = Math.max(
    obstacle.y,
    Math.min(point.y, obstacle.y + obstacle.height)
  )
  const dx = point.x - nearestX
  const dy = point.y - nearestY

  return dx * dx + dy * dy < radius * radius
}

const isSpawnCandidateOpen = (
  map: GameMapDefinition,
  point: SpawnCandidate,
  radius: number,
  avoidPoints: NonNullable<SpawnOptions['avoidPoints']>
) => {
  for (const obstacle of map.obstacles) {
    if (collidesWithObstacle(point, radius, obstacle)) {
      return false
    }
  }

  for (const avoidPoint of avoidPoints) {
    const dx = point.x - avoidPoint.x
    const dy = point.y - avoidPoint.y
    const minDistance = (avoidPoint.radius ?? radius * 3) + radius

    if (dx * dx + dy * dy < minDistance * minDistance) {
      return false
    }
  }

  return true
}

const getRandomMapSpawn = (
  map: GameMapDefinition,
  options: SpawnOptions = {}
) => {
  const padding = options.padding ?? 140
  const radius = options.radius ?? 34
  const attempts = options.attempts ?? 80
  const avoidPoints = options.avoidPoints ?? []

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = {
      x: padding + Math.random() * Math.max(1, map.width - padding * 2),
      y: padding + Math.random() * Math.max(1, map.height - padding * 2)
    }

    if (isSpawnCandidateOpen(map, candidate, radius, avoidPoints)) {
      return candidate
    }
  }

  const spawnPoints = [...map.spawnPoints]

  for (let index = spawnPoints.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = spawnPoints[index]
    const swap = spawnPoints[swapIndex]

    if (!current || !swap) {
      continue
    }

    spawnPoints[index] = swap
    spawnPoints[swapIndex] = current
  }

  for (const spawnPoint of spawnPoints) {
    const candidate = { x: spawnPoint.x, y: spawnPoint.y }

    if (isSpawnCandidateOpen(map, candidate, radius, avoidPoints)) {
      return candidate
    }
  }

  const fallback = map.spawnPoints[0]

  return {
    x: fallback?.x ?? map.width / 2,
    y: fallback?.y ?? map.height / 2
  }
}

const findMapObstacleOverlaps = (map: GameMapDefinition) => {
  const overlaps: Array<{ firstIndex: number; secondIndex: number }> = []

  for (let firstIndex = 0; firstIndex < map.obstacles.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < map.obstacles.length;
      secondIndex += 1
    ) {
      const first = map.obstacles[firstIndex]
      const second = map.obstacles[secondIndex]

      if (!first || !second) {
        continue
      }

      const overlapsAtCenter =
        collidesWithObstacle(
          {
            x:
              second.kind === 'circle' ? second.x : second.x + second.width / 2,
            y:
              second.kind === 'circle' ? second.y : second.y + second.height / 2
          },
          second.kind === 'circle'
            ? second.radius
            : Math.max(second.width, second.height) * 0.5,
          first
        ) ||
        collidesWithObstacle(
          {
            x: first.kind === 'circle' ? first.x : first.x + first.width / 2,
            y: first.kind === 'circle' ? first.y : first.y + first.height / 2
          },
          first.kind === 'circle'
            ? first.radius
            : Math.max(first.width, first.height) * 0.5,
          second
        )

      if (overlapsAtCenter) {
        overlaps.push({ firstIndex, secondIndex })
      }
    }
  }

  return overlaps
}

export { findMapObstacleOverlaps, getRandomMapSpawn }
