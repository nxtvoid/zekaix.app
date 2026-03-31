import type { GamePickupKind } from './types'

const PICKUP_CATALOG: Record<
  GamePickupKind,
  {
    label: string
    value: number
    color: string
    glowColor: string
    shortLabel: string
  }
> = {
  ammo: {
    label: 'Ammo Crate',
    value: 1,
    color: '#D7FF77',
    glowColor: 'rgba(180, 255, 88, 0.25)',
    shortLabel: 'AMMO'
  },
  ability_charge: {
    label: 'Ability Charge',
    value: 1,
    color: '#73F0FF',
    glowColor: 'rgba(115, 240, 255, 0.24)',
    shortLabel: 'Q'
  },
  repair_kit: {
    label: 'Repair Kit',
    value: 35,
    color: '#FFB45C',
    glowColor: 'rgba(255, 180, 92, 0.24)',
    shortLabel: 'HP'
  }
}

const PICKUP_WEIGHT_TABLE: Array<{ kind: GamePickupKind; weight: number }> = [
  { kind: 'ammo', weight: 0.5 },
  { kind: 'repair_kit', weight: 0.3 },
  { kind: 'ability_charge', weight: 0.2 }
]

export { PICKUP_CATALOG, PICKUP_WEIGHT_TABLE }
