'use client'

import { toast } from 'sonner'
import { Button } from '@zekaix/ui/button'
import { BugIcon } from 'lucide-react'
import { Skeleton } from '@zekaix/ui/skeleton'
import { useRouter } from 'next/navigation'
import { signOut, useCurrentClientUser } from '@zekaix/auth/client'
import { Avatar, AvatarFallback, AvatarImage } from '@zekaix/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@zekaix/ui/dropdown-menu'

const PlayerDropdown = () => {
  const { user, isPending } = useCurrentClientUser()
  const router = useRouter()

  if (isPending) {
    return <Skeleton className='size-7 rounded-md border border-border' />
  }

  if (!user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className='cursor-pointer overflow-hidden'
          variant='outline'
          size='icon-sm'
        >
          <Avatar className='size-full rounded-none'>
            <AvatarImage
              className='size-full rounded-none'
              src={user.image || ''}
            />
            <AvatarFallback className='size-full rounded-none'>
              {user.name ? user.name[0] : 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='center' className='w-46'>
        <DropdownMenuGroup>
          <div className='flex flex-col items-center justify-center gap-1 overflow-hidden rounded-md bg-border/30 p-2 text-center'>
            <Avatar className='size-10 rounded-md'>
              <AvatarImage
                className='size-10 rounded-md'
                src={user.image || ''}
              />
              <AvatarFallback className='size-10 rounded-md'>
                {user.name ? user.name[0] : 'U'}
              </AvatarFallback>
            </Avatar>
            <span className='font-medium text-sm'>{user.name}</span>
            <span className='w-full truncate text-muted-foreground text-xs'>
              {user.email}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem
            variant='destructive'
            onClick={async () => {
              await signOut({
                fetchOptions: {
                  onRequest() {
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
                  }
                }
              })
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className='text-muted-foreground' disabled>
            <BugIcon />
            Report a bug
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { PlayerDropdown }
