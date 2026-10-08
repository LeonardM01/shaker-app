# Coding standards

Rules for every change in this repo, whether a person or an agent writes it. Stack: TanStack Start (React + TanStack Router), TypeScript, Neon Postgres, Clerk, Vercel. If a rule here conflicts with what a library's current docs say, the docs win: fix the code, then fix this file.

Lint and format configuration (ESLint flat config, Prettier, tsconfig strictness) is specified in `docs/research/eslint-prettier-tanstack-start.md`. The linter enforces what it can; this file covers what it can't.

## Ground rules

- **Check the docs before writing framework code.** TanStack Start, Router and Clerk APIs change between releases. Look up the installed version's docs (context7 or the official site) instead of writing from memory, and match the version in `package.json`.
- **Small, finished changes.** One concern per change. No commented-out code, no `TODO` without an issue link, no unused exports.
- **Green before done.** `typecheck`, `lint` and tests pass before a change counts as finished. Never silence a check to get there: no `// @ts-ignore`, no `eslint-disable` without a comment saying why, no `any`.
- **Follow the surrounding code.** Match the naming, structure and comment density of nearby files before reaching for a new pattern.

## TypeScript

- `strict` mode plus the extra flags in the research note. Types are the first line of tests.
- Prefer `type` aliases and discriminated unions for state (`{ status: 'loading' } | { status: 'ready'; report: Report }`) over boolean flags. Handle every case; the linter checks `switch` exhaustiveness.
- No `any`. Use `unknown` at boundaries and narrow it with a schema.
- Validate all external data at the boundary with Zod: request input, form data, URL search params, env vars, scraped marketplace data, third-party API responses. Infer the TS type from the schema (`z.infer`) instead of writing it twice.
- Use `import type` for type-only imports.
- Never leave a promise floating. `await` it, return it, or mark a deliberate fire-and-forget with `void` and a comment.
- Name things in English (code, files, DB columns). Croatian is for user-facing copy only. Use the domain terms from `GLOSSARY.md` once it exists.

## React

