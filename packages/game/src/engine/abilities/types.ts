type ActiveAbilityId = 'dash' | 'quick_reload' | 'grenade'

type PassiveAbilityId = 'regen' | 'heavy_armor' | 'lightweight'

interface ActiveAbilityProfile {
  id: ActiveAbilityId
  label: string
  description: string
  cooldownMs: number
  params: {
    dashDistance?: number
    instantReload?: boolean
    grenadeRadius?: number
    grenadeMaxDamage?: number
    grenadeFuseMs?: number
    grenadeThrowSpeed?: number
  }
}

interface PassiveAbilityProfile {
  id: PassiveAbilityId
  label: string
  description: string
  params: {
    regenRatePerSecond?: number
    regenDelayMs?: number
    maxRegenHp?: number
    startArmor?: number
    moveSpeedMultiplier?: number
  }
}

type AbilitySystemOptions = {
  activeId?: ActiveAbilityId
  passiveId?: PassiveAbilityId
  maxHp?: number
  baseArmor?: number
}

type ActiveAbilityUseResult =
  | {
      ok: true
      abilityId: ActiveAbilityId
      cooldownMs: number
    }
  | {
      ok: false
      abilityId: ActiveAbilityId
      cooldownRemainingMs: number
    }

type AbilityStateSnapshot = {
  hp: number
  maxHp: number
  armor: number
  baseArmor: number
  moveSpeedMultiplier: number
  canRegenerate: boolean
}

export type {
  ActiveAbilityId,
  PassiveAbilityId,
  ActiveAbilityProfile,
  PassiveAbilityProfile,
  AbilitySystemOptions,
  ActiveAbilityUseResult,
  AbilityStateSnapshot
}
