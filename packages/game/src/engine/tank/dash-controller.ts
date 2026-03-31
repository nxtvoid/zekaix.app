class TankDashController {
  private directionX = 0
  private directionY = 0
  private speed = 0
  private remainingMs = 0

  start(
    directionX: number,
    directionY: number,
    distance: number,
    durationMs = 140
  ) {
    const safeDurationMs = Math.max(30, durationMs)

    this.directionX = directionX
    this.directionY = directionY
    this.speed = Math.max(0, distance) / (safeDurationMs / 1000)
    this.remainingMs = safeDurationMs
  }

  update(deltaSeconds: number) {
    if (this.remainingMs <= 0 || this.speed <= 0) {
      return { dx: 0, dy: 0 }
    }

    const frameMs = deltaSeconds * 1000
    const stepMs = Math.min(this.remainingMs, frameMs)
    const stepSeconds = stepMs / 1000

    const dx = this.directionX * this.speed * stepSeconds
    const dy = this.directionY * this.speed * stepSeconds

    this.remainingMs = Math.max(0, this.remainingMs - stepMs)

    if (this.remainingMs === 0) {
      this.speed = 0
    }

    return { dx, dy }
  }
}

export { TankDashController }