- Function components and hooks only. One exported component per file; small private helpers can live alongside it.
- Follow the [Rules of React](https://react.dev/reference/rules): components and hooks are pure, hooks are called at the top level, props and state are never mutated.
- **You probably don't need an effect.** Derive values during render instead of syncing them into state. Fetch data in route loaders or TanStack Query, not in `useEffect`. Handle user actions in event handlers. Reserve effects for synchronising with something outside React (DOM APIs, subscriptions).
- Keep state as local as possible and lift it only when two components need it. Server state lives in loaders and TanStack Query, URL state in typed search params, and only true client UI state in `useState`.
- Don't add `useMemo`/`useCallback`/`memo` by default; add them when a measurement or a referential-equality requirement calls for it.
- Stable, meaningful `key`s from data IDs, never array indexes for lists that can reorder.
- Composition over configuration: prefer `children` and small components over one component with many boolean props.

## TanStack Start and Router

- **File-based routes** under `src/routes/`. Never edit the generated route tree (`routeTree.gen.ts`).
- **Loaders are isomorphic**: they run on the server for the first request and in the browser on client navigation. Never read secrets, env vars or the database directly in a loader. Call a server function instead.
- **Server functions (`createServerFn`) are the only path from UI to server-side work.** Each one:
  - validates its input with a Zod schema in the validator step (check the installed version for the method name),
  - checks auth itself if it touches user data (see Clerk below); routes protecting it is not enough, since server functions are callable endpoints,
  - returns plain serialisable data, never DB rows with columns the client shouldn't see,
  - uses `method: 'POST'` for anything that writes.
- Use `createServerOnlyFn` (or `.server.ts` modules) for code that must never be bundled for the client, such as DB clients and secret-bearing helpers.
- Use server routes (`server.handlers` on a file route) only for things that need a real HTTP endpoint: webhooks (Clerk, payments), the extension's API, health checks.
- **Search params are state.** Validate them with `validateSearch` and a Zod schema; read them with `Route.useSearch()`.
- Use `<Link>` and `useNavigate` with typed `to` and `params`, never string-built URLs.
- Every route that loads data defines `pendingComponent`, `errorComponent` and, where relevant, `notFoundComponent`. Throw `notFound()` / `redirect()` from loaders and server functions; don't return error flags.
- Shared cross-cutting server logic (auth context, logging) goes in middleware (`createMiddleware`), registered in `src/start.ts`.

## Data fetching (TanStack Query)

- Define each query once as a `queryOptions()` factory next to its server function. Use the same factory in the loader (`ensureQueryData`) and in the component (`useSuspenseQuery`) so SSR and client share the cache.
- Query keys are arrays that start with the entity name and include every input: `['listing', listingId]`.
- Mutations call a server function, then invalidate the affected query keys. No manual cache surgery unless it's an intentional optimistic update.

## Database (Neon Postgres)

- Connect with Neon's serverless driver (`@neondatabase/serverless`). Use the HTTP query function for one-shot queries and a WebSocket `Pool`/`Client` only where you need interactive transactions.
- Use the **pooled** connection string (`-pooler` host) from Vercel functions. Read it from `DATABASE_URL` through the validated env module; never hardcode it.
- Every query is parameterised. Never build SQL by string concatenation with user or scraped input.
- Schema changes go through migration files committed to the repo. No ad-hoc DDL against shared branches.
- Use Neon branches for preview deployments and for testing migrations. Never run a migration against production by hand.
- Every `UPDATE`/`DELETE` has a `WHERE` clause. Reads that serve a list are paginated.
- Store money as integer cents (`integer`/`bigint`), never floats. Store timestamps as `timestamptz` in UTC; format for `hr-HR` only at render time.
- If an ORM or query builder is added, record the choice as an ADR and add its rules here.

## Auth (Clerk)

- Auth is opt-in per feature. Public pages (landing, a shared report) must work signed out.
- `clerkMiddleware()` is registered once in `src/start.ts` under `requestMiddleware`.
- On the server, get the user with `auth()` from `@clerk/tanstack-react-start/server` inside the server function or server route that needs it. Check `isAuthenticated` and scope every query by `userId`. The client never sends a user ID the server trusts.
- Route guards (`beforeLoad` + `redirect`) are for UX. The authorisation check that matters lives in the server function.
- Verify Clerk webhooks with their signature before acting on them.
- Store only the Clerk `userId` as the foreign key in our DB; don't copy profile data we don't need.

## Environment and secrets (Vercel)

- All env vars are read through one module that parses them with Zod at startup and fails fast on missing values. Nothing else reads `process.env` / `import.meta.env` directly.
- Only variables prefixed `VITE_` reach the browser bundle. Secrets (`CLERK_SECRET_KEY`, `DATABASE_URL`, scraping credentials) never carry that prefix.
- Configure values per Vercel environment (Development, Preview, Production). Never commit `.env*` files other than a `.env.example` with placeholder values.
- Long or heavy work (scraping a batch of comparable listings) doesn't belong in a request handler that a user waits on. Design it to run as a background or scheduled job, and keep request handlers within Vercel function limits.

## Styling and design system

- `DESIGN.md` is the source of truth. Use its tokens (colors, type ramp, radii, shadows) by name. No raw hex values, ad-hoc font sizes or one-off shadows in components.
- Reuse the design-system components (Button, Verdict Badge, Listing Chip, Price Range Bar, Review Card, Seller Card…) before building a variant. A new variant goes into the design system first.
- Icons come from Lucide.
- Host-page mocks (`Host/…` in Figma) are the one deliberate exception to token use; they imitate the marketplace's own UI.

## Accessibility

- Semantic HTML first: real `<button>`, `<a>`, `<label>`, headings in order, landmarks. ARIA only to fill gaps.
- Every interactive control has a hit area of at least 44×44px, a visible `:focus-visible` state and works by keyboard.
- Text meets WCAG AA contrast against its actual background. Never use a brand color as body text on white (see DESIGN.md).
- Color is never the only signal: verdicts pair color with an icon and a word.
- Respect `prefers-reduced-motion`. Images have meaningful `alt` text in Croatian, or `alt=""` when decorative.
- Pages include a skip link.

## Copy and i18n

- User-facing strings are Croatian and live in one module per feature (ready for an i18n library), not inline in logic.
- Format numbers, prices and dates with `Intl` and the `hr-HR` locale (`640 €`, `4,6`). Don't hand-format.
- Copy follows PRODUCT.md and the surface briefs: plain words, one idea per line, no invented social proof.

## Errors and logging

- Expected failures (invalid link, unsupported marketplace, removed listing, partial check failure) are modelled as typed results and rendered as designed states. Exceptions are for the unexpected.
- Never show raw error messages or stack traces to users. Log them server-side with enough context to debug (route, user ID, listing URL), never with secrets or full tokens.
- A failed check degrades that one section to "no data", not the whole report.

## Scraping and external data

- Treat every scraped field as untrusted input: validate with Zod, cap lengths, and never render it as HTML.
- Respect each marketplace's rate limits and cache results; don't re-scrape what we fetched recently.
- Keep each marketplace adapter (Njuškalo, Facebook Marketplace, Index oglasi, Vinted) behind one shared interface so the rest of the app doesn't know which site a listing came from.

## Testing

- Unit-test pure logic (price analysis, scam-pattern checks, parsers) with Vitest. These are the parts most likely to be wrong in quiet ways.
- Test components through what the user sees (Testing Library queries by role and label), not implementation details.
- Each marketplace parser gets fixture-based tests from saved real pages, so site changes break tests and not production.
- A bug fix comes with a test that fails without it.

## Files and naming

- `kebab-case` file names; `PascalCase` component names; `camelCase` functions and variables; `SCREAMING_SNAKE_CASE` only for env var names.
- Group by feature (`src/features/listing-report/…`) rather than by file type. Shared UI primitives live in `src/components/ui/`.
- Use named exports, no default exports. Route files export `const Route = createFileRoute(...)` as TanStack Router expects.
- Use path aliases (`~/` or `@/`, whichever the scaffold sets up) instead of deep `../../..` imports.

## Git

- Branch off `main`; never commit directly to it.
- Commit messages are imperative and specific ("Add seller history check to listing report"). Reference the GitHub issue when there is one.
- Don't commit generated output, secrets or `.env` files.
