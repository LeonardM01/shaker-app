# 0001: Prisma 7 as the ORM

- Status: accepted
- Date: 2026-10-08

## Context

The app runs on TanStack Start on Vercel, with Neon Postgres, Neon Auth and Neon Object Storage on the same Neon branch. We need typed queries and committed migrations. Neon Auth owns the `neon_auth` schema in our database, so our tooling must leave it alone.

## Decision

Use Prisma ORM 7 with the Neon serverless driver adapter (`@prisma/adapter-neon`), following Neon's Prisma guide (https://neon.com/docs/guides/prisma).

- The app connects through the pooled `DATABASE_URL`. The Prisma CLI (migrations) uses `DATABASE_URL_UNPOOLED`, configured in `prisma.config.ts`.
- The `prisma-client` generator writes the client to `src/generated/prisma` (gitignored, regenerated on `pnpm install`).
- Prisma manages the `public` schema only. User references are plain string columns holding `neon_auth.user.id`, with no cross-schema foreign key, so Prisma never needs to see `neon_auth`.
- `prisma`, `@prisma/client` and `@prisma/adapter-neon` are pinned to the same version (7.10.0). On 2026-10-08 the `prisma` package's `latest` npm tag points to a Prisma 8 prerelease, so it must not be installed unpinned.

## Consequences

- Prisma 7 has no Rust query engine, so it bundles cleanly into Vercel functions.
- Migrations are generated with `prisma migrate dev` on a dev branch and applied with `prisma migrate deploy`. `db push` is not used against shared branches.
- Without a foreign key to `neon_auth.user`, deleting a user doesn't cascade. Clean up user-owned rows when we handle account deletion (for example from a Neon Auth webhook).
- Drizzle was the alternative. It's lighter and closer to SQL, but we chose Prisma, which is a supported, documented path on Neon. The Drizzle lines in `docs/research/eslint-prettier-tanstack-start.md` don't apply.
