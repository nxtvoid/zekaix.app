import { GUNS } from '../engine/guns'
import {
  ACTIVE_ABILITIES,
  DEFAULT_ACTIVE_ABILITY,
  DEFAULT_PASSIVE_ABILITY,
  PASSIVE_ABILITIES
} from '../engine/abilities/catalog'
import type {
  ActiveAbilityId,
  PassiveAbilityId
} from '../engine/abilities/types'

type LoadoutWeaponId = 'pistol' | 'smg' | 'ak47' | 'shotgun' | 'sniper'

type GameLoadout = {
  weaponId: LoadoutWeaponId
  activeAbilityId: ActiveAbilityId
  passiveAbilityId: PassiveAbilityId
}

const LOADOUT_WEAPON_IDS: LoadoutWeaponId[] = [
  'pistol',
  'smg',
  'ak47',
  'shotgun',
  'sniper'
]

const LOADOUT_WEAPONS = LOADOUT_WEAPON_IDS.map((weaponId) => {
  const weapon = GUNS[weaponId]

  if (!weapon) {
    throw new Error(`Missing loadout weapon config: ${weaponId}`)
  }

  return {
    id: weapon.id as LoadoutWeaponId,
    label: weapon.label,
    description: `${weapon.damage} dmg · ${weapon.magazineSize} mag · ${weapon.bulletStyle}`,
    bulletStyle: weapon.bulletStyle,
    damage: weapon.damage,
    magazineSize: weapon.magazineSize
  }
})

const LOADOUT_ACTIVE_ABILITIES = Object.values(ACTIVE_ABILITIES).map(
  (ability) => ({
    id: ability.id,
    label: ability.label,
    description: ability.description
  })
)

const LOADOUT_PASSIVE_ABILITIES = Object.values(PASSIVE_ABILITIES).map(
  (ability) => ({
    id: ability.id,
    label: ability.label,
    description: ability.description
  })
)

const DEFAULT_GAME_LOADOUT: GameLoadout = {
  weaponId: 'pistol',
  activeAbilityId: DEFAULT_ACTIVE_ABILITY,
  passiveAbilityId: DEFAULT_PASSIVE_ABILITY
}

export {
  DEFAULT_GAME_LOADOUT,
  LOADOUT_ACTIVE_ABILITIES,
  LOADOUT_PASSIVE_ABILITIES,
  LOADOUT_WEAPONS
}
export type { GameLoadout, LoadoutWeaponId }
