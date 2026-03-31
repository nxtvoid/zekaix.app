'use client'

import { useEffect, useRef, useState } from 'react'
import { Progress } from './progress'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Eyebrow } from './eyebrow'
import { cn } from '@zekaix/utils/cn'

type GameplayHudLocalStats = {
  kills: number
  deaths: number
  hp: number
  shield: number
}

type GameplayHudAmmo = {
  weaponLabel: string
  inMagazine: number
  magazineSize: number
  reserveBullets: number
  reserveMagazines: number
  isReloading: boolean
  reloadProgress: number
  needsReload: boolean
  isOutOfAmmo: boolean
}

type GameplayHudAbility = {
  label: string
  isReady: boolean
  progress: number
  remainingSeconds: number
}

type GameplayHudFeedItem = {
  id: string
  kind: 'pickup' | 'kill'
  tone: 'accent' | 'neutral' | 'danger'
  title: string
  detail: string
  createdAt: number
}

type GameplayHudMinimapObstacle =
  | {
      kind: 'rect' | 'cover_box'
      x: number
      y: number
      width: number
      height: number
    }
  | {
      kind: 'circle'
      x: number
      y: number
      radius: number
    }

type GameplayHudMinimapPickup = {
  id: string
  kind: 'ammo' | 'ability_charge' | 'repair_kit'
  x: number
  z: number
}

type GameplayHudMinimapPlayer = {
  x: number
  z: number
  yaw: number
}

type LeaderboardRow = {
  playerId: string
  rank: number
  playerName: string
  kills: number
}

function GameplayMiniMap({
  mapWidth,
  mapHeight,
  obstacles,
  pickups,
  localPlayer
}: {
  mapWidth: number
  mapHeight: number
  obstacles: GameplayHudMinimapObstacle[]
  pickups: GameplayHudMinimapPickup[]
  localPlayer: GameplayHudMinimapPlayer | null
}) {
  const viewWidth = 168
  const viewHeight = Math.max(
    112,
    Math.round((mapHeight / mapWidth) * viewWidth)
  )

  return (
    <div className='pointer-events-none w-fit overflow-hidden rounded-md border border-border bg-card/60 backdrop-blur-md'>
      <div className='relative overflow-hidden border-border border-b'>
        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className='block'
          style={{ width: `${viewWidth}px`, height: `${viewHeight}px` }}
          aria-hidden='true'
        >
          <rect
            x='0'
            y='0'
            width={mapWidth}
            height={mapHeight}
            fill='rgba(255,255,255,0.015)'
          />

          {obstacles.map((obstacle) =>
            obstacle.kind === 'circle' ? (
              <circle
                key={`minimap-obstacle-${obstacle.kind}-${obstacle.x}-${obstacle.y}-${obstacle.radius}`}
                cx={obstacle.x}
                cy={obstacle.y}
                r={obstacle.radius}
                fill='rgba(173, 255, 47, 0.1)'
                stroke='rgba(173, 255, 47, 0.16)'
                strokeWidth='10'
              />
            ) : (
              <rect
                key={`minimap-obstacle-${obstacle.kind}-${obstacle.x}-${obstacle.y}-${obstacle.width}-${obstacle.height}`}
                x={obstacle.x}
                y={obstacle.y}
                width={obstacle.width}
                height={obstacle.height}
                rx='18'
                fill='rgba(173, 255, 47, 0.1)'
                stroke='rgba(173, 255, 47, 0.16)'
                strokeWidth='10'
              />
            )
          )}

          {pickups.map((pickup) => (
            <circle
              key={pickup.id}
              cx={pickup.x}
              cy={pickup.z}
              r='34'
              fill='rgba(244, 244, 245, 0.88)'
            />
          ))}

          {localPlayer ? (
            <g
              transform={`translate(${localPlayer.x} ${localPlayer.z}) rotate(${(localPlayer.yaw * 180) / Math.PI})`}
            >
              <circle r='72' fill='rgba(163, 230, 53, 0.12)' />
              <circle
                r='48'
                fill='none'
                stroke='rgba(163,230,53,0.42)'
                strokeWidth='10'
              />
              <path
                d='M 0 -92 L 54 26 L 0 6 L -54 26 Z'
                fill='rgba(235,255,190,0.96)'
                stroke='rgba(163,230,53,0.55)'
                strokeWidth='10'
                strokeLinejoin='round'
              />
              <circle r='20' fill='rgba(163,230,53,1)' />
            </g>
          ) : null}
        </svg>

        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_58%,rgba(10,15,20,0.36)_100%)]' />
      </div>

      <div className='flex items-center gap-3 p-2 text-[9px] text-muted-foreground uppercase tracking-[0.18em]'>
        <span className='inline-flex items-center gap-1.5'>
          <span className='h-1.5 w-1.5 rounded-full bg-lime-300' />
          You
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <span className='h-1.5 w-1.5 rounded-full bg-white/90' />
          Pickups
        </span>
      </div>
    </div>
  )
}

