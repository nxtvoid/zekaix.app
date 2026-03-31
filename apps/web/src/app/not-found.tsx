'use client'

import { Button } from '@zekaix/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className='flex h-full flex-1 flex-col items-center justify-center gap-20 px-6 py-20 text-center'>
      <div>
        <h1 className='font-bold font-mono text-9xl text-muted-foreground tracking-tight'>
          404
        </h1>
        <p className='text-center text-muted-foreground text-sm leading-6'>
          This page does not exist.
        </p>
      </div>

      <Button asChild>
        <Link href='/'>Go back</Link>
      </Button>
    </main>
  )
}
