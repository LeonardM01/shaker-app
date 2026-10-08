---
version: 1
slug: "figma-app"
primary_target: "figma/app"
related_targets: []
---

# Web app (Figma page "App", 1440 desktop + 390 mobile)

Scope: the Shaker web app. Mode: Operate. User: a Croatian buyer (or seller) who has a listing link from Njuškalo, Facebook Marketplace or Index oglasi and wants to know, fast, whether it is a good buy, what is missing, whether it smells like a scam, who the seller is, and what to ask. Sellers paste their own listing in "Moji oglasi" and get improvements; buyers never see that view. Task frequency: occasional, bursty (a few listings in one evening while shopping). Constraints: Croatian copy; demo listings are labelled examples; "no data" is gray, red only beside evidence.

Screens: Početna (paste + watchlist), Provjera u tijeku (per-check progress), Izvještaj oglasa (buyer report), Moji oglasi (seller improvements), states board (invalid link, unsupported site, removed listing, empty watchlist, partial failure). Mobile: Početna, Izvještaj, Moji oglasi.

## Direction contract

THESIS: Every pasted link becomes a living row in your watchlist, like a Wise transaction: verdict, price, and what changed since you looked. The report is one calm page that answers in the order a buyer worries. It refuses the AI-chat wrapper and the dashboard of score dials.
OWN-WORLD: DESIGN.md as-is, shaped by Wise web: white ground, left text sidebar with the active item on a neutral pill, flat `bg/neutral` list rows at 16px radius, big Bricolage numbers, olive pills only on the one action, verdict colors with one meaning, sand for the haggle helper.
STORY: "I paste a link and in ten seconds I know if I should buy, what to ask, and what to offer." User pastes, watches checks complete, reads the verdict, copies the questions or the offer, and the listing stays tracked.
FIRST VIEWPORT: Sidebar (240) left. Main column 720 wide: H1 "Provjeri oglas" (Heading Large), a 56px paste field with link icon and olive "Provjeri" pill inside, three platform chips beneath. Under it a Wise-yellow-style update banner (price drop on a tracked listing), then "Praćeni oglasi" rows. Signature move: each row's verdict badge plus a gold "−40 € od zadnje provjere" delta, the watchlist as a ledger of verdicts.
FORM: Watchlist home, position 7 on the ordered list, dealt lead. Seed key: e125a6f8.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