function GameplayMapInfoPanel({
  gameIdShort,
  localStats,
  ammo,
  ability,
  eventFeed,
  minimap
}: {
  gameIdShort: string
  localStats: GameplayHudLocalStats
  ammo: GameplayHudAmmo
  ability: GameplayHudAbility
  eventFeed: GameplayHudFeedItem[]
  minimap: {
    mapWidth: number
    mapHeight: number
    obstacles: GameplayHudMinimapObstacle[]
    pickups: GameplayHudMinimapPickup[]
    localPlayer: GameplayHudMinimapPlayer | null
  }
}) {
  const hpPercent = Math.max(0, Math.min(100, localStats.hp))
  const shieldPercent = Math.max(0, Math.min(100, localStats.shield))
  const displayedMagazineAmmo = ammo.isOutOfAmmo ? 0 : ammo.inMagazine
  const displayedReserveAmmo = ammo.isOutOfAmmo ? 0 : ammo.reserveBullets
  const nextReloadValue = Math.max(
    0,
    Math.min(100, Math.round(ammo.reloadProgress * 100))
  )
  const [displayReloadValue, setDisplayReloadValue] = useState(nextReloadValue)
  const [showReloadBar, setShowReloadBar] = useState(ammo.isReloading)
  const [visibleFeedItems, setVisibleFeedItems] = useState<
    GameplayHudFeedItem[]
  >([])
  const feedTimeoutsRef = useRef<Map<string, number>>(new Map())
  const consumedFeedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (ammo.isReloading) {
      setDisplayReloadValue(nextReloadValue >= 97 ? 100 : nextReloadValue)
      setShowReloadBar(true)
      return
    }

    if (displayReloadValue > 0) {
      setDisplayReloadValue(100)

      const timeout = window.setTimeout(() => {
        setShowReloadBar(false)
        setDisplayReloadValue(0)
      }, 120)

      return () => {
        window.clearTimeout(timeout)
      }
    }

    setShowReloadBar(false)
  }, [ammo.isReloading, displayReloadValue, nextReloadValue])

  useEffect(() => {
    for (const nextItem of eventFeed.slice(0, 3)) {
      if (consumedFeedIdsRef.current.has(nextItem.id)) {
        continue
      }

      consumedFeedIdsRef.current.add(nextItem.id)

      setVisibleFeedItems((current) => {
        if (current.some((item) => item.id === nextItem.id)) {
          return current
        }

        return [nextItem, ...current].slice(0, 3)
      })

      if (feedTimeoutsRef.current.has(nextItem.id)) {
        continue
      }

      const timeout = window.setTimeout(() => {
        setVisibleFeedItems((current) =>
          current.filter((item) => item.id !== nextItem.id)
        )
        feedTimeoutsRef.current.delete(nextItem.id)
      }, 2500)

      feedTimeoutsRef.current.set(nextItem.id, timeout)
    }
  }, [eventFeed])

  useEffect(() => {
    return () => {
      for (const timeout of feedTimeoutsRef.current.values()) {
        window.clearTimeout(timeout)
      }

      feedTimeoutsRef.current.clear()
      consumedFeedIdsRef.current.clear()
    }
  }, [])

  return (
    <div className='pointer-events-none absolute inset-0 z-20 flex items-end justify-between px-4 py-5 text-white md:px-6'>
      <div className='pointer-events-none absolute top-4 left-4 space-y-3'>
        <GameplayMiniMap
          mapWidth={minimap.mapWidth}
          mapHeight={minimap.mapHeight}
          obstacles={minimap.obstacles}
          pickups={minimap.pickups}
          localPlayer={minimap.localPlayer}
        />

        <div className='grid gap-2'>
          {visibleFeedItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                'fade-in-0 slide-in-from-top-2 inline-flex w-fit animate-in rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-sm duration-200',
                item.tone === 'danger'
                  ? 'border-destructive/50 bg-destructive/5'
                  : 'border-border bg-card/45'
              )}
            >
              {item.title}
            </div>
          ))}
        </div>
      </div>

      <div className='flex w-full items-end justify-between'>
        <div className='min-w-0'>
          <p className='mb-3 text-muted-foreground text-xs'>you</p>
          <div className='grid gap-2'>
            <div className='grid grid-cols-[26px_120px_36px] items-center gap-3 md:grid-cols-[30px_170px_40px]'>
              <span className='text-[10px] text-muted-foreground uppercase tracking-[0.18em]'>
                HP
              </span>
              <div className='h-0.75 rounded-full bg-white/8'>
                <div
                  className='h-full rounded-full bg-primary'
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <span className='text-right font-medium text-sm'>
                {localStats.hp}
              </span>
            </div>
            <div className='grid grid-cols-[26px_120px_36px] items-center gap-3 md:grid-cols-[30px_170px_40px]'>
              <span className='text-[10px] text-muted-foreground uppercase tracking-[0.18em]'>
                ARM
              </span>
              <div className='h-0.75 rounded-full bg-white/8'>
                <Progress
                  value={shieldPercent}
                  className='h-full rounded-full [&_div]:bg-blue-400'
                />
              </div>
              <span className='text-right font-medium text-sm'>
                {localStats.shield}
              </span>
            </div>
          </div>
        </div>

        <div className='flex flex-col items-center justify-center self-center pb-1'>
          <p className='mb-1 text-[10px] text-white/35 uppercase tracking-[0.35em]'>
            Kills
          </p>
          <p className='font-light text-5xl leading-none'>{localStats.kills}</p>
          <div className='mt-4 w-28 text-center'>
            <p className='mb-1 text-[10px] text-white/35 uppercase tracking-[0.18em]'>
              {ability.label}
            </p>
            <div className='h-0.75 rounded-full bg-white/8'>
              <Progress
                value={Math.max(0, Math.min(100, ability.progress * 100))}
                className='h-full rounded-full [&_div]:bg-yellow-400'
              />
            </div>
            <p className='mt-1 text-[10px] text-white/45 uppercase tracking-[0.18em]'>
              {ability.isReady ? 'Ready · Q' : `${ability.remainingSeconds}s`}
            </p>
          </div>
        </div>

        <div className='flex min-w-0 flex-col items-end gap-2 text-right'>
          <div>
            <p className='mb-1 text-[10px] text-white/35 uppercase tracking-[0.18em]'>
              {ammo.weaponLabel}
            </p>
            <div className='flex items-end gap-2'>
              <span className='font-light text-5xl leading-none'>
                {displayedMagazineAmmo}
              </span>
              <span className='pb-1 text-lg text-white/35'>
                / {displayedReserveAmmo}
              </span>
            </div>
          </div>
          <div className='flex flex-wrap justify-end gap-0.75'>
            {Array.from(
              { length: ammo.magazineSize },
              (_, slot) => slot + 1
            ).map((slot) => {
              const isSpent = slot > displayedMagazineAmmo

              return (
                <span
                  key={`bullet-slot-${slot}`}
                  className={[
                    'block h-3 w-1.5 rounded-[1px]',
                    isSpent ? 'bg-white/12' : 'bg-primary'
                  ].join(' ')}
                />
              )
            })}
          </div>
          <div className='min-h-4 text-[10px] text-white/45 uppercase tracking-[0.18em]'>
            {showReloadBar
              ? `Reloading ${displayReloadValue}%`
              : ammo.isOutOfAmmo
                ? 'Out of ammo'
                : ammo.needsReload
                  ? `Reserve ${ammo.reserveBullets} · ${ammo.reserveMagazines} mags`
                  : `Game ${gameIdShort} · ${ammo.reserveMagazines} mags`}
          </div>
          {showReloadBar ? (
            <div className='h-0.75 w-36 rounded-full bg-white/8'>
              <Progress
                value={displayReloadValue}
                className='h-full rounded-full [&_div]:bg-primary'
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function GameplayLeaderboardPanel({
  entries,
  emptyLabel
}: {
  entries: LeaderboardRow[]
  emptyLabel: string
}) {
  return (
    <div className='absolute top-3 right-3 w-56 rounded-md bg-black/60 px-3 py-2 text-xs backdrop-blur-sm'>
      <p className='mb-2 font-semibold uppercase tracking-[0.14em]'>
        Leaderboard Top 5
      </p>
      <div className='space-y-1 text-foreground/80'>
        {entries.length === 0 ? (
          <p className='text-muted-foreground'>{emptyLabel}</p>
        ) : (
          entries.map((entry) => (
            <p key={entry.playerId}>
              #{entry.rank} {entry.playerName} · K {entry.kills}
            </p>
          ))
        )}
      </div>
    </div>
  )
}

function GameplayDeathOverlay({ onRespawn }: { onRespawn: () => void }) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    overlayRef.current?.animate(
      [
        { opacity: 0, backdropFilter: 'blur(0px)' },
        { opacity: 1, backdropFilter: 'blur(6px)' }
      ],
      {
        duration: 180,
        easing: 'ease-out',
        fill: 'forwards'
      }
    )

    panelRef.current?.animate(
      [
        {
          opacity: 0,
          transform: 'translateY(10px) scale(0.98)',
          filter: 'blur(8px)'
        },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' }
      ],
      {
        duration: 240,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      }
    )
  }, [])

  return (
    <div
      ref={overlayRef}
      className='absolute inset-0 z-30 grid place-items-center bg-background/50 opacity-0'
    >
      <Card
        ref={panelRef}
        className='w-full max-w-md gap-5 overflow-hidden border-border p-6 opacity-0 backdrop-blur-md'
      >
        <CardHeader className='space-y-2 p-0'>
          <Badge variant='outline'>eliminated</Badge>
          <CardTitle className='text-3xl text-white'>You Died</CardTitle>
          <p className='text-sm text-white/45 uppercase tracking-[0.14em]'>
            Re-enter the match
          </p>
        </CardHeader>
        <CardContent className='grid gap-3 p-0'>
          <Button
            className='h-12 cursor-pointer rounded-xl uppercase hover:bg-primary/80'
            size='lg'
            onClick={onRespawn}
          >
            Respawn
          </Button>

          <Eyebrow>• • •</Eyebrow>

          <p className='pt-1 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-[0.22em]'>
            Respawn to return to the game — your arsenal will be fully restored.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export { GameplayDeathOverlay, GameplayLeaderboardPanel, GameplayMapInfoPanel }
export type {
  GameplayHudAbility,
  GameplayHudAmmo,
  GameplayHudFeedItem,
  GameplayHudLocalStats,
  GameplayHudMinimapObstacle,
  GameplayHudMinimapPickup,
  GameplayHudMinimapPlayer,
  LeaderboardRow
}
