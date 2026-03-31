'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  isFindingMatch: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isFindingMatch: false
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isFindingMatch, setIsFindingMatch] = useState(false)

  const serverUrl = useMemo(
    () => process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001',
    []
  )

  useEffect(() => {
    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      upgrade: true
    })

    newSocket.on('connect', () => setIsConnected(true))
    newSocket.on('disconnect', () => {
      setIsConnected(false)
      setIsFindingMatch(false)
    })

    newSocket.on('matchmaking:searching', () => setIsFindingMatch(true))
    newSocket.on('matchmaking:found', () => setIsFindingMatch(false))
    newSocket.on('error:matchmaking', () => setIsFindingMatch(false))
    newSocket.on('error:join', () => setIsFindingMatch(false))

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [serverUrl])

  return (
    <SocketContext.Provider value={{ socket, isConnected, isFindingMatch }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
