import { db } from '@zekaix/db'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import {
  multiSession,
  lastLoginMethod,
  deviceAuthorization
} from 'better-auth/plugins'

export const authNode = betterAuth({
  appName: 'zekaix',
  database: prismaAdapter(db, { provider: 'postgresql' }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 3 * 60
    }
  },
  plugins: [
    deviceAuthorization({ expiresIn: '3min', interval: '5s' }),
    multiSession(),
    lastLoginMethod()
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: 'zekaix.app'
    }
  },
  trustedOrigins: ['https://api.zekaix.app']
})
