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

## Documentation

Pass: documenter, 2026-10-08. Ordinary extension of the incumbent Shaker system, not a new world. **DESIGN.md, `.impeccable/design.json` and PRODUCT.md were not modified.** Everything under "Candidate DS additions" waits for user approval and has not been applied.

### Evidence checked
- `reference/document.md` (format spec), `DESIGN.md` (frontmatter + body), `.impeccable/design.json`, `PRODUCT.md` (platform line: responsive web, 1440 + 390), this surface's direction contract.
- Final captures in `.impeccable/review/app/`: desktop-home, desktop-report, desktop-loading, desktop-states, mobile-home, mobile-report (sampled visually). desktop-seller and mobile-seller were not opened on this pass.
- Build facts reported by the builder: every Shaker fill, stroke, radius and gap is bound to DS variables (`color/bg/*`, `text/*`, `border/*`, `icon/*`, `spacing/*`, `radius/*`). All text uses DS text styles. Components are DS instances (Button, Verdict Badge, Tag, Rating, Avatar, Alert, Price Range Bar, Review Card, Seller Card, Logo, Icons).
- `.impeccable/assets/app/PROVENANCE.md`: six Wikimedia Commons demo photos with their licences (CC0 / CC BY / CC BY-SA). Two later text-only edits are not in the captures. The captures still show "19 oglasa" (now "16 oglasa") and "od prošle provjere" on mobile (now "od zadnje provjere").

### Build vs incumbent system
Matches the incumbent:
- The paper ground and flat tinted rows on `bg/neutral`, with no shadows in the app shell.
- Olive is used only on the one Primary per view ("Provjeri", "Kopiraj ponudu").
- Verdict badges keep their one meaning, each with an icon and a word. Red appears only next to written evidence ("ista slika u 3 druga oglasa", the fake-delivery-link alert). "Nema podataka" is gray.
- Bricolage is used for prices and scores (64/100, 590 €).
- The haggle helper sits on the sand surface (`bg/sand`).
- When fewer than 5 comparables exist, the Price Range Bar shows the Insufficient state with the copy "3 od potrebnih 5".
- Per-check loading and failure are independent ("Ostale provjere rade normalno", retry + timestamp + error code on a neutral block).
- The focus ring is 2px `border/focus` with a 2px offset.
- Lucide icons.

Where the build diverges (the build wins, recorded here, not written into DESIGN.md):
- **Paste field height.** The contract said 56px; the build ships 64px.
- **Paste field shape.** It is a full pill. The incumbent Shapes and Input rules say 12px for inputs, and the in-report "Zalijepi poruku" field keeps that 12px input. So the pill is a new, separate pattern, not a restyle of Input.
- **Mobile paste.** On mobile the "Provjeri" button sits below the field at full width, not inside it.
- **App shell.** The shell is a 240px sidebar plus a 720px main column. DESIGN.md Layout's "80px gutter at 1440px" does not describe it.
- **Mobile navigation.** Mobile uses a bottom tab bar (Početna / Praćeni / Moji oglasi / Postavke) instead of the sidebar. DESIGN.md has no mobile nav pattern.
- **Mobile section tabs.** They are pills with the selected tab filled in ink. Desktop uses a 2px ink underline. The incumbent Segmented Control uses an elevated white pill for the selected item. That gives three treatments for one kind of control, which needs a decision before it is recorded.
- **"Shaker u Chromeu" promo card.** It sits on `bg/sand`. The incumbent gives beige/sand to community content and the haggle helper, so this use is outside the recorded role.

