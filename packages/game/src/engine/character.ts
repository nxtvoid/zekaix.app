import { TANK_PROFILE } from '../constants'
import { TankGun } from './guns'
import { TankAmmoController } from './tank/ammo-controller'
import { TankBulletController } from './tank/bullet-controller'
import { TankCombatController } from './tank/combat-controller'
import { TankDashController } from './tank/dash-controller'
import { createGrenadeState } from './tank/grenade-physics'
import { TankGrenadeController } from './tank/grenade-controller'
import type {
  TankAreaDamageEvent,
  TankBullet,
  TankCombatState,
  TankDamageTarget,
  TankGrenade,
  TankGrenadeThrowOptions,
  TankMovementInput,
  TankOptions,
  TankRegenConfig,
  TankReloadState,
  TankShotPayload
} from './tank/types'
import type { MapObstacle } from './maps/types'

class TankCanvas {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private frameId = 0
  private lastTime = 0
  private rotation = 0
  private dpr = 1
  private isRunning = false
  private options: TankOptions
  private position: { x: number; y: number } | null = null
  private movementInput: Required<TankMovementInput> = {
    up: false,
    down: false,
    left: false,
    right: false
  }
  private aimTarget: { x: number; y: number } | null = null
  private lastShotAt = 0
  private isPointerPressed = false
  private barrelRecoil = 0

  private readonly ammoController: TankAmmoController
  private readonly bulletController: TankBulletController
  private readonly combatController: TankCombatController
  private readonly dashController: TankDashController
  private readonly grenadeController: TankGrenadeController
  private damageTargets: TankDamageTarget[] = []
  private onAreaDamage: ((event: TankAreaDamageEvent) => void) | null = null
  private gun: TankGun

  constructor(canvas: HTMLCanvasElement, options: TankOptions) {
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Unable to initialize 2D canvas context')
    }

    this.canvas = canvas
    this.context = context
    this.options = {
      autoRotate: options.autoRotate ?? false,
      rotation: options.rotation ?? 0,
      rotationSpeed: options.rotationSpeed,
      moveSpeed: options.moveSpeed ?? 220,
      drawGrid: options.drawGrid ?? true,
      initialPosition: options.initialPosition,
      mapWidth: options.mapWidth,
      mapHeight: options.mapHeight,
      obstacles: options.obstacles,
      maxBullets: options.maxBullets ?? 64,
      onShoot: options.onShoot,
      gunId: options.gunId ?? 'ak47',
      maxHp: options.maxHp,
      maxShield: options.maxShield,
      initialHp: options.initialHp,
      initialShield: options.initialShield
    }

    this.rotation = this.options.rotation ?? 0
    this.position = options.initialPosition ?? null
    const initialGunId = this.options.gunId ?? 'ak47'

