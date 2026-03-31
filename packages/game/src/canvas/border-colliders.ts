import type { MapObstacle } from '../engine/maps/types'

export const createBorderColliders = (
  width: number,
  height: number,
  thickness: number
): MapObstacle[] => {
  return [
    { kind: 'rect', x: 0, y: 0, width, height: thickness },
    { kind: 'rect', x: 0, y: height - thickness, width, height: thickness },
    { kind: 'rect', x: 0, y: 0, width: thickness, height },
    { kind: 'rect', x: width - thickness, y: 0, width: thickness, height }
  ]
}
