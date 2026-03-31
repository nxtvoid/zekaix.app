import type { TankCombatState, TankOptions, TankRegenConfig } from './types'

class TankCombatController {
  private maxHp = 100
  private hp = 100
  private maxShield = 100
  private shield = 100

  private regenRatePerSecond = 0
  private regenDelayMs = 3000
  private regenMaxHp = 100
  private lastDamageAtMs = Number.NEGATIVE_INFINITY

  constructor(options: TankOptions) {
    this.maxHp = Math.max(1, options.maxHp ?? 100)
    this.hp = Math.max(0, Math.min(options.initialHp ?? this.maxHp, this.maxHp))
    this.maxShield = Math.max(0, options.maxShield ?? 100)
    this.shield = Math.max(
      0,
      Math.min(options.initialShield ?? this.maxShield, this.maxShield)
    )
    this.regenMaxHp = this.maxHp
  }

  getState(nowMs = performance.now()): TankCombatState {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      shield: this.shield,
      maxShield: this.maxShield,
      isAlive: this.hp > 0,
      canRegenerate:
        this.regenRatePerSecond > 0 &&
        nowMs - this.lastDamageAtMs >= this.regenDelayMs &&
        this.hp < this.regenMaxHp
    }
  }

  applyDamage(rawDamage: number, nowMs = performance.now()) {
    const damage = Math.max(0, rawDamage)

    if (damage <= 0) {
      return this.getState(nowMs)
    }

    this.lastDamageAtMs = nowMs

    const shieldAbsorb = Math.min(this.shield, damage)
    this.shield -= shieldAbsorb

    const hpDamage = damage - shieldAbsorb

    if (hpDamage > 0) {
      this.hp = Math.max(0, this.hp - hpDamage)
    }

    return this.getState(nowMs)
  }

  heal(amount: number) {
    const value = Math.max(0, amount)
    this.hp = Math.min(this.maxHp, this.hp + value)
  }

  addShield(amount: number) {
    const value = Math.max(0, amount)
    this.shield = Math.min(this.maxShield, this.shield + value)
  }

  setShield(value: number) {
    this.shield = Math.max(0, Math.min(value, this.maxShield))
  }

  setMaxHp(maxHp: number) {
    this.maxHp = Math.max(1, maxHp)
    this.hp = Math.min(this.hp, this.maxHp)
    this.regenMaxHp = Math.min(this.regenMaxHp, this.maxHp)
  }

  setMaxShield(maxShield: number) {
    this.maxShield = Math.max(0, maxShield)
    this.shield = Math.min(this.shield, this.maxShield)
  }

  setRegenConfig(config: TankRegenConfig) {
    this.regenRatePerSecond = Math.max(0, config.regenRatePerSecond)
    this.regenDelayMs = Math.max(0, config.regenDelayMs)
    this.regenMaxHp = Math.max(0, Math.min(config.maxRegenHp, this.maxHp))
  }

  reset() {
    this.hp = this.maxHp
    this.shield = this.maxShield
    this.lastDamageAtMs = Number.NEGATIVE_INFINITY
  }

  updateRegen(deltaSeconds: number, nowMs = performance.now()) {
    if (this.regenRatePerSecond <= 0 || this.hp >= this.regenMaxHp) {
      return
    }

    if (nowMs - this.lastDamageAtMs < this.regenDelayMs) {
      return
    }

    this.hp = Math.min(
      this.regenMaxHp,
      this.hp + this.regenRatePerSecond * deltaSeconds
    )
  }
}

export { TankCombatController }
