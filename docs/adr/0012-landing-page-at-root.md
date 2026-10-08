# 0012: The landing page is served at `/` from the app

- Status: accepted
- Date: 2026-10-08

## Context

The static Vrijedi.Ly landing page (plain HTML with inline styles) was added under `public/landing/` and served at `/landing`, while `/` still showed the TanStack Start scaffold placeholder. The landing page is the front door, so it belongs at `/`. Whether the landing page stays in the app or splits out was still open.

## Decision

- The landing page stays in the app for now. Its HTML lives in `src/features/landing/landing.html` and the `/` route serves it as-is through a server handler (`src/routes/index.tsx`), not as a React page. The response carries `s-maxage` so the CDN still caches it like the static file it was.
- `/landing` (and `/landing/`) permanently redirect (301) to `/`, so links to the old address keep working.
- Both routes also have a `beforeLoad` that turns a client-side router navigation into a full page load, because there is no React component to render.
- Its icon stays a static file at `/landing/icon.svg`.

## Consequences

- One deployment and one domain: the "Dodaj u Chrome" buttons link to `/app` on the same origin, so they work on preview deployments and a custom domain.
- The page ships byte-for-byte as designed, without hydration or a client bundle.
- `landing.html` is a finished static artefact. The React-side rules in `CODING_STANDARDS.md` (tokens instead of hex, copy modules, skip link) don't apply to it until it is rebuilt.
- Rebuilding the page in React, or splitting it into its own app, means revisiting this decision.
