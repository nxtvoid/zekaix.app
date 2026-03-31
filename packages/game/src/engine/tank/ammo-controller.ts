import { GUNS } from '../guns'
import type { TankAmmoState, TankReloadState } from './types'

class TankAmmoController {
  private ammoByGun: Record<string, TankAmmoState> = {}
  private reloadingGunId: string | null = null
  private reloadRemainingMs = 0
  private reloadDurationMs = 0

  private getGunProfile(gunId: string) {
    const profile = GUNS[gunId]

    if (!profile) {
      throw new Error(`Unknown gun: ${gunId}`)
    }

    return profile
  }

  constructor() {
    this.initializeAmmo()
  }

  getAmmoState(gunId: string) {
    const state = this.ensureAmmoForGun(gunId)
    const profile = this.getGunProfile(gunId)

    return {
      gunId,
      inMagazine: state.inMagazine,
      magazineSize: profile.magazineSize,
      reserveMagazines: state.reserveMagazines,
      maxMagazines: profile.maxMagazines,
      totalAmmo:
        state.inMagazine + state.reserveMagazines * profile.magazineSize
    }
  }

  getReloadState(gunId: string): TankReloadState {
    const profile = this.getGunProfile(gunId)
    const ammo = this.ensureAmmoForGun(gunId)
    const isReloading = this.reloadingGunId === gunId
    const remainingMs = isReloading ? this.reloadRemainingMs : 0
    const durationMs = isReloading
      ? this.reloadDurationMs
      : profile.reloadDurationMs
    const progress =
      durationMs > 0
        ? Math.min(1, Math.max(0, 1 - remainingMs / durationMs))
        : 1
    const canReload =
      !isReloading &&
      ammo.inMagazine < profile.magazineSize &&
      ammo.reserveMagazines > 0
    const shouldReload =
      !isReloading &&
      ammo.inMagazine < profile.ammoPerShot &&
      ammo.reserveMagazines > 0
    const noReserveMagazines = ammo.reserveMagazines <= 0
    const isOutOfAmmo =
      !isReloading &&
      ammo.inMagazine < profile.ammoPerShot &&
      noReserveMagazines

    return {
      isReloading,
      gunId,
      remainingMs,
      durationMs,
      progress,
      canReload,
      shouldReload,
      noReserveMagazines,
      isOutOfAmmo
    }
  }

  isReloading() {
    return this.reloadingGunId !== null
  }

  canShoot(gunId: string) {
    if (this.reloadingGunId) {
      return false
    }

    const state = this.ensureAmmoForGun(gunId)
    const profile = this.getGunProfile(gunId)

    return state.inMagazine >= profile.ammoPerShot
  }

  consumeForShot(gunId: string) {
    const state = this.ensureAmmoForGun(gunId)
    const profile = this.getGunProfile(gunId)

    state.inMagazine = Math.max(0, state.inMagazine - profile.ammoPerShot)
  }

  startReload(gunId: string) {
    const profile = this.getGunProfile(gunId)
    const state = this.ensureAmmoForGun(gunId)

    if (this.reloadingGunId) {
      return false
    }

    if (
      state.inMagazine >= profile.magazineSize ||
      state.reserveMagazines <= 0
    ) {
      return false
    }

    this.reloadingGunId = gunId
    this.reloadDurationMs = profile.reloadDurationMs
    this.reloadRemainingMs = profile.reloadDurationMs

    return true
  }

  updateReload(deltaSeconds: number) {
    if (!this.reloadingGunId) {
      return
    }

    this.reloadRemainingMs = Math.max(
      0,
      this.reloadRemainingMs - deltaSeconds * 1000
    )

    if (this.reloadRemainingMs > 0) {
      return
    }

    const gunId = this.reloadingGunId
    const profile = this.getGunProfile(gunId)
    const ammoState = this.ensureAmmoForGun(gunId)

    if (ammoState.reserveMagazines > 0) {
      ammoState.reserveMagazines -= 1
      ammoState.inMagazine = profile.magazineSize
    }

    this.reloadingGunId = null
    this.reloadDurationMs = 0
    this.reloadRemainingMs = 0
  }

  refillAmmo(gunId?: string) {
    if (gunId) {
      const profile = this.getGunProfile(gunId)

      this.ammoByGun[gunId] = {
        inMagazine: profile.magazineSize,
        reserveMagazines: profile.maxMagazines - 1
      }

      if (this.reloadingGunId === gunId) {
        this.reloadingGunId = null
        this.reloadDurationMs = 0
        this.reloadRemainingMs = 0
      }

      return
    }

    this.initializeAmmo()
    this.reloadingGunId = null
    this.reloadDurationMs = 0
    this.reloadRemainingMs = 0
  }

  addReserveMagazines(gunId: string, amount = 1) {
    const profile = this.getGunProfile(gunId)
    const ammoState = this.ensureAmmoForGun(gunId)
    const maxReserveMagazines = Math.max(0, profile.maxMagazines - 1)
    const nextReserveMagazines = Math.min(
      maxReserveMagazines,
      ammoState.reserveMagazines + Math.max(0, Math.floor(amount))
    )

    const didChange = nextReserveMagazines !== ammoState.reserveMagazines
    ammoState.reserveMagazines = nextReserveMagazines

    return didChange
  }

  instantReload(gunId: string) {
    const profile = this.getGunProfile(gunId)
    const ammoState = this.ensureAmmoForGun(gunId)

    if (
      ammoState.inMagazine >= profile.magazineSize ||
      ammoState.reserveMagazines <= 0
    ) {
      return false
    }

    ammoState.reserveMagazines -= 1
    ammoState.inMagazine = profile.magazineSize

    if (this.reloadingGunId === gunId) {
      this.reloadingGunId = null
      this.reloadDurationMs = 0
      this.reloadRemainingMs = 0
    }

    return true
  }

  ensureGun(gunId: string) {
    this.ensureAmmoForGun(gunId)
  }

  private initializeAmmo() {
    const ammoByGun: Record<string, TankAmmoState> = {}

    for (const [gunId, gun] of Object.entries(GUNS)) {
      ammoByGun[gunId] = {
        inMagazine: gun.magazineSize,
        reserveMagazines: gun.maxMagazines - 1
      }
    }

    this.ammoByGun = ammoByGun
  }

  private ensureAmmoForGun(gunId: string) {
    const existing = this.ammoByGun[gunId]

    if (existing) {
      return existing
    }

    const profile = this.getGunProfile(gunId)

    this.ammoByGun[gunId] = {
      inMagazine: profile.magazineSize,
      reserveMagazines: profile.maxMagazines - 1
    }

    return this.ammoByGun[gunId]
  }
}

export { TankAmmoController }
