# 0012: The landing page is served at `/` from the app

- Status: accepted
- Date: 2026-10-08

## Context

The static Vrijedi.Ly landing page (plain HTML with inline styles) was added under `public/landing/` and served at `/landing`, while `/` still showed the TanStack Start scaffold placeholder. The landing page is the front door, so it belongs at `/`. Whether the landing page stays in the app or splits out was still open.

## Decision

- The landing page stays in the app for now. Its HTML lives in `src/features/landing/landing.html` and the `/` route serves it as-is through a server handler (`src/routes/index.tsx`), not as a React page.
- `/landing` (and `/landing/`) permanently redirect (301) to `/`, so links to the old address keep working.
- Its icon stays a static file at `/landing/icon.svg`.

## Consequences

- One deployment and one domain: the "Dodaj u Chrome" buttons link to `/app` on the same origin.
- The page ships byte-for-byte as designed, without hydration or a client bundle.
- It is not a client-side route. Link to it with a plain `href="/"` (full page load), never a router `<Link to="/">`, which would render an empty page.
- Rebuilding the page in React, or splitting it into its own app, means revisiting this decision.
