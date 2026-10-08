# Shaker

Shaker is a trust and price layer for Croatian second-hand marketplaces: Njuškalo, Facebook Marketplace, Index oglasi and Vinted. For any listing ("oglas") it answers the questions a buyer asks before paying: is the price fair, who is the seller, what do other people say, can I haggle, and does this message look like a scam. Sellers get a fair side too: reviews they can reply to and suggestions for their own listings.

Read `PRODUCT.md` for users, positioning and brand commitments, and `DESIGN.md` for the design system (tokens, components, rules). Both are the source of truth; don't restate or contradict them in code.

## Surfaces

| Surface | What it is | Status |
| --- | --- | --- |
| Landing page | Marketing page. One job: install the Chrome extension ("Dodaj u Chrome — besplatno"). Structure is the six buyer questions, each answered by the real Shaker panel on a demo listing. | Designed in Figma, page "Landing" |
| Web app | Paste a listing link, watch checks run, read the report (verdict, price range, seller, reviews, questions to ask, suggested offer). Tracked listings form a watchlist. Sellers get "Moji oglasi". | Designed in Figma, page "App" |
| Browser extension | Overlay badge on listing pages plus a side panel. | Designed; stack not decided |

Figma: https://www.figma.com/design/yYrUqxBmK1rH5djf9hvIF4/SHAKER (landing page node `36-762`). Direction contracts for each surface live in `.impeccable/surfaces/`. Mobile web is supported for the landing page and app; the extension is desktop only.

### Product rules that code must respect

- **Croatian first.** All UI copy is Croatian. English comes later through i18n, so keep strings out of logic and in one place per feature.
- **No data is unknown, not suspicious.** A listing or seller without data renders gray/neutral. Risk red appears only next to the evidence that triggered it.
- **One meaning per verdict color.** Muted Olive is for the primary action only. Don't reuse verdict colors decoratively.
- **Demo listings are labelled examples.** No invented user counts, totals or testimonials anywhere.
- **Fair to both sides.** Never word a seller as guilty without evidence; sellers can always reply.

## Tech stack

| Concern | Choice |
| --- | --- |
| App framework | [TanStack Start](https://tanstack.com/start) (React, TanStack Router, server functions), TypeScript |
| Hosting | Vercel (TanStack Start builds through the `nitro/vite` plugin) |
| Database | Neon serverless Postgres |
| Auth | Clerk (`@clerk/tanstack-react-start`), only where an account is actually needed |
| Lint / format | ESLint + Prettier, see `docs/research/eslint-prettier-tanstack-start.md` |

The landing page and the web app are both TanStack Start. Whether they ship as one app (landing as public, prerendered routes) or two is not decided yet; record that decision as an ADR in `docs/adr/` when it's made. Nothing is scaffolded yet, so update this file with the real commands (dev, build, lint, typecheck, test) once `package.json` exists.

## Coding standards

**Read `CODING_STANDARDS.md` before writing or reviewing code.** It holds the TypeScript, React, TanStack Start, Neon, Clerk and Vercel rules for this repo. The `/code-review` skill checks changes against it.

## Repo map

- `PRODUCT.md`: product, users, brand commitments
- `DESIGN.md`: design system; `.impeccable/design.json` is its machine-readable sidecar
- `CODING_STANDARDS.md`: how code in this repo is written
- `docs/research/`: research notes with cited primary sources
- `docs/adr/`: architecture decisions (created when the first one is made)
- `docs/agents/`: how agent skills use the issue tracker, labels and domain docs

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on LeonardM01/shaker-app, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
