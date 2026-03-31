import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'src/prisma',
  migrations: {
    path: 'src/prisma/migrations'
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://u:p@localhost:5432/db'
  }
})