    this.gun = new TankGun(initialGunId)
    this.ammoController = new TankAmmoController()
    this.ammoController.ensureGun(initialGunId)
    this.bulletController = new TankBulletController()
    this.combatController = new TankCombatController(this.options)
    this.dashController = new TankDashController()
    this.grenadeController = new TankGrenadeController()
  }

  updateOptions(options: Partial<TankOptions>) {
    this.options = {
      ...this.options,
      ...options
    }

    if (typeof this.options.rotation === 'number') {
      this.rotation = this.options.rotation
    }

    if (options.initialPosition) {
      this.position = { ...options.initialPosition }
    }
  }

  setRotation(radians: number) {
    this.rotation = radians
    this.options = {
      ...this.options,
      rotation: radians
    }
  }

  rotateBy(deltaRadians: number) {
    this.setRotation(this.rotation + deltaRadians)
  }

  setPosition(x: number, y: number) {
    this.position = { x, y }
  }

  dash(distance: number, durationMs = 140) {
    const width = this.canvas.width / this.dpr
    const height = this.canvas.height / this.dpr

    this.ensurePosition(width, height)

    if (!this.position) {
      return false
    }

    const horizontal =
      (this.movementInput.right ? 1 : 0) - (this.movementInput.left ? 1 : 0)
    const vertical =
      (this.movementInput.down ? 1 : 0) - (this.movementInput.up ? 1 : 0)

    let directionX = Math.cos(this.rotation)
    let directionY = Math.sin(this.rotation)

    if (horizontal !== 0 || vertical !== 0) {
      const movementLength = Math.hypot(horizontal, vertical) || 1

      directionX = horizontal / movementLength
      directionY = vertical / movementLength
    }

    this.dashController.start(directionX, directionY, distance, durationMs)

    return true
  }

  getPosition() {
    return this.position
  }

  setDamageTargets(targets: TankDamageTarget[]) {
    this.damageTargets = targets
  }

  setOnAreaDamage(handler: ((event: TankAreaDamageEvent) => void) | null) {
    this.onAreaDamage = handler
  }

  throwGrenade(options: TankGrenadeThrowOptions = {}) {
    const width = this.canvas.width / this.dpr
    const height = this.canvas.height / this.dpr

    this.ensurePosition(width, height)

    if (!this.position) {
      return false
    }

    const fallbackDistance = Math.max(20, options.maxThrowDistance ?? 340)
    const target = this.aimTarget
      ? { x: this.aimTarget.x, y: this.aimTarget.y }
      : {
          x: this.position.x + Math.cos(this.rotation) * fallbackDistance,
          y: this.position.y + Math.sin(this.rotation) * fallbackDistance
        }

    this.grenadeController.throwGrenade(
      createGrenadeState(this.position, target, options)
    )

    return true
  }

  setMovementInput(input: TankMovementInput) {
    this.movementInput = {
      ...this.movementInput,
      ...input
    }
  }

  setAimTarget(x: number, y: number) {
    this.aimTarget = { x, y }
  }

  setAimTargetFromClient(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()

    this.setAimTarget(clientX - rect.left, clientY - rect.top)
  }

  getAimTarget() {
    return this.aimTarget
  }

  switchGun(gunId: string) {
    this.gun.setGun(gunId)
    this.options.gunId = gunId
    this.ammoController.ensureGun(gunId)
  }

  getCurrentGun() {
    return this.gun
  }

  shoot() {
    const gunId = this.gun.getId()

    if (!this.ammoController.canShoot(gunId)) {
      return false
    }

    const now = performance.now()
    const gunProfile = this.gun.getProfile()

    if (now - this.lastShotAt < gunProfile.shootCooldownMs) {
      return false
    }

    const width = this.canvas.width / this.dpr
    const height = this.canvas.height / this.dpr
    const tankProfile = TANK_PROFILE

    this.ensurePosition(width, height)

    if (!this.position) {
      return false
    }

    const velocity = this.bulletController.spawnFromGun(
      this.position,
      this.rotation,
      tankProfile,
      this.gun,
      this.options.maxBullets ?? 64
    )

    this.ammoController.consumeForShot(gunId)
    this.lastShotAt = now
    this.barrelRecoil = Math.min(
      TANK_PROFILE.barrelLength * 0.22,
      4 + gunProfile.damage * 0.05
    )
    this.options.onShoot?.({
      x: this.position.x,
      y: this.position.y,
      vx: velocity.vx,
      vy: velocity.vy,
      rotation: this.rotation
    })

    return true
  }

  handlePointerDown(button: number, clientX?: number, clientY?: number) {
    if (button !== 0) {
      return false
    }

    this.isPointerPressed = true

    if (typeof clientX === 'number' && typeof clientY === 'number') {
      this.setAimTargetFromClient(clientX, clientY)
      this.applyAimTarget()
    }

    return this.shoot()
  }

  handlePointerUp(button: number) {
    if (button !== 0) {
      return
    }

    this.isPointerPressed = false
  }

  getBullets(): TankBullet[] {
    return this.bulletController.getBullets()
  }

  getGrenades(): TankGrenade[] {
    return this.grenadeController.getGrenades()
  }

  getCombatState(nowMs = performance.now()): TankCombatState {
    return this.combatController.getState(nowMs)
  }

  applyDamage(rawDamage: number, nowMs = performance.now()) {
    return this.combatController.applyDamage(rawDamage, nowMs)
  }

  heal(amount: number) {
    this.combatController.heal(amount)
  }

  addShield(amount: number) {
    this.combatController.addShield(amount)
  }

  setShield(value: number) {
    this.combatController.setShield(value)
  }

  setMaxHp(maxHp: number) {
    this.combatController.setMaxHp(maxHp)
  }

  setMaxShield(maxShield: number) {
    this.combatController.setMaxShield(maxShield)
  }

  setRegenConfig(config: TankRegenConfig) {
    this.combatController.setRegenConfig(config)
  }

  resetCombatState() {
    this.combatController.reset()
  }

  clearBullets() {
    this.bulletController.clear()
  }

  getAmmoState(gunId?: string) {
    return this.ammoController.getAmmoState(gunId ?? this.gun.getId())
  }

  reload(gunId?: string) {
    return this.ammoController.startReload(gunId ?? this.gun.getId())
  }

  getReloadState(gunId?: string): TankReloadState {
    return this.ammoController.getReloadState(gunId ?? this.gun.getId())
  }

  refillAmmo(gunId?: string) {
    this.ammoController.refillAmmo(gunId)
  }

  addReserveMagazines(gunId?: string, amount = 1) {
    return this.ammoController.addReserveMagazines(
      gunId ?? this.gun.getId(),
      amount
    )
  }

  instantReload(gunId?: string) {
    return this.ammoController.instantReload(gunId ?? this.gun.getId())
  }

  update(deltaSeconds: number) {
    const width = this.canvas.width / this.dpr
    const height = this.canvas.height / this.dpr
    const profile = TANK_PROFILE

    this.ensurePosition(width, height)

    if (this.options.autoRotate) {
      this.rotation +=
        (this.options.rotationSpeed ?? profile.rotationSpeed) *
        deltaSeconds *
        60
    } else {
      this.applyMovement(deltaSeconds, width, height, profile)
      this.applyDash(deltaSeconds, width, height, profile)
      this.applyAimTarget()
      this.ammoController.updateReload(deltaSeconds)
      this.applyAutoFire()
    }

    this.combatController.updateRegen(deltaSeconds, performance.now())
    this.barrelRecoil = Math.max(
      0,
      this.barrelRecoil - deltaSeconds * TANK_PROFILE.barrelLength * 1.8
    )
    this.grenadeController.update(
      deltaSeconds,
      { width, height },
      this.options.obstacles ?? [],
      [
        ...(this.position
          ? [
              {
                id: 'self',
                x: this.position.x,
                y: this.position.y
              }
            ]
          : []),
        ...this.damageTargets
      ],
      (targetId, damage) => {
        if (targetId === 'self') {
          this.combatController.applyDamage(damage, performance.now())
          return
        }

        this.onAreaDamage?.({
          targetId,
          damage,
          source: 'grenade'
        })
      }
    )
    this.bulletController.update(
      deltaSeconds,
      width,
      height,
      this.options.obstacles ?? []
    )
  }

  renderOnce() {
    const width = this.canvas.width / this.dpr
    const height = this.canvas.height / this.dpr
    const profile = TANK_PROFILE

    if (this.options.drawGrid) {
      this.drawGrid(width, height)
    } else {
      this.context.clearRect(0, 0, width, height)
    }

    this.drawTank(width, height, profile)
    this.grenadeController.draw(this.context, TANK_PROFILE.accentColor)
    this.bulletController.draw(this.context, TANK_PROFILE.accentColor)
  }

  start() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.dpr = window.devicePixelRatio || 1
    this.resizeCanvas()
    this.setRotation(this.options.rotation ?? 0)
    this.lastTime = performance.now()
    window.addEventListener('resize', this.resizeCanvas)
    this.render()
  }

  stop() {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    window.removeEventListener('resize', this.resizeCanvas)
    window.cancelAnimationFrame(this.frameId)
  }

  private readonly resizeCanvas = () => {
    const { width, height } = this.canvas.getBoundingClientRect()
    this.canvas.width = Math.floor(width * this.dpr)
    this.canvas.height = Math.floor(height * this.dpr)
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  private readonly render = () => {
    if (!this.isRunning) {
      return
    }

    const width = this.canvas.width / this.dpr
    const height = this.canvas.height / this.dpr
    const now = performance.now()
    const deltaSeconds = Math.max(0, (now - this.lastTime) / 1000)

    this.lastTime = now

    this.update(deltaSeconds)

    if (this.options.drawGrid) {
      this.drawGrid(width, height)
    } else {
      this.context.clearRect(0, 0, width, height)
    }

    this.drawTank(width, height, TANK_PROFILE)
    this.grenadeController.draw(this.context, TANK_PROFILE.accentColor)
    this.bulletController.draw(this.context, TANK_PROFILE.accentColor)

    this.frameId = window.requestAnimationFrame(this.render)
  }

  private ensurePosition(width: number, height: number) {
    if (!this.position) {
      this.position = { x: width / 2, y: height / 2 }
    }
  }

  private applyMovement(
    deltaSeconds: number,
    width: number,
    height: number,
    profile: { radius: number }
  ) {
    if (!this.position) {
      return
    }

    const horizontal =
      (this.movementInput.right ? 1 : 0) - (this.movementInput.left ? 1 : 0)
    const vertical =
      (this.movementInput.down ? 1 : 0) - (this.movementInput.up ? 1 : 0)

    if (horizontal === 0 && vertical === 0) {
      return
    }

    const length = Math.hypot(horizontal, vertical) || 1
    const normalizedX = horizontal / length
    const normalizedY = vertical / length
    const speed = this.options.moveSpeed ?? 220

    this.moveWithCollisions(
      normalizedX * speed * deltaSeconds,
      normalizedY * speed * deltaSeconds,
      width,
      height,
      profile.radius
    )
  }

  private applyDash(
    deltaSeconds: number,
    width: number,
    height: number,
    profile: { radius: number }
  ) {
    if (!this.position) {
      return
    }

    const { dx, dy } = this.dashController.update(deltaSeconds)

    if (dx === 0 && dy === 0) {
      return
    }

    this.moveWithCollisions(dx, dy, width, height, profile.radius)
  }

  private moveWithCollisions(
    deltaX: number,
    deltaY: number,
    width: number,
    height: number,
    radius: number
  ) {
    if (!this.position) {
      return
    }

    this.resolveObstaclePenetration(radius, width, height)

    const startX = this.position.x
    const startY = this.position.y

    this.position.x = startX + deltaX
    this.clampPosition(width, height, radius)

    if (
      this.collidesWithAnyObstacle(this.position.x, this.position.y, radius)
    ) {
      this.position.x = startX
    }

    this.position.y = startY + deltaY
    this.clampPosition(width, height, radius)

    if (
      this.collidesWithAnyObstacle(this.position.x, this.position.y, radius)
    ) {
      this.position.y = startY
    }

    this.resolveObstaclePenetration(radius, width, height)
    this.clampPosition(width, height, radius)
  }

  private resolveObstaclePenetration(
    radius: number,
    width: number,
    height: number
  ) {
    if (!this.position) {
      return
    }

    const obstacles = this.options.obstacles

    if (!obstacles || obstacles.length === 0) {
      return
    }

    for (let pass = 0; pass < 3; pass += 1) {
      let moved = false

      for (const obstacle of obstacles) {
        const separation = this.getObstacleSeparationVector(obstacle, radius)

        if (!separation) {
          continue
        }

        this.position.x += separation.x
        this.position.y += separation.y
        this.clampPosition(width, height, radius)
        moved = true
      }

      if (!moved) {
        break
      }
    }
  }

  private getObstacleSeparationVector(
    obstacle: MapObstacle,
    radius: number
  ): { x: number; y: number } | null {
    if (!this.position) {
      return null
    }

    if (obstacle.kind === 'circle') {
      const dx = this.position.x - obstacle.x
      const dy = this.position.y - obstacle.y
      const distance = Math.hypot(dx, dy)
      const minimumDistance = obstacle.radius + radius

      if (distance >= minimumDistance) {
        return null
      }

      const safeDistance = distance > 0.0001 ? distance : 0.0001
      const overlap = minimumDistance - safeDistance + 0.05

      return {
        x: (dx / safeDistance) * overlap,
        y: (dy / safeDistance) * overlap
      }
    }

    const nearestX = Math.max(
      obstacle.x,
      Math.min(this.position.x, obstacle.x + obstacle.width)
    )
    const nearestY = Math.max(
      obstacle.y,
      Math.min(this.position.y, obstacle.y + obstacle.height)
    )
    const dx = this.position.x - nearestX
    const dy = this.position.y - nearestY
    const distanceSq = dx * dx + dy * dy

    if (distanceSq > 0.0001) {
      const distance = Math.sqrt(distanceSq)

      if (distance >= radius) {
        return null
      }

      const overlap = radius - distance + 0.05

      return {
        x: (dx / distance) * overlap,
        y: (dy / distance) * overlap
      }
    }

    const leftDistance = Math.abs(this.position.x - obstacle.x)
    const rightDistance = Math.abs(
      obstacle.x + obstacle.width - this.position.x
    )
    const topDistance = Math.abs(this.position.y - obstacle.y)
    const bottomDistance = Math.abs(
      obstacle.y + obstacle.height - this.position.y
    )
    const minDistance = Math.min(
      leftDistance,
      rightDistance,
      topDistance,
      bottomDistance
    )
    const push = radius + 0.05

    if (minDistance === leftDistance) {
      return { x: -push, y: 0 }
    }

    if (minDistance === rightDistance) {
      return { x: push, y: 0 }
    }

    if (minDistance === topDistance) {
      return { x: 0, y: -push }
    }

    return { x: 0, y: push }
  }

  private clampPosition(width: number, height: number, radius: number) {
    if (!this.position) {
      return
    }

    const padding = radius + 2
    const mapWidth = this.options.mapWidth ?? width
    const mapHeight = this.options.mapHeight ?? height

    this.position.x = Math.max(
      padding,
      Math.min(mapWidth - padding, this.position.x)
    )
    this.position.y = Math.max(
      padding,
      Math.min(mapHeight - padding, this.position.y)
    )
  }

  private collidesWithAnyObstacle(x: number, y: number, radius: number) {
    const obstacles = this.options.obstacles

    if (!obstacles || obstacles.length === 0) {
      return false
    }

    for (const obstacle of obstacles) {
      if (this.collidesWithObstacle(obstacle, x, y, radius)) {
        return true
      }
    }

    return false
  }

  private collidesWithObstacle(
    obstacle: MapObstacle,
    x: number,
    y: number,
    radius: number
  ) {
    if (obstacle.kind === 'circle') {
      const dx = x - obstacle.x
      const dy = y - obstacle.y

      return Math.hypot(dx, dy) < obstacle.radius + radius
    }

    const nearestX = Math.max(
      obstacle.x,
      Math.min(x, obstacle.x + obstacle.width)
    )
    const nearestY = Math.max(
      obstacle.y,
      Math.min(y, obstacle.y + obstacle.height)
    )
    const dx = x - nearestX
    const dy = y - nearestY

    return dx * dx + dy * dy < radius * radius
  }

  private applyAimTarget() {
    if (!this.position || !this.aimTarget) {
      return
    }

    this.rotation = Math.atan2(
      this.aimTarget.y - this.position.y,
      this.aimTarget.x - this.position.x
    )
  }

  private applyAutoFire() {
    if (!this.isPointerPressed) {
      return
    }

    const gunProfile = this.gun.getProfile()

    if (gunProfile.shootMode === 'hold') {
      this.shoot()
    }
  }

  private drawGrid(width: number, height: number) {
    const context = this.context

    context.fillStyle = '#090A0B'
    context.fillRect(0, 0, width, height)

    context.strokeStyle = 'rgba(255,255,255,0.04)'
    context.lineWidth = 1

    for (let x = 0; x <= width; x += 28) {
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, height)
      context.stroke()
    }

    for (let y = 0; y <= height; y += 28) {
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(width, y)
      context.stroke()
    }
  }

  private drawTank(
    width: number,
    height: number,
    profile: { radius: number; barrelLength: number; barrelWidth: number }
  ) {
    const context = this.context

    this.ensurePosition(width, height)

    if (!this.position) {
      return
    }

    context.save()
    context.translate(this.position.x, this.position.y)
    context.rotate(this.rotation)

    context.fillStyle = 'rgba(0, 0, 0, 0.28)'
    context.beginPath()
    context.roundRect(
      -profile.radius * 1.38,
      -profile.radius * 1.06,
      profile.radius * 2.76,
      profile.radius * 2.12,
      profile.radius * 0.72
    )
    context.fill()

    context.fillStyle = TANK_PROFILE.treadColor
    context.beginPath()
    context.roundRect(
      -profile.radius * 1.32,
      -profile.radius * 1.02,
      profile.radius * 0.62,
      profile.radius * 2.04,
      profile.radius * 0.42
    )
    context.fill()
    context.beginPath()
    context.roundRect(
      profile.radius * 0.7,
      -profile.radius * 1.02,
      profile.radius * 0.62,
      profile.radius * 2.04,
      profile.radius * 0.42
    )
    context.fill()

    const recoilOffset = this.barrelRecoil

    context.strokeStyle = TANK_PROFILE.accentColor
    context.lineCap = 'round'
    context.lineWidth = profile.barrelWidth
    context.beginPath()
    context.moveTo(profile.radius * 0.28 - recoilOffset, 0)
    context.lineTo(profile.barrelLength - recoilOffset, 0)
    context.stroke()

    context.strokeStyle = 'rgba(255,255,255,0.22)'
    context.lineWidth = Math.max(1, profile.barrelWidth * 0.28)
    context.beginPath()
    context.moveTo(
      profile.radius * 0.4 - recoilOffset,
      -profile.barrelWidth * 0.18
    )
    context.lineTo(
      profile.barrelLength - recoilOffset,
      -profile.barrelWidth * 0.18
    )
    context.stroke()

    context.fillStyle = TANK_PROFILE.bodyShadowColor
    context.beginPath()
    context.roundRect(
      -profile.radius * 0.96,
      -profile.radius * 0.8,
      profile.radius * 1.92,
      profile.radius * 1.6,
      profile.radius * 0.48
    )
    context.fill()

    context.fillStyle = TANK_PROFILE.bodyColor
    context.beginPath()
    context.roundRect(
      -profile.radius * 0.9,
      -profile.radius * 0.74,
      profile.radius * 1.8,
      profile.radius * 1.48,
      profile.radius * 0.44
    )
    context.fill()

    context.strokeStyle = TANK_PROFILE.trimColor
    context.lineWidth = 1.4
    context.beginPath()
    context.roundRect(
      -profile.radius * 0.9,
      -profile.radius * 0.74,
      profile.radius * 1.8,
      profile.radius * 1.48,
      profile.radius * 0.44
    )
    context.stroke()

    context.fillStyle = TANK_PROFILE.trimColor
    context.beginPath()
    context.arc(0, 0, profile.radius * 0.58, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = TANK_PROFILE.bodyShadowColor
    context.beginPath()
    context.arc(0, 0, profile.radius * 0.42, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = TANK_PROFILE.accentColor
    context.beginPath()
    context.arc(0, 0, profile.radius * 0.18, 0, Math.PI * 2)
    context.fill()

    context.restore()
  }
}

export type {
  TankOptions,
  TankMovementInput,
  TankBullet,
  TankDamageTarget,
  TankAreaDamageEvent,
  TankGrenade,
  TankGrenadeThrowOptions,
  TankShotPayload,
  TankReloadState,
  TankCombatState,
  TankRegenConfig
}
export { TankCanvas }
