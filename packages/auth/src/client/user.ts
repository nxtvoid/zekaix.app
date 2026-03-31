'use client'

import type { User } from '../types'
import { useSession } from '../client'

type UseCurrentClientUser = {
  user: User | null
  isPending: boolean
}

export const useCurrentClientUser = (): UseCurrentClientUser => {
  const { data, error, isPending } = useSession()
  if (error) return { user: null, isPending: false }

  return {
    user: (data?.user as User) || null,
    isPending
  }
}
