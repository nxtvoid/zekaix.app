import { db } from '@zekaix/db'
import { logger } from '@zekaix/utils/logger'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import {
  deviceAuthorization,
  lastLoginMethod,
  multiSession
} from 'better-auth/plugins'

export const auth = betterAuth({
  appName: 'zekaix',
  database: prismaAdapter(db, {
    provider: 'postgresql'
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 3 * 60 // 3 mins
    }
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: 'database',
    customRules: {
      '/get-session': false
    }
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string
    }
  },
  account: {
    accountLinking: {
      trustedProviders: ['github']
    }
  },
  plugins: [
    deviceAuthorization({
      expiresIn: '3min',
      interval: '5s'
    }),
    multiSession(),
    lastLoginMethod(),
    nextCookies()
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          logger
            .child({ id: user.id, email: user.email })
            .info('New user created')
        }
      }
    }
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: 'zekaix.app'
    }
  },
  trustedOrigins: ['https://api.zekaix.app']
})
