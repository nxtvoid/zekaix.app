type GunProfile = {
  id: string
  label: string
  bulletSpeed: number
  bulletRadius: number
  bulletLifeMs: number
  shootCooldownMs: number
  reloadDurationMs: number
  bulletsPerShot: number
  ammoPerShot: number
  spreadAngleDeg: number
  damage: number
  maxRange: number
  magazineSize: number
  maxMagazines: number
  shootMode: 'click' | 'hold'
  bulletStyle: 'normal' | 'pellet' | 'sniper' | 'small' | 'grenade'
}

const GUNS: Record<string, GunProfile> = {
  ak47: {
    id: 'ak47',
    label: 'AK-47',
    bulletSpeed: 480,
    bulletRadius: 2.5,
    bulletLifeMs: 1200,
    shootCooldownMs: 85,
    reloadDurationMs: 1450,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 3,
    damage: 25,
    maxRange: 650,
    magazineSize: 30,
    maxMagazines: 3,
    shootMode: 'hold',
    bulletStyle: 'normal'
  },

  shotgun: {
    id: 'shotgun',
    label: 'Shotgun',
    bulletSpeed: 420,
    bulletRadius: 3.5,
    bulletLifeMs: 800,
    shootCooldownMs: 450,
    reloadDurationMs: 2200,
    bulletsPerShot: 8,
    ammoPerShot: 1,
    spreadAngleDeg: 25,
    damage: 18,
    maxRange: 320,
    magazineSize: 8,
    maxMagazines: 2,
    shootMode: 'click',
    bulletStyle: 'pellet'
  },

  sniper: {
    id: 'sniper',
    label: 'Sniper Rifle',
    bulletSpeed: 720,
    bulletRadius: 2,
    bulletLifeMs: 1500,
    shootCooldownMs: 380,
    reloadDurationMs: 1900,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 0.8,
    damage: 65,
    maxRange: 1200,
    magazineSize: 5,
    maxMagazines: 3,
    shootMode: 'click',
    bulletStyle: 'sniper'
  },

  smg: {
    id: 'smg',
    label: 'Submachine Gun',
    bulletSpeed: 540,
    bulletRadius: 2,
    bulletLifeMs: 950,
    shootCooldownMs: 45,
    reloadDurationMs: 1700,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 6,
    damage: 15,
    maxRange: 480,
    magazineSize: 36,
    maxMagazines: 3,
    shootMode: 'hold',
    bulletStyle: 'small'
  },

  pistol: {
    id: 'pistol',
    label: 'Pistol',
    bulletSpeed: 500,
    bulletRadius: 2.2,
    bulletLifeMs: 1000,
    shootCooldownMs: 120,
    reloadDurationMs: 1300,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 4,
    damage: 20,
    maxRange: 550,
    magazineSize: 12,
    maxMagazines: 3,
    shootMode: 'click',
    bulletStyle: 'normal'
  },

  pistol_mk2: {
    id: 'pistol_mk2',
    label: 'Pistol Mk.II',
    bulletSpeed: 515,
    bulletRadius: 2.2,
    bulletLifeMs: 1050,
    shootCooldownMs: 100,
    reloadDurationMs: 1250,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 3.2,
    damage: 22,
    maxRange: 580,
    magazineSize: 12,
    maxMagazines: 3,
    shootMode: 'click',
    bulletStyle: 'normal'
  },

  pistol_mk3: {
    id: 'pistol_mk3',
    label: 'Pistol Mk.III',
    bulletSpeed: 530,
    bulletRadius: 2.2,
    bulletLifeMs: 1100,
    shootCooldownMs: 82,
    reloadDurationMs: 1200,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 2.8,
    damage: 24,
    maxRange: 610,
    magazineSize: 13,
    maxMagazines: 3,
    shootMode: 'click',
    bulletStyle: 'normal'
  },

  smg_mk2: {
    id: 'smg_mk2',
    label: 'SMG Mk.II',
    bulletSpeed: 560,
    bulletRadius: 2,
    bulletLifeMs: 980,
    shootCooldownMs: 39,
    reloadDurationMs: 1650,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 5.4,
    damage: 16,
    maxRange: 510,
    magazineSize: 38,
    maxMagazines: 3,
    shootMode: 'hold',
    bulletStyle: 'small'
  },

  smg_mk3: {
    id: 'smg_mk3',
    label: 'SMG Mk.III',
    bulletSpeed: 585,
    bulletRadius: 2,
    bulletLifeMs: 1020,
    shootCooldownMs: 34,
    reloadDurationMs: 1600,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 4.8,
    damage: 17,
    maxRange: 540,
    magazineSize: 40,
    maxMagazines: 3,
    shootMode: 'hold',
    bulletStyle: 'small'
  },

  ak47_mk2: {
    id: 'ak47_mk2',
    label: 'AK-47 Mk.II',
    bulletSpeed: 505,
    bulletRadius: 2.5,
    bulletLifeMs: 1260,
    shootCooldownMs: 74,
    reloadDurationMs: 1380,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 2.6,
    damage: 27,
    maxRange: 700,
    magazineSize: 32,
    maxMagazines: 3,
    shootMode: 'hold',
    bulletStyle: 'normal'
  },

  ak47_mk3: {
    id: 'ak47_mk3',
    label: 'AK-47 Mk.III',
    bulletSpeed: 530,
    bulletRadius: 2.5,
    bulletLifeMs: 1300,
    shootCooldownMs: 65,
    reloadDurationMs: 1320,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 2.1,
    damage: 29,
    maxRange: 760,
    magazineSize: 34,
    maxMagazines: 3,
    shootMode: 'hold',
    bulletStyle: 'normal'
  },

  shotgun_mk2: {
    id: 'shotgun_mk2',
    label: 'Shotgun Mk.II',
    bulletSpeed: 445,
    bulletRadius: 3.5,
    bulletLifeMs: 880,
    shootCooldownMs: 390,
    reloadDurationMs: 2100,
    bulletsPerShot: 9,
    ammoPerShot: 1,
    spreadAngleDeg: 22,
    damage: 20,
    maxRange: 360,
    magazineSize: 9,
    maxMagazines: 2,
    shootMode: 'click',
    bulletStyle: 'pellet'
  },

  sniper_mk2: {
    id: 'sniper_mk2',
    label: 'Sniper Mk.II',
    bulletSpeed: 780,
    bulletRadius: 2,
    bulletLifeMs: 1600,
    shootCooldownMs: 330,
    reloadDurationMs: 1750,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 0.5,
    damage: 72,
    maxRange: 1400,
    magazineSize: 5,
    maxMagazines: 3,
    shootMode: 'click',
    bulletStyle: 'sniper'
  },

  grenade_launcher: {
    id: 'grenade_launcher',
    label: 'Grenade Launcher',
    bulletSpeed: 350,
    bulletRadius: 5,
    bulletLifeMs: 1400,
    shootCooldownMs: 280,
    reloadDurationMs: 2400,
    bulletsPerShot: 1,
    ammoPerShot: 1,
    spreadAngleDeg: 2,
    damage: 40,
    maxRange: 700,
    magazineSize: 6,
    maxMagazines: 3,
    shootMode: 'click',
    bulletStyle: 'grenade'
  }
}

class TankGun {
  private gunId: string
  private profile: GunProfile

  constructor(gunId: string = 'ak47') {
    const profile = GUNS[gunId]

    if (!profile) {
      throw new Error(`Unknown gun: ${gunId}`)
    }

    this.gunId = gunId
    this.profile = profile
  }

  getId() {
    return this.gunId
  }

  getProfile() {
    return this.profile
  }

  setGun(gunId: string) {
    const profile = GUNS[gunId]

    if (!profile) {
      throw new Error(`Unknown gun: ${gunId}`)
    }

    this.gunId = gunId
    this.profile = profile
  }

  generateBulletAngles(baseRotation: number): number[] {
    const { bulletsPerShot, spreadAngleDeg } = this.profile
    const spreadRad = (spreadAngleDeg * Math.PI) / 180

    if (bulletsPerShot === 1) {
      return [baseRotation]
    }

    const angles: number[] = []
    const angleStep = spreadRad / (bulletsPerShot - 1)

    for (let i = 0; i < bulletsPerShot; i++) {
      const offset = -spreadRad / 2 + i * angleStep
      angles.push(baseRotation + offset)
    }

    return angles
  }
}

export type { GunProfile }
export { GUNS, TankGun }
