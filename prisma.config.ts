import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// `neon link` / `neon deploy` write the branch's variables to .env.local.
config({ path: ['.env.local', '.env'], quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrations need a direct connection; the app uses the pooled DATABASE_URL.
    url: env('DATABASE_URL_UNPOOLED'),
  },
})
