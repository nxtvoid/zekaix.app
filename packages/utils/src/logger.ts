import pino, { type Logger } from 'pino'

export const logger: Logger =
  process.env.NODE_ENV === 'production'
    ? pino({ name: 'PROD-ZEKAIX', level: 'info' })
    : pino({
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true
          }
        },
        level: 'debug'
      })

export type { Logger }
