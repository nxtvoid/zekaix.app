import type { DefaultEventsMap, Server, Socket } from 'socket.io'

export interface AuthenticatedSocketData {
  playerId: string
  playerName: string
}

export type SocketIOServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  AuthenticatedSocketData
>

export type SocketIOSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  AuthenticatedSocketData
>
