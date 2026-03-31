import type { User } from '../types'
import { auth } from '../auth'
import { headers } from 'next/headers'

export const getCurrentUserServer = async (): Promise<User | null> => {
  const data = await auth.api.getSession({
    headers: await headers()
  })

  return (data?.user as User) || null
}