### Candidate DS additions (awaiting user approval, not applied)
1. **Icon grid additions (16 Lucide icons).** house, arrow-left, copy, camera, trending-up, list-checks, pencil, bell, refresh-cw, square, square-check, settings, menu, loader-circle, puzzle, file-text. These already sit on the Design System page; they are not recorded in DESIGN.md.
2. **App/Sidebar component set.** Active = Početna | Praćeni oglasi | Moji oglasi | Postavke. The active item is on a `bg/neutral` pill and the other items are plain text with an icon.
3. **Paste field.** 64px pill with a link icon and a Primary pill inside. It has Focus (olive ring, "Link je prepoznat: Njuškalo.") and Error (risk border plus a fix-it message) states. On mobile it stacks with a full-width Primary below.
4. **Watchlist row.** `bg/neutral`, 16px radius, photo, title, verdict badge plus platform · city meta, price, and a delta pill (`bg/warning-subtle` for price changes, `bg/danger-subtle` for evidence).
5. **Grouped watchlist.** "Promijenilo se…" / "Bez promjene" group labels above the row groups.
6. **Score ledger rows.** `bg/neutral` rows with a title, a one-line reason, and a Bricolage score "/100". No bars or dials.
7. **Section tabs.** Desktop has a 2px ink underline; mobile uses ink-filled pills. This needs a decision against the Segmented Control first (see divergences).
8. **Haggle rail.** Desktop right rail on `bg/sand`: offer in Price XL, the saving, the message, Primary "Kopiraj ponudu". This is the incumbent Haggle helper placed as a rail.
9. **Mobile sticky footer.** A message preview on sand, Primary "Kopiraj ponudu · 590 €", and a one-line caption. It mirrors the extension panel's pinned footer.
10. **Mobile bottom tab bar** (observed in mobile-home; not in the builder's list).
11. **Per-check progress list.** Rows with done, in-progress and queued states plus an estimate line, followed by skeleton cards.

Open question before approving item 4. On the price-change delta pill, `bg/warning-subtle` (pollen-subtle) is the same fill as the **Check** verdict (`verdict-check`). Under the One Meaning Rule, pollen-subtle means "check one thing", so the delta pill gives it a second meaning. Recording item 4 as-is would write that collision into the system. Decide whether the delta pill keeps this fill or gets its own treatment.

### Not canonized
- No decorative kickers or eyebrows, hard offset shadows, glyph icons or system display faces were seen in the sampled captures. The small labels ("Predložena ponuda", "Poruka koju kopiraš", the group labels, "Tržišni raspon") each name the value or content directly under them, so they are working labels, not kickers. Still, none of them should be recorded as a style rule.
- The demo listing photos are placeholders and are not system assets.

### Pre-existing drift (reported, not repaired)
- **`.impeccable/design.json` is not in the schemaVersion 2 shape** that `document.md` specifies. It has no `schemaVersion`, `generatedAt`, `title`, `extensions.colorMeta`/`typographyMeta`, `components` snippets or `narrative`.
  - It repeats token values in `semanticTokens`, which the spec says belong only in the frontmatter.
  - Its dark `semanticTokens` set has no `text-tertiary`.
  - Shadows are an object rather than the spec's array.
- **DESIGN.md has a non-canonical section, "## Logo & host mocks",** between Components and Do's and Don'ts. The spec allows extra sections, but this guidance belongs inside the canonical sections.
- **The sand/beige naming is ambiguous.** The Colors prose names Beige `#EDEAD0` as the haggle-helper surface. The token the builds bind, `bg/sand`, resolves to `beige-surface` `#F6F4E6`.
- **DESIGN.md Layout is written around the extension panel.** It has no web-app shell or mobile breakpoint guidance, so the 1440/390 platform now in PRODUCT.md is not reflected there.

## Logged-out states and auth (2026-10-08)

User request: logged-out visitors can run unlimited checks; three areas tease then lock, leading to sign-up: the home watchlist, the report's suggested offer + message rail, and "Najsličniji oglasi" beyond the first row. Lock style (user-chosen): tease, then lock. Show the saving ("Možeš uštedjeti oko 50 €"), blur a placeholder ("000 €", generic message), never the real offer; an elevated sign-up card sits over ghost/blurred content. Nothing locked may leak elsewhere on the page (summary text and verdict detail must not name the offer). Sign-in methods (user-chosen): Google + email one-time code, no password. Auth page: one form column (heading, Google, "ili", e-mail input, Nastavi, legal links, sign-in/sign-up toggle) beside a sand context panel showing the listing the visitor came from and the three things the account unlocks; after auth the visitor returns to that report. Frames: Desktop · Početna · gost, Desktop · Izvještaj oglasa · gost, Desktop · Registracija, Desktop · Prijava, Desktop · Prijava · kod, Mobile · Početna · gost, Mobile · Izvještaj oglasa · gost, Mobile · Registracija. Dev note: locked values must not be sent to the client; the blur is over placeholder content.
