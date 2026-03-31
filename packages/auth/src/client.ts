import { createAuthClient } from 'better-auth/react'
import {
  deviceAuthorizationClient,
  lastLoginMethodClient,
  multiSessionClient
} from 'better-auth/client/plugins'

export const client: ReturnType<typeof createAuthClient> = createAuthClient({
  plugins: [
    multiSessionClient(),
    deviceAuthorizationClient(),
    lastLoginMethodClient()
  ]
})

export const { signUp, signIn, signOut, useSession } = client

export { useCurrentClientUser } from './client/user'
