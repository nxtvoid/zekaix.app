'use client'

import type { GameLoadout } from '@zekaix/game/client'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { signOut } from '@zekaix/auth/client'
import { clamp } from '@zekaix/utils/clamp'
import {
  SINGLE_MAP_DEFINITION,
  TankCanvas,
  getRandomMapSpawn
} from '@zekaix/game/engine'
import { GUNS } from '@zekaix/game/engine'
import { ACTIVE_ABILITIES, TankAbilitySystem } from '@zekaix/game/engine'
import {
  createBorderColliders,
  drawMapPickups,
  drawLocalHpShieldBars,
  drawMap,
  drawRemoteHpShieldBars,
  drawRemotePlayerNames,
  drawRemoteTank,
  getVisibleRemotePlayers,
  pruneAndDrawSharedGrenades,
  pruneAndDrawHitMarkers,
  pruneAndDrawShotProjectiles
} from '@zekaix/game/canvas'
import { useGameSession } from '@/hooks/use-game-session'
import { GamePauseMenu } from '@zekaix/ui/game-pause-menu'
import {
  GameplayDeathOverlay,
  GameplayLeaderboardPanel,
  GameplayMapInfoPanel
} from '@zekaix/ui/gameplay-hud'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type GameplayCanvasProps = {
  gameId: string
  localPlayerId: string
  loadout: GameLoadout
}

type RemoteVitals = {
  hp: number
  shield: number
}

type MinimapPlayerState = {
  x: number
  z: number
  yaw: number
}

