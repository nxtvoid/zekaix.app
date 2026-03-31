import {
  ACTIVE_ABILITIES,
  DEFAULT_ACTIVE_ABILITY,
  DEFAULT_PASSIVE_ABILITY,
  PASSIVE_ABILITIES
} from './catalog'
import type {
  AbilityStateSnapshot,
  AbilitySystemOptions,
  ActiveAbilityUseResult,
  ActiveAbilityId,
  PassiveAbilityId
} from './types'

class TankAbilitySystem {
  private activeId: ActiveAbilityId
  private passiveId: PassiveAbilityId
  private activeReadyAtMs = 0

  private maxHp: number
  private hp: number
  private baseArmor: number
  private armor: number
  private moveSpeedMultiplier = 1

  private lastDamageAtMs = Number.NEGATIVE_INFINITY

  constructor(options: AbilitySystemOptions = {}) {
    this.activeId = options.activeId ?? DEFAULT_ACTIVE_ABILITY
    this.passiveId = options.passiveId ?? DEFAULT_PASSIVE_ABILITY
    this.maxHp = options.maxHp ?? 100
    this.hp = this.maxHp
    this.baseArmor = options.baseArmor ?? 100
    this.armor = this.baseArmor

    this.applyPassiveImmediateEffects()
  }

  switchActive(abilityId: ActiveAbilityId) {
    this.activeId = abilityId
    this.activeReadyAtMs = 0
  }

  switchPassive(abilityId: PassiveAbilityId) {
    this.passiveId = abilityId
    this.applyPassiveImmediateEffects()
  }

  getLoadout() {
    return {
      activeId: this.activeId,
      passiveId: this.passiveId,
      active: ACTIVE_ABILITIES[this.activeId],
      passive: PASSIVE_ABILITIES[this.passiveId]
    }
  }

  tryUseActive(nowMs = Date.now()): ActiveAbilityUseResult {
    const cooldownRemainingMs = Math.max(0, this.activeReadyAtMs - nowMs)

    if (cooldownRemainingMs > 0) {
      return {
        ok: false,
        abilityId: this.activeId,
        cooldownRemainingMs
      }
    }

    const active = ACTIVE_ABILITIES[this.activeId]
    this.activeReadyAtMs = nowMs + active.cooldownMs

    return {
      ok: true,
      abilityId: this.activeId,
      cooldownMs: active.cooldownMs
    }
  }

  getActiveCooldown(nowMs = Date.now()) {
    const active = ACTIVE_ABILITIES[this.activeId]
    const remainingMs = Math.max(0, this.activeReadyAtMs - nowMs)
    const isReady = remainingMs === 0
    const progress =
      active.cooldownMs > 0
        ? Math.min(1, 1 - remainingMs / active.cooldownMs)
        : 1

    return {
      abilityId: this.activeId,
      isReady,
      remainingMs,
      cooldownMs: active.cooldownMs,
      progress
    }
  }

  resetActiveCooldown() {
    this.activeReadyAtMs = 0
  }

  recordDamage(rawDamage: number, nowMs = Date.now()) {
    const damage = Math.max(0, rawDamage)
    this.lastDamageAtMs = nowMs

    if (damage <= 0) {
      return this.getStateSnapshot(nowMs)
    }

    const absorbedByArmor = Math.min(this.armor, damage)
    this.armor -= absorbedByArmor

    const hpDamage = damage - absorbedByArmor

    if (hpDamage > 0) {
      this.hp = Math.max(0, this.hp - hpDamage)
    }

    return this.getStateSnapshot(nowMs)
  }

  heal(amount: number) {
    const value = Math.max(0, amount)
    this.hp = Math.min(this.maxHp, this.hp + value)
  }

  addArmor(amount: number) {
    const value = Math.max(0, amount)
    this.armor += value
  }

  setMaxHp(maxHp: number) {
    const next = Math.max(1, maxHp)
    this.maxHp = next
    this.hp = Math.min(this.hp, this.maxHp)
  }

  getMoveSpeedMultiplier() {
    return this.moveSpeedMultiplier
  }

  update(deltaSeconds: number, nowMs = Date.now()) {
    const passive = PASSIVE_ABILITIES[this.passiveId]

    if (passive.id !== 'regen') {
      return this.getStateSnapshot(nowMs)
    }

    const regenDelayMs = passive.params.regenDelayMs ?? 3000
    const regenRatePerSecond = passive.params.regenRatePerSecond ?? 0
    const maxRegenHp = passive.params.maxRegenHp ?? this.maxHp
    const canRegenByTime = nowMs - this.lastDamageAtMs >= regenDelayMs

    if (!canRegenByTime || this.hp >= maxRegenHp) {
      return this.getStateSnapshot(nowMs)
    }

    this.hp = Math.min(maxRegenHp, this.hp + regenRatePerSecond * deltaSeconds)

    return this.getStateSnapshot(nowMs)
  }

  resetRound() {
    this.hp = this.maxHp
    this.armor = this.baseArmor
    this.applyPassiveImmediateEffects()
    this.resetActiveCooldown()
    this.lastDamageAtMs = Number.NEGATIVE_INFINITY
  }

  getStateSnapshot(nowMs = Date.now()): AbilityStateSnapshot {
    const passive = PASSIVE_ABILITIES[this.passiveId]
    const regenDelayMs = passive.params.regenDelayMs ?? 3000
    const canRegenerate =
      passive.id === 'regen' && nowMs - this.lastDamageAtMs >= regenDelayMs

    return {
      hp: this.hp,
      maxHp: this.maxHp,
      armor: this.armor,
      baseArmor: this.baseArmor,
      moveSpeedMultiplier: this.moveSpeedMultiplier,
      canRegenerate
    }
  }

  private applyPassiveImmediateEffects() {
    const passive = PASSIVE_ABILITIES[this.passiveId]

    this.moveSpeedMultiplier = passive.params.moveSpeedMultiplier ?? 1

    if (passive.id === 'heavy_armor') {
      const startArmor = passive.params.startArmor ?? this.baseArmor
      this.armor = Math.max(this.armor, startArmor)
      return
    }

    this.armor = Math.min(this.armor, this.baseArmor)
  }
}

export { TankAbilitySystem }
