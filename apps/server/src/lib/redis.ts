import { createClient, type RedisClientType } from 'redis'

export const redisCLI: RedisClientType = createClient({
  url: process.env.REDIS_URL!
})
