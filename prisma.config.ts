import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// `neon link` / `neon deploy` write the branch's variables to .env.local.
config({ path: ['.env.local', '.env'], quiet: true })

// Migrations need a direct connection; the app uses the pooled DATABASE_URL.
// Read without `env()`: `env()` throws when the variable is unset, which fails
// `prisma generate` (the postinstall) in builds that have no database
// variables. `generate` doesn't connect; `migrate` and `db` commands still
// stop with a clear error when the URL is missing.
const url = process.env['DATABASE_URL_UNPOOLED']

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: url === undefined ? {} : { url },
})
