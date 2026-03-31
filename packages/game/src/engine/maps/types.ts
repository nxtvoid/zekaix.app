type MapObstacleRect = {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
}

type MapObstacleCircle = {
  kind: 'circle'
  x: number
  y: number
  radius: number
}

type MapObstacleCoverBox = {
  kind: 'cover_box'
  x: number
  y: number
  width: number
  height: number
}

type MapObstacle = MapObstacleRect | MapObstacleCircle | MapObstacleCoverBox

type MapSpawnPoint = {
  id: string
  x: number
  y: number
}

type GameMapDefinition = {
  key: string
  label: string
  width: number
  height: number
  backgroundColor: string
  gridColor: string
  obstacles: MapObstacle[]
  spawnPoints: MapSpawnPoint[]
}

export type {
  MapObstacleRect,
  MapObstacleCircle,
  MapObstacle,
  MapSpawnPoint,
  GameMapDefinition
}
