'use client'

import { useState } from 'react'
import { signIn } from '@zekaix/auth/client'
import { Button } from '@zekaix/ui/button'
import { Eyebrow } from '@zekaix/ui/eyebrow'
import { Loader2Icon } from 'lucide-react'
import { GithubIcon, GoogleIcon } from '@zekaix/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@zekaix/ui/card'

export default function Page() {
  const [state, setState] = useState({
    loggingIn: false,
    provider: null as 'github' | 'google' | null
  })

  return (
    <main className='flex h-full flex-1 flex-col items-center justify-center px-6 py-20'>
      <Eyebrow className='mb-6'>browser-based multiplayer</Eyebrow>
      <h1 className='mb-7 text-center font-bold text-[clamp(56px,10vw,112px)] text-foreground leading-[0.92] tracking-tight'>
        frag
        <br />
        <span className='text-primary'>everyone.</span>
      </h1>
      <p className='mb-12 max-w-96 text-center text-muted-foreground text-sm leading-[1.6]'>
        Fast-paced top-down shooter. Jump in, frag everyone, respawn. No install
        required.
      </p>
      <Card className='w-full max-w-md gap-1 p-6'>
        <CardHeader className='p-0'>
          <CardTitle className='font-mono text-muted-foreground text-xs'>
            continue with
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 p-0'>
          <Button
            className='w-full'
            onClick={async () => {
              await signIn.social({
                provider: 'github',
                callbackURL: '/',
                fetchOptions: {
                  onRequest() {
                    setState({
                      loggingIn: true,
                      provider: 'github'
                    })
                  },
                  onError() {
                    setState({
                      loggingIn: false,
                      provider: null
                    })
                  }
                }
              })
            }}
            disabled={state.loggingIn}
          >
            {state.loggingIn && state.provider === 'github' ? (
              <Loader2Icon className='size-4 animate-spin' />
            ) : (
              <GithubIcon className='size-4' />
            )}
            Continue with GitHub
          </Button>

          <Button className='w-full' disabled>
            {state.loggingIn && state.provider === 'google' ? (
              <Loader2Icon className='size-4 animate-spin' />
            ) : (
              <GoogleIcon className='size-4' />
            )}
            Continue with Google (soon)
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
