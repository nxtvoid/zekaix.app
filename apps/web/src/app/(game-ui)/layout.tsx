import { SocketProvider } from '@/components/socket-provider'
import { getCurrentUserServer } from '@zekaix/auth/server'

export default async function Layout({
  auth,
  game
}: {
  auth: React.ReactNode
  game: React.ReactNode
}) {
  const user = await getCurrentUserServer()

  if (!user) {
    return <>{auth}</>
  }

  return <SocketProvider>{game}</SocketProvider>
}
