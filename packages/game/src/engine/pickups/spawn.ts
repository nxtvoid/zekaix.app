import { SINGLE_MAP_DEFINITION } from '../maps/map'
import type { MapObstacle } from '../maps/types'

const PICKUP_CLEARANCE_RADIUS = 64

const PICKUP_SPAWN_POINTS = [
  { id: 'top_far_left', x: 560, z: 900 },
  { id: 'top_mid_left', x: 1480, z: 980 },
  { id: 'top_center', x: 2580, z: 980 },
  { id: 'top_mid_right', x: 3480, z: 980 },
  { id: 'top_far_right', x: 4640, z: 900 },
  { id: 'upper_left_lane', x: 980, z: 1820 },
  { id: 'upper_mid_left', x: 1520, z: 1500 },
  { id: 'mid_left', x: 1880, z: 1800 },
  { id: 'center_core', x: 2580, z: 1780 },
  { id: 'mid_right', x: 3080, z: 1800 },
  { id: 'upper_mid_right', x: 3640, z: 1500 },
  { id: 'upper_right_lane', x: 4220, z: 1820 },
  { id: 'center_low_left', x: 2060, z: 2360 },
  { id: 'center_low', x: 2580, z: 2360 },
  { id: 'center_low_right', x: 3120, z: 2360 },
  { id: 'south_left', x: 1560, z: 3260 },
  { id: 'south_center_left', x: 2200, z: 3160 },
  { id: 'south_center', x: 2600, z: 3260 },
  { id: 'south_center_right', x: 3000, z: 3160 },
  { id: 'south_right', x: 3640, z: 3260 }
] as const

const collidesWithObstacle = (
  x: number,
  z: number,
  radius: number,
  obstacle: MapObstacle
) => {
  if (obstacle.kind === 'circle') {
    const dx = x - obstacle.x
    const dz = z - obstacle.y

    return dx * dx + dz * dz < (obstacle.radius + radius) ** 2
  }

  const nearestX = Math.max(
    obstacle.x,
    Math.min(x, obstacle.x + obstacle.width)
  )
  const nearestZ = Math.max(
    obstacle.y,
    Math.min(z, obstacle.y + obstacle.height)
  )
  const dx = x - nearestX
  const dz = z - nearestZ

  return dx * dx + dz * dz < radius * radius
}

const isPickupSpawnPointOpen = (x: number, z: number) =>
  !SINGLE_MAP_DEFINITION.obstacles.some((obstacle) =>
    collidesWithObstacle(x, z, PICKUP_CLEARANCE_RADIUS, obstacle)
  )

const VALID_PICKUP_SPAWN_POINTS = PICKUP_SPAWN_POINTS.filter((point) =>
  isPickupSpawnPointOpen(point.x, point.z)
)

const pickRandomSpawnPoint = (
  occupiedKeys: Iterable<string>,
  recentPoints: Iterable<string> = []
) => {
  const occupied = new Set(occupiedKeys)
  const recent = new Set(recentPoints)
  const preferred = VALID_PICKUP_SPAWN_POINTS.filter(
    (point) => !occupied.has(point.id) && !recent.has(point.id)
  )
  const fallback = VALID_PICKUP_SPAWN_POINTS.filter(
    (point) => !occupied.has(point.id)
  )
  const pool = preferred.length > 0 ? preferred : fallback

  if (pool.length === 0) {
    return null
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

export { PICKUP_SPAWN_POINTS, pickRandomSpawnPoint }
