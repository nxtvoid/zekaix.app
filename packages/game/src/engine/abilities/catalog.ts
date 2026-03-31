import type {
  ActiveAbilityId,
  ActiveAbilityProfile,
  PassiveAbilityId,
  PassiveAbilityProfile
} from './types'

const ACTIVE_ABILITIES: Record<ActiveAbilityId, ActiveAbilityProfile> = {
  dash: {
    id: 'dash',
    label: 'Dash',
    description:
      'Instantly dash in your movement direction. Dodge bullets and reposition.',
    cooldownMs: 9000,
    params: {
      dashDistance: 110
    }
  },
  quick_reload: {
    id: 'quick_reload',
    label: 'Quick Reload',
    description:
      'Instantly reload your current weapon from reserves and get back into the fight.',
    cooldownMs: 13000,
    params: {
      instantReload: true
    }
  },
  grenade: {
    id: 'grenade',
    label: 'Grenade',
    description: 'Cook and throw a frag grenade with area damage and falloff.',
    cooldownMs: 12000,
    params: {
      grenadeRadius: 180,
      grenadeMaxDamage: 90,
      grenadeFuseMs: 1800,
      grenadeThrowSpeed: 420
    }
  }
}

const PASSIVE_ABILITIES: Record<PassiveAbilityId, PassiveAbilityProfile> = {
  regen: {
    id: 'regen',
    label: 'Regen',
    description: 'Regenerate HP after 3s out of combat.',
    params: {
      regenRatePerSecond: 6,
      regenDelayMs: 3000,
      maxRegenHp: 100
    }
  },
  heavy_armor: {
    id: 'heavy_armor',
    label: 'Heavy Armor',
    description: 'Start each round with extra armor to survive more hits.',
    params: {
      startArmor: 140
    }
  },
  lightweight: {
    id: 'lightweight',
    label: 'Lightweight',
    description: 'Move faster to play aggressively or flank.',
    params: {
      moveSpeedMultiplier: 1.14
    }
  }
}

const DEFAULT_ACTIVE_ABILITY: ActiveAbilityId = 'dash'
const DEFAULT_PASSIVE_ABILITY: PassiveAbilityId = 'regen'

const SUGGESTED_ABILITIES = {
  active: [
    {
      id: 'smoke_screen',
      label: 'Smoke Screen',
      description: 'Drop smoke to break line of sight and escape.'
    },
    {
      id: 'drone_scan',
      label: 'Drone Scan',
      description: 'Reveal enemies in a cone for a short duration.'
    }
  ],
  passive: [
    {
      id: 'glass_cannon',
      label: 'Glass Cannon',
      description: '+damage but lower max HP.'
    },
    {
      id: 'scavenger',
      label: 'Scavenger',
      description: 'Recover ammo from defeated enemies or pickups.'
    }
  ]
}

export {
  ACTIVE_ABILITIES,
  PASSIVE_ABILITIES,
  DEFAULT_ACTIVE_ABILITY,
  DEFAULT_PASSIVE_ABILITY,
  SUGGESTED_ABILITIES
}
