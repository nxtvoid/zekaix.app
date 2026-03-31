import type { GameMapDefinition, MapObstacle } from './types'

const createGridSpawns = (
  prefix: string,
  columns: number,
  rows: number,
  startX: number,
  startY: number,
  stepX: number,
  stepY: number
) => {
  const spawns: GameMapDefinition['spawnPoints'] = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      spawns.push({
        id: `${prefix}_${row}_${column}`,
        x: startX + column * stepX,
        y: startY + row * stepY
      })
    }
  }

  return spawns
}

const rect = (
  x: number,
  y: number,
  width: number,
  height: number
): MapObstacle => ({
  kind: 'rect',
  x,
  y,
  width,
  height
})

const cover = (
  x: number,
  y: number,
  width: number,
  height: number
): MapObstacle => ({
  kind: 'cover_box',
  x,
  y,
  width,
  height
})

const circle = (x: number, y: number, radius: number): MapObstacle => ({
  kind: 'circle',
  x,
  y,
  radius
})

const createCoverRow = (
  startX: number,
  y: number,
  count: number,
  width: number,
  height: number,
  gap: number
) => {
  const obstacles: MapObstacle[] = []

  for (let index = 0; index < count; index += 1) {
    obstacles.push(cover(startX + index * (width + gap), y, width, height))
  }

  return obstacles
}

const createCoverColumn = (
  x: number,
  startY: number,
  count: number,
  width: number,
  height: number,
  gap: number
) => {
  const obstacles: MapObstacle[] = []

  for (let index = 0; index < count; index += 1) {
    obstacles.push(cover(x, startY + index * (height + gap), width, height))
  }

  return obstacles
}

const TOP_LANE: MapObstacle[] = [
  rect(680, 520, 440, 240),
  rect(1680, 520, 520, 240),
  rect(3000, 520, 520, 240),
  rect(4080, 520, 440, 240),
  ...createCoverRow(760, 920, 4, 120, 120, 120),
  ...createCoverRow(3160, 920, 4, 120, 120, 120)
]

const MID_LANE: MapObstacle[] = [
  rect(1080, 1360, 360, 280),
  rect(2220, 1460, 360, 280),
  rect(3380, 1360, 360, 280),
  rect(4300, 1460, 320, 240),
  ...createCoverColumn(1760, 1280, 3, 120, 120, 120),
  ...createCoverColumn(2780, 1280, 3, 120, 120, 120),
  ...createCoverRow(1460, 1900, 3, 140, 120, 140),
  ...createCoverRow(3180, 1900, 3, 140, 120, 140)
]

const FLANKS: MapObstacle[] = [
  ...createCoverColumn(640, 1200, 4, 120, 120, 160),
  ...createCoverColumn(4760, 1200, 4, 120, 120, 160),
  rect(760, 2140, 280, 200),
  rect(4160, 2140, 280, 200)
]

const SOUTH_LANE: MapObstacle[] = [
  rect(760, 2480, 440, 240),
  rect(2100, 2520, 480, 240),
  rect(3540, 2480, 440, 240),
  circle(1680, 3080, 180),
  circle(2600, 3000, 200),
  circle(3720, 3080, 180),
  ...createCoverRow(920, 3320, 3, 120, 120, 160),
  ...createCoverRow(3000, 3320, 3, 120, 120, 160)
]

const CENTERPIECE: MapObstacle[] = [
  rect(2380, 1080, 400, 160),
  cover(2300, 1840, 160, 120),
  cover(2920, 1840, 160, 120),
  cover(2500, 2060, 160, 120)
]

const SINGLE_MAP_DEFINITION: GameMapDefinition = {
  key: 'battleground_25',
  label: 'Battleground 25',
  width: 5200,
  height: 3600,
  backgroundColor: '#0A0F14',
  gridColor: 'rgba(255,255,255,0.035)',
  obstacles: [
    ...TOP_LANE,
    ...MID_LANE,
    ...FLANKS,
    ...SOUTH_LANE,
    ...CENTERPIECE
  ],
  spawnPoints: createGridSpawns('bg25', 5, 5, 520, 420, 1040, 690)
}

export { SINGLE_MAP_DEFINITION }