const GameplayCanvas = ({
  gameId,
  localPlayerId,
  loadout
}: GameplayCanvasProps) => {
  const { session, snapshot, socket } = useGameSession(localPlayerId)
  const router = useRouter()
  const map = SINGLE_MAP_DEFINITION

  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameplayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const worldLayerRef = useRef<HTMLDivElement | null>(null)
  const tankRef = useRef<TankCanvas | null>(null)
  const keysRef = useRef<Record<string, boolean>>({})
  const lastSyncAtRef = useRef(0)
  const lastMinimapCommitAtRef = useRef(0)
  const localYawRef = useRef(0)
  const abilitySystemRef = useRef<TankAbilitySystem | null>(null)
  const lastMouseClientPositionRef = useRef<{ x: number; y: number } | null>(
    null
  )
  const snapshotRef = useRef(snapshot)
  const localDamageTimeRef = useRef(0)
  const remoteDamageTimeRef = useRef(0)
  const previousLocalVitalsRef = useRef({
    hp: snapshot.localStats.hp,
    shield: snapshot.localStats.shield,
    isDead: snapshot.localStats.isDead
  })
  const previousRemoteVitalsRef = useRef<Map<string, RemoteVitals>>(new Map())
  const appliedPickupFeedIdRef = useRef<string | null>(null)

  const [ammoState, setAmmoState] = useState({
    inMagazine: 0,
    magazineSize: 0,
    reserveBullets: 0,
    reserveMagazines: 0
  })
  const [reloadProgress, setReloadProgress] = useState(0)
  const [isReloading, setIsReloading] = useState(false)
  const [needsReload, setNeedsReload] = useState(false)
  const [isOutOfAmmo, setIsOutOfAmmo] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const isPausedRef = useRef(isPaused)
  const [minimapPlayer, setMinimapPlayer] = useState<MinimapPlayerState | null>(
    null
  )
  const [abilityCooldown, setAbilityCooldown] = useState({
    label:
      ACTIVE_ABILITIES[loadout.activeAbilityId]?.label ??
      loadout.activeAbilityId,
    isReady: true,
    progress: 1,
    remainingSeconds: 0
  })

  const resetAbilityCooldownUi = useEffectEvent(() => {
    setAbilityCooldown({
      label:
        ACTIVE_ABILITIES[loadout.activeAbilityId]?.label ??
        loadout.activeAbilityId,
      isReady: true,
      progress: 1,
      remainingSeconds: 0
    })
  })

  snapshotRef.current = snapshot
  isPausedRef.current = isPaused

  const clearGameplayInput = useEffectEvent(() => {
    keysRef.current = {}
    lastMouseClientPositionRef.current = null

    const tank = tankRef.current

    if (!tank) {
      return
    }

    tank.setMovementInput({
      up: false,
      down: false,
      left: false,
      right: false
    })
    tank.handlePointerUp(0)
  })

  const isGameplayInputBlocked = useEffectEvent(() => {
    return isPausedRef.current || snapshotRef.current.localStats.isDead
  })

  useEffect(() => {
    if (isPaused || snapshot.localStats.isDead) {
      clearGameplayInput()
    }
  }, [isPaused, snapshot.localStats.isDead])

  useEffect(() => {
    const previousLocalVitals = previousLocalVitalsRef.current
    const nextLocalVitals = snapshot.localStats
    const tank = tankRef.current

    const tookLocalDamage =
      nextLocalVitals.hp < previousLocalVitals.hp ||
      nextLocalVitals.shield < previousLocalVitals.shield

    if (tookLocalDamage) {
      localDamageTimeRef.current = performance.now()
    }

    if (previousLocalVitals.isDead && !nextLocalVitals.isDead) {
      localDamageTimeRef.current = 0

      if (tank) {
        tank.resetCombatState()
        tank.switchGun(nextLocalVitals.currentWeapon)
        tank.refillAmmo()
        tank.clearBullets()
      }

      abilitySystemRef.current?.resetRound()
      resetAbilityCooldownUi()
      setReloadProgress(0)
      setIsReloading(false)
      setNeedsReload(false)
      setIsOutOfAmmo(false)
    }

    previousLocalVitalsRef.current = {
      hp: nextLocalVitals.hp,
      shield: nextLocalVitals.shield,
      isDead: nextLocalVitals.isDead
    }

    const now = performance.now()
    let remoteDamageDetected = false
    const nextRemoteVitals = new Map<string, RemoteVitals>()

    for (const [playerId, player] of snapshot.remotePlayers) {
      const previousRemoteVitals = previousRemoteVitalsRef.current.get(playerId)

      if (
        previousRemoteVitals &&
        (player.hp < previousRemoteVitals.hp ||
          (player.shield ?? 0) < previousRemoteVitals.shield)
      ) {
        remoteDamageDetected = true
      }

      nextRemoteVitals.set(playerId, {
        hp: player.hp,
        shield: player.shield ?? 0
      })
    }

    if (remoteDamageDetected) {
      remoteDamageTimeRef.current = now
    }

    previousRemoteVitalsRef.current = nextRemoteVitals
  }, [snapshot])

  useEffect(() => {
    const tank = tankRef.current

    if (!tank) {
      return
    }

    if (tank.getCurrentGun().getId() !== snapshot.localStats.currentWeapon) {
      tank.switchGun(snapshot.localStats.currentWeapon)
    }
  }, [snapshot.localStats.currentWeapon])

  useEffect(() => {
    const pickupFeed = snapshot.lastCollectedPickup
    const tank = tankRef.current
    const abilitySystem = abilitySystemRef.current

    if (
      !pickupFeed ||
      appliedPickupFeedIdRef.current === pickupFeed.id ||
      !tank
    ) {
      return
    }

    appliedPickupFeedIdRef.current = pickupFeed.id

    if (pickupFeed.kind === 'ammo') {
      tank.addReserveMagazines(
        snapshot.localStats.currentWeapon,
        pickupFeed.value
      )
      return
    }

    if (pickupFeed.kind === 'ability_charge') {
      abilitySystem?.resetActiveCooldown()
      resetAbilityCooldownUi()
    }
  }, [snapshot.localStats.currentWeapon, snapshot.lastCollectedPickup])

  useEffect(() => {
    const tank = tankRef.current

    if (!tank) {
      return
    }

    const abilitySystem = new TankAbilitySystem({
      activeId: loadout.activeAbilityId,
      passiveId: loadout.passiveAbilityId
    })

    abilitySystemRef.current = abilitySystem

    const abilityState = abilitySystem.getStateSnapshot()
    tank.switchGun(loadout.weaponId)
    tank.refillAmmo(loadout.weaponId)
    tank.updateOptions({
      moveSpeed: 220 * abilityState.moveSpeedMultiplier
    })
    resetAbilityCooldownUi()
  }, [loadout])

  useEffect(() => {
    if (!socket) {
      return
    }

    const onPlayerRespawned = (payload: {
      playerId: string
      x: number
      z: number
      currentWeapon: string
    }) => {
      if (payload.playerId !== localPlayerId) {
        return
      }

      const tank = tankRef.current

      if (!tank) {
        return
      }

      tank.setPosition(payload.x, payload.z)
      tank.resetCombatState()
      tank.switchGun(payload.currentWeapon)
      tank.refillAmmo()
      tank.clearBullets()
      abilitySystemRef.current?.resetRound()
      resetAbilityCooldownUi()
      setReloadProgress(0)
      setIsReloading(false)
      setNeedsReload(false)
      setIsOutOfAmmo(false)
      localDamageTimeRef.current = 0
    }

    socket.on('game:player_respawned', onPlayerRespawned)

    return () => {
      socket.off('game:player_respawned', onPlayerRespawned)
    }
  }, [localPlayerId, socket])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      if (snapshotRef.current.localStats.isDead) {
        return
      }

      event.preventDefault()
      setIsPaused((current) => !current)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const mapCanvas = mapCanvasRef.current
    const gameplayCanvas = gameplayCanvasRef.current
    const overlayCanvas = overlayCanvasRef.current

    if (!mapCanvas || !gameplayCanvas || !overlayCanvas) {
      return
    }

    const dpr = window.devicePixelRatio || 1
    const worldWidth = Math.max(1, Math.floor(map.width))
    const worldHeight = Math.max(1, Math.floor(map.height))

    mapCanvas.width = Math.floor(worldWidth * dpr)
    mapCanvas.height = Math.floor(worldHeight * dpr)
    gameplayCanvas.width = Math.floor(worldWidth * dpr)
    gameplayCanvas.height = Math.floor(worldHeight * dpr)
    overlayCanvas.width = Math.floor(worldWidth * dpr)
    overlayCanvas.height = Math.floor(worldHeight * dpr)

    const mapContext = mapCanvas.getContext('2d')
    const gameplayContext = gameplayCanvas.getContext('2d')
    const overlayContext = overlayCanvas.getContext('2d')

    if (!mapContext || !overlayContext) {
      return
    }

    mapContext.setTransform(dpr, 0, 0, dpr, 0, 0)
    mapContext.imageSmoothingEnabled = false
    mapContext.imageSmoothingQuality = 'low'

    gameplayContext?.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (gameplayContext) {
      gameplayContext.imageSmoothingEnabled = false
      gameplayContext.imageSmoothingQuality = 'low'
    }

    overlayContext.setTransform(dpr, 0, 0, dpr, 0, 0)

    const borderThickness = 48
    const collisionObstacles = [
      ...map.obstacles,
      ...createBorderColliders(worldWidth, worldHeight, borderThickness)
    ]

    drawMap(mapContext, worldWidth, worldHeight, map)

    const spawn = getRandomMapSpawn(map, {
      padding: 160,
      radius: 42,
      attempts: 120
    })

    const abilitySystem = new TankAbilitySystem({
      activeId: loadout.activeAbilityId,
      passiveId: loadout.passiveAbilityId
    })
    const abilityState = abilitySystem.getStateSnapshot()
    abilitySystemRef.current = abilitySystem

    const tank = new TankCanvas(gameplayCanvas, {
      autoRotate: false,
      drawGrid: false,
      moveSpeed: 220 * abilityState.moveSpeedMultiplier,
      gunId: loadout.weaponId,
      mapWidth: worldWidth,
      mapHeight: worldHeight,
      obstacles: collisionObstacles,
      initialPosition: { x: spawn.x, y: spawn.y },
      onShoot: ({ rotation }) => {
        socket?.emit('game:shot', {
          yaw: rotation
        })
      }
    })

    tankRef.current = tank
    tank.start()

    const updateMovementInput = () => {
      tank.setMovementInput({
        up: keysRef.current.w,
        down: keysRef.current.s,
        left: keysRef.current.a,
        right: keysRef.current.d
      })
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if (isGameplayInputBlocked()) {
        return
      }

      keysRef.current[key] = true
      updateMovementInput()

      if (key === 'r') {
        tank.reload()
      }

      if (key === 'q') {
        const activeAbility = ACTIVE_ABILITIES[loadout.activeAbilityId]
        const abilityUseResult = abilitySystem.tryUseActive()

        if (!abilityUseResult.ok || !activeAbility) {
          return
        }

        if (loadout.activeAbilityId === 'dash') {
          const dashDistance = activeAbility.params.dashDistance ?? 110
          tank.dash(dashDistance)
          return
        }

        if (loadout.activeAbilityId === 'grenade') {
          const currentPosition = tank.getPosition()
          const aimTarget = tank.getAimTarget()

          tank.throwGrenade({
            blastRadius: activeAbility.params.grenadeRadius,
            maxDamage: activeAbility.params.grenadeMaxDamage,
            fuseMs: activeAbility.params.grenadeFuseMs,
            speed: activeAbility.params.grenadeThrowSpeed
          })

          if (socket && currentPosition) {
            socket.emit('game:grenade_throw', {
              x: currentPosition.x,
              z: currentPosition.y,
              targetX:
                aimTarget?.x ??
                currentPosition.x + Math.cos(localYawRef.current) * 340,
              targetZ:
                aimTarget?.y ??
                currentPosition.y + Math.sin(localYawRef.current) * 340
            })
          }
          return
        }

        if (loadout.activeAbilityId === 'quick_reload') {
          tank.instantReload()
        }
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      keysRef.current[key] = false
      updateMovementInput()
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (isGameplayInputBlocked()) {
        return
      }

      lastMouseClientPositionRef.current = {
        x: event.clientX,
        y: event.clientY
      }

      tank.setAimTargetFromClient(event.clientX, event.clientY)

      const localPosition = tank.getPosition()
      const canvasRect = gameplayCanvas.getBoundingClientRect()

      if (!localPosition) {
        return
      }

      const aimX = event.clientX - canvasRect.left
      const aimY = event.clientY - canvasRect.top

      localYawRef.current = Math.atan2(
        aimY - localPosition.y,
        aimX - localPosition.x
      )
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return
      }

      if (isGameplayInputBlocked()) {
        return
      }

      event.preventDefault()

      tank.handlePointerDown(event.button, event.clientX, event.clientY)
    }

    const handleMouseUp = (event: MouseEvent) => {
      tank.handlePointerUp(event.button)
    }

    let frameId = 0

    const renderFrame = () => {
      const currentSnapshot = snapshotRef.current
      const now = performance.now()
      const position = tank.getPosition()
      const visibleRemotePlayers = getVisibleRemotePlayers(
        currentSnapshot.remotePlayers
      )
      const currentHitMarkers = session.getHitMarkers()
      const currentPickups = currentSnapshot.pickups
      const currentShotProjectiles = new Map(
        Array.from(session.getShotProjectiles()).filter(
          ([, projectile]) => projectile.shooterPlayerId !== localPlayerId
        )
      )
      const currentSharedGrenades = new Map(
        Array.from(session.getSharedGrenades()).filter(
          ([, grenade]) => grenade.shooterPlayerId !== localPlayerId
        )
      )
      const currentSharedExplosions = session.getSharedExplosions()

      const ammo = tank.getAmmoState()
      const reloadState = tank.getReloadState()
      const activeCooldown = abilitySystemRef.current?.getActiveCooldown()
      setAmmoState({
        inMagazine: ammo.inMagazine,
        magazineSize: ammo.magazineSize,
        reserveBullets: ammo.reserveMagazines * ammo.magazineSize,
        reserveMagazines: ammo.reserveMagazines
      })
      setReloadProgress(reloadState.progress)
      setIsReloading(reloadState.isReloading)
      setNeedsReload(reloadState.shouldReload || reloadState.canReload)
      setIsOutOfAmmo(reloadState.isOutOfAmmo)
      if (activeCooldown) {
        setAbilityCooldown({
          label:
            ACTIVE_ABILITIES[activeCooldown.abilityId]?.label ??
            activeCooldown.abilityId,
          isReady: activeCooldown.isReady,
          progress: activeCooldown.progress,
          remainingSeconds: Math.ceil(activeCooldown.remainingMs / 1000)
        })
      }

      if (position && worldLayerRef.current && viewportRef.current) {
        const viewportRect = viewportRef.current.getBoundingClientRect()
        const viewportWidth = Math.max(1, Math.floor(viewportRect.width))
        const viewportHeight = Math.max(1, Math.floor(viewportRect.height))
        const cameraX = clamp(
          position.x - viewportWidth / 2,
          0,
          Math.max(0, worldWidth - viewportWidth)
        )
        const cameraY = clamp(
          position.y - viewportHeight / 2,
          0,
          Math.max(0, worldHeight - viewportHeight)
        )

        worldLayerRef.current.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`
      }

      if (position && now - lastMinimapCommitAtRef.current >= 80) {
        setMinimapPlayer((current) => {
          const nextState = {
            x: position.x,
            z: position.y,
            yaw: localYawRef.current
          }

          if (
            current &&
            Math.abs(current.x - nextState.x) < 6 &&
            Math.abs(current.z - nextState.z) < 6 &&
            Math.abs(current.yaw - nextState.yaw) < 0.06
          ) {
            return current
          }

          return nextState
        })
        lastMinimapCommitAtRef.current = now
      }

      const lastMouseClientPosition = lastMouseClientPositionRef.current

      if (lastMouseClientPosition) {
        tank.setAimTargetFromClient(
          lastMouseClientPosition.x,
          lastMouseClientPosition.y
        )

        if (position) {
          const canvasRect = gameplayCanvas.getBoundingClientRect()
          const aimX = lastMouseClientPosition.x - canvasRect.left
          const aimY = lastMouseClientPosition.y - canvasRect.top

          localYawRef.current = Math.atan2(aimY - position.y, aimX - position.x)
        }
      }

      if (socket && position && now - lastSyncAtRef.current >= 50) {
        socket.emit('game:player_sync', {
          x: position.x,
          y: 0,
          z: position.y,
          yaw: localYawRef.current,
          pitch: 0,
          currentWeapon: tank.getCurrentGun().getId()
        })
        lastSyncAtRef.current = now
      }

      gameplayCanvas.style.visibility = currentSnapshot.localStats.isDead
        ? 'hidden'
        : 'visible'

      overlayContext.clearRect(0, 0, worldWidth, worldHeight)
      overlayContext.font = '12px ui-sans-serif, system-ui, sans-serif'
      overlayContext.textAlign = 'center'

      drawMapPickups(overlayContext, currentPickups.values(), now)

      for (const player of visibleRemotePlayers) {
        drawRemoteTank(overlayContext, player.x, player.z, player.yaw || 0)
      }

      pruneAndDrawSharedGrenades(
        overlayContext,
        currentSharedGrenades,
        currentSharedExplosions,
        now,
        { width: worldWidth, height: worldHeight },
        collisionObstacles
      )
      pruneAndDrawShotProjectiles(overlayContext, currentShotProjectiles, now)
      pruneAndDrawHitMarkers(overlayContext, currentHitMarkers, now)

      drawRemoteHpShieldBars(
        overlayContext,
        visibleRemotePlayers,
        now,
        remoteDamageTimeRef.current
      )

      if (position && !currentSnapshot.localStats.isDead) {
        drawLocalHpShieldBars(
          overlayContext,
          position,
          currentSnapshot.localStats.hp,
          currentSnapshot.localStats.shield,
          now,
          localDamageTimeRef.current
        )
      }

      drawRemotePlayerNames(overlayContext, visibleRemotePlayers)

      frameId = requestAnimationFrame(renderFrame)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    gameplayCanvas.addEventListener('mousemove', handleMouseMove)
    gameplayCanvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    frameId = requestAnimationFrame(renderFrame)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      gameplayCanvas.removeEventListener('mousemove', handleMouseMove)
      gameplayCanvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      cancelAnimationFrame(frameId)
      tank.stop()
      tankRef.current = null
      abilitySystemRef.current = null
    }
  }, [loadout, localPlayerId, session, socket])

  const weaponLabel =
    GUNS[snapshot.localStats.currentWeapon]?.label ??
    snapshot.localStats.currentWeapon

  return (
    <div
      ref={viewportRef}
      className='relative h-full w-full overflow-hidden rounded-xl border border-border/70'
    >
      <div
        ref={worldLayerRef}
        className='absolute top-0 left-0'
        style={{ width: `${map.width}px`, height: `${map.height}px` }}
      >
        <canvas
          ref={mapCanvasRef}
          className='absolute top-0 left-0'
          style={{ width: `${map.width}px`, height: `${map.height}px` }}
        />
        <canvas
          ref={gameplayCanvasRef}
          className='absolute top-0 left-0 cursor-crosshair'
          style={{ width: `${map.width}px`, height: `${map.height}px` }}
        />
        <canvas
          ref={overlayCanvasRef}
          className='pointer-events-none absolute top-0 left-0'
          style={{ width: `${map.width}px`, height: `${map.height}px` }}
        />
      </div>

      <GameplayMapInfoPanel
        gameIdShort={gameId.slice(0, 8)}
        localStats={{
          kills: snapshot.localStats.kills,
          deaths: snapshot.localStats.deaths,
          hp: snapshot.localStats.hp,
          shield: snapshot.localStats.shield
        }}
        ammo={{
          weaponLabel,
          inMagazine: ammoState.inMagazine,
          magazineSize: ammoState.magazineSize,
          reserveBullets: ammoState.reserveBullets,
          reserveMagazines: ammoState.reserveMagazines,
          isReloading,
          reloadProgress,
          needsReload,
          isOutOfAmmo
        }}
        ability={abilityCooldown}
        eventFeed={snapshot.eventFeed}
        minimap={{
          mapWidth: map.width,
          mapHeight: map.height,
          obstacles: map.obstacles,
          pickups: Array.from(snapshot.pickups.values()).map((pickup) => ({
            id: pickup.id,
            kind: pickup.kind,
            x: pickup.x,
            z: pickup.z
          })),
          localPlayer: minimapPlayer
        }}
      />

      <GameplayLeaderboardPanel
        entries={snapshot.leaderboard}
        emptyLabel='Waiting for players...'
      />

      {isPaused && (
        <GamePauseMenu
          isSigningOut={isSigningOut}
          onResume={() => setIsPaused(false)}
          onSignOut={async () => {
            await signOut({
              fetchOptions: {
                onRequest() {
                  setIsSigningOut(true)
                  toast.loading('Signing out...', { id: 'signout' })
                },
                onSuccess() {
                  toast.dismiss('signout')
                  toast.success('Signed out successfully')
                  router.refresh()
                },
                onError() {
                  toast.dismiss('signout')
                  toast.error('Failed to sign out')
                },
                onResponse() {
                  setIsSigningOut(false)
                }
              }
            })
          }}
        />
      )}

      {snapshot.localStats.isDead && (
        <GameplayDeathOverlay onRespawn={() => socket?.emit('game:respawn')} />
      )}
    </div>
  )
}

export { GameplayCanvas }
