'use client'

import { useEffect, useRef } from 'react'
import { Badge } from './badge'
import { Button } from './button'
import { Eyebrow } from './eyebrow'
import { Card, CardContent, CardHeader, CardTitle } from './card'

function GamePauseMenu({
  isSigningOut = false,
  onResume,
  onSignOut
}: {
  isSigningOut: boolean
  onResume: () => void
  onSignOut: () => void
}) {
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
          transform: 'translateY(10px) scale(0.985)',
          filter: 'blur(8px)'
        },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' }
      ],
      {
        duration: 220,
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
          <Badge variant='outline'>paused</Badge>
          <CardTitle className='text-3xl text-white'>Session Paused</CardTitle>
          <p className='text-sm text-white/45 uppercase tracking-[0.14em]'>
            Select your next action
          </p>
        </CardHeader>
        <CardContent className='grid gap-3 p-0'>
          <Button
            className='h-12 cursor-pointer rounded-xl uppercase hover:bg-primary/80'
            size='lg'
            onClick={onResume}
          >
            Resume Match
          </Button>
          <Eyebrow>• • •</Eyebrow>
          <Button
            className='h-12 cursor-pointer rounded-xl uppercase'
            variant='destructive'
            size='lg'
            onClick={onSignOut}
            disabled={isSigningOut}
          >
            Sign Out
          </Button>
          <p className='pt-1 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-[0.22em]'>
            Press ESC to close
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export { GamePauseMenu }
