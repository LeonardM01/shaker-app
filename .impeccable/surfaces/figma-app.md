---
version: 1
slug: "figma-app"
primary_target: "figma/app"
related_targets: []
---

# Web app (Figma page "App", 1440 desktop + 390 mobile)

Scope: the Vrijedi.Ly web app. Mode: Operate. User: a Croatian buyer (or seller) who has a listing link from Njuškalo, Facebook Marketplace or Index oglasi and wants to know, fast, whether it is a good buy, what is missing, whether it smells like a scam, who the seller is, and what to ask. Sellers paste their own listing in "Moji oglasi" and get improvements; buyers never see that view. Task frequency: occasional, bursty (a few listings in one evening while shopping). Constraints: Croatian copy; demo listings are labelled examples; "no data" is gray, red only beside evidence.

Screens: Početna (paste + watchlist), Provjera u tijeku (per-check progress), Izvještaj oglasa (buyer report), Moji oglasi (seller improvements), states board (invalid link, unsupported site, removed listing, empty watchlist, partial failure). Mobile: Početna, Izvještaj, Moji oglasi.

## Direction contract

THESIS: Every pasted link becomes a living row in your watchlist, like a Wise transaction: verdict, price, and what changed since you looked. The report is one calm page that answers in the order a buyer worries. It refuses the AI-chat wrapper and the dashboard of score dials.
OWN-WORLD: DESIGN.md as-is, shaped by Wise web: white ground, left text sidebar with the active item on a neutral pill, flat `bg/neutral` list rows at 16px radius, big Bricolage numbers, olive pills only on the one action, verdict colors with one meaning, sand for the haggle helper.
STORY: "I paste a link and in ten seconds I know if I should buy, what to ask, and what to offer." User pastes, watches checks complete, reads the verdict, copies the questions or the offer, and the listing stays tracked.
FIRST VIEWPORT: Sidebar (240) left. Main column 720 wide: H1 "Provjeri oglas" (Heading Large), a 56px paste field with link icon and olive "Provjeri" pill inside, three platform chips beneath. Under it a Wise-yellow-style update banner (price drop on a tracked listing), then "Praćeni oglasi" rows. Signature move: each row's verdict badge plus a gold "−40 € od zadnje provjere" delta, the watchlist as a ledger of verdicts.
FORM: Watchlist home, position 7 on the ordered list, dealt lead. Seed key: e125a6f8.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Documentation

Pass: documenter, 2026-10-08. Ordinary extension of the incumbent Vrijedi.Ly system, not a new world. **DESIGN.md, `.impeccable/design.json` and PRODUCT.md were not modified.** Everything under "Candidate DS additions" waits for user approval and has not been applied.

### Evidence checked
- `reference/document.md` (format spec), `DESIGN.md` (frontmatter + body), `.impeccable/design.json`, `PRODUCT.md` (platform line: responsive web, 1440 + 390), this surface's direction contract.
- Final captures in `.impeccable/review/app/`: desktop-home, desktop-report, desktop-loading, desktop-states, mobile-home, mobile-report (sampled visually). desktop-seller and mobile-seller were not opened on this pass.
- Build facts reported by the builder: every Vrijedi.Ly fill, stroke, radius and gap is bound to DS variables (`color/bg/*`, `text/*`, `border/*`, `icon/*`, `spacing/*`, `radius/*`). All text uses DS text styles. Components are DS instances (Button, Verdict Badge, Tag, Rating, Avatar, Alert, Price Range Bar, Review Card, Seller Card, Logo, Icons).
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
- **"Vrijedi.Ly u Chromeu" promo card.** It sits on `bg/sand`. The incumbent gives beige/sand to community content and the haggle helper, so this use is outside the recorded role.

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

User request: logged-out visitors can run unlimited checks; three areas tease then lock, leading to sign-up: the home watchlist, the report's suggested offer + message rail, and "Najsličniji oglasi" beyond the first row. Lock style (user-chosen): tease, then lock. Show the saving ("Možeš uštedjeti oko 50 €"), blur a placeholder ("000 €", generic message), never the real offer; an elevated sign-up card sits over ghost/blurred content. Nothing locked may leak elsewhere on the page (summary text and verdict detail must not name the offer). Sign-in methods (user-chosen): Google + email one-time code, no password. **Superseded 2026-10-08, see "Auth: e-mail and password" below.** Auth page: one form column (heading, Google, "ili", e-mail input, Nastavi, legal links, sign-in/sign-up toggle) beside a sand context panel showing the listing the visitor came from and the three things the account unlocks; after auth the visitor returns to that report. Frames: Desktop · Početna · gost, Desktop · Izvještaj oglasa · gost, Desktop · Registracija, Desktop · Prijava, Desktop · Prijava · kod, Mobile · Početna · gost, Mobile · Izvještaj oglasa · gost, Mobile · Registracija. Dev note: locked values must not be sent to the client; the blur is over placeholder content.

### Logged-out and auth (documentation)

Pass: documenter, 2026-10-08. Ordinary extension of the incumbent Vrijedi.Ly system: every new pattern is assembled from existing tokens and components. **DESIGN.md, `.impeccable/design.json` and PRODUCT.md were not modified.** The candidates below are waiting for user approval and have not been applied.

#### Evidence checked
- `reference/document.md`, `DESIGN.md` (frontmatter and body), PRODUCT.md (stack line: Neon Auth), and this brief's direction contract and "Logged-out states and auth" request.
- Captures in `.impeccable/review/app-guest/`. Opened on this pass: desktop-home-guest, desktop-report-guest, desktop-signup, desktop-code, mobile-home-guest, mobile-report-guest, mobile-code. Not opened: desktop-signin, mobile-signin, mobile-signup. Their layout is reported to match the signup/code pair.
- Frames as reported by the builder. Desktop: 73:1660, 73:1851, 74:1979, 74:2078, 74:2171. Mobile: 74:2314, 74:2468, 74:2263, 75:2371, 75:2418. The brief's frame list above omits Mobile · Prijava (75:2371) and Mobile · Prijava · kod (75:2418); both exist.
- Finish review: the disposition fix produced 6 material fixes. The verdict pass found 5 resolved and 1 partial (mobile blur), which was then corrected by raising the blur from 7 to 12. **mobile-home-guest.png predates that fix:** in it, the placeholder titles ("PlayStation 5 + 2 kontrolera", "Kauč na razvlačenje, sivi") are still legible. The corrected frame was not recaptured, so this pass has not verified it visually.

#### What matches the incumbent
- **One Primary per view.**
  - Guest home: the only Primary is "Provjeri".
  - Guest report: the only Primary is the rail's "Napravi račun i kopiraj" (the mobile sticky footer on mobile).
  - Auth: the only Primary is "Nastavi" or "Potvrdi".
  - The sign-up actions in the lock cards and the top bar are Secondary.
- **Secondary placement.** Secondary sits on paper or `bg/elevated` (the top bar, "Nastavi s Googleom", the lock card buttons), never directly on `bg/neutral`. Where the surface is sand (the rail), the build uses Primary. No conflict with the Secondary-on-neutral rule was observed.
- **Verdicts.** The guest report keeps the verdict badge ("Prostor za pregovor"), the score ledger, the Insufficient-safe price bar and the evidence-adjacent red. Locking does not change any verdict meaning.
- **Lock icons.** lock and mail are Lucide at a 2px stroke.
- **Inputs.** The e-mail field is the DS Input (48px, 12px radius, label above, helper text below).
- **Radii.** Cards use 24px, list rows 16px and the context panel 32px.
- **Locked values.** Only placeholder values ("000 €", generic message) are blurred, never the real offer. The saving stays readable. The summary text does not name the offer.

#### Candidate DS additions (awaiting user approval, not applied)
1. **Icons:**
   - lock and mail (Lucide).
   - google, the official multicolour G. It is a third-party brand mark, so it should be recorded as an explicit exception to "colored via `icon/*` tokens": it is not recolourable and is not Lucide.
2. **Sign-up prompt (lock card).** `bg/elevated`, Overlay shadow, 24px radius, centred `bg/brand-subtle` icon circle, Title, body, Secondary "Napravi račun", and the link "Već imaš račun? Prijavi se" in `text/brand`. It floats over a layer-blurred preview of placeholder rows.
3. **Compact lock card.** A horizontal variant (icon, title + one line, Secondary at the end) for list continuations, e.g. "Još 22 usporediva oglasa" under the first row of "Najsličniji oglasi".
4. **Rail lock (locked haggle helper).** The incumbent Haggle helper on `bg/sand` with these changes:
   - The saving stays visible in `text/positive`.
   - The Price XL value is a blurred "000 €" placeholder, and the message is a blurred generic placeholder.
   - The lock line explains what an account unlocks.
   - Primary "Napravi račun i kopiraj" carries the lock icon.
   - On mobile it becomes the sticky footer.
5. **Guest top bar.** Secondary "Prijavi se" at top right, replacing account controls.
6. **Auth layout.**
   - Desktop has a 400px form column: H1, subtitle, Secondary "Nastavi s Googleom", the "ili" divider, the DS Input with the mail icon and helper text, Primary "Nastavi", legal links underlined in `text/brand`, and a sign-in/sign-up toggle. Beside it sits a 600px `bg/sand` context panel at 32px radius, holding the source listing card (white, 24px, with a locked "Predložena ponuda" row on `bg/neutral` showing the blurred placeholder) and three benefits with white icon circles.
   - On mobile the context collapses to a compact sand card above the form.
7. **OTP step.**
   - Six digit boxes, 64px desktop and 56px mobile, at the input radius.
   - The focused box uses a 2px `border/focus` stroke.
   - Primary "Potvrdi" stays disabled until all six digits are entered.
   - Below the button sit the resend countdown line and a Tertiary "Promijeni e-mail".
8. **Rule candidate: The Placeholder-Only Blur Rule.** Locked values are never sent to the client. Blur covers placeholder content only, and must be strong enough that the placeholder is unreadable at 2x. Nothing locked may be named elsewhere on the page.

#### Conflicts with DESIGN.md rules (need a decision before recording)
- **Elevation.** DESIGN.md says shadows exist "only for things that float over a host page". The lock cards use the Overlay shadow inside the web app. Either widen the rule to cover in-app overlays over blurred content, or drop the shadow. Recording candidate 2 or 3 as-is would contradict the current rule.
- **One Meaning Rule: olive is action only.** The lock card's icon circle uses `bg/brand-subtle` (olive tint) as a decorative fill on a non-interactive icon. It sits next to the action, but it is not the action. Decide whether the brand-subtle tint is allowed for "account/unlock" iconography or should be `bg/neutral`.
- **One Meaning Rule: verdict colours in the blurred placeholders.** The placeholder watchlist rows behind the home lock card keep verdict-coloured badges (teal, icy, pollen) and pollen delta pills. At blur 12 these read as colour texture: verdict colours used decoratively on fictional data. Consider neutral placeholders.
- **Sand role.** The auth context panel and the mobile auth context card put `bg/sand` on a non-community, non-haggle surface. This is the same out-of-role use already noted for the "Vrijedi.Ly u Chromeu" promo card. One decision should cover both.
- **Focus ring.** The OTP focused box uses a 2px `border/focus` stroke *in place of* the border. The incumbent focus treatment is a 2px ring with a 2px offset. That is acceptable for a single-character field, but record it as a deliberate exception or align it with the ring.
- **Disabled Primary.** The disabled "Potvrdi" (neutral fill, disabled text) is visually close to a Secondary button. DESIGN.md defines no disabled button state, so recording this one would set the rule by accident.

#### Not canonized
- No kickers or eyebrows, hard offset shadows, glyph icons or system display faces appear in the sampled captures. "Predložena ponuda" and "Predložena ponuda i poruka" label the value directly under them, so they are working labels. They should not be recorded as a style.
- The demo listing (iPhone 13 Pro) and the placeholder watchlist rows are example content, not system assets.

#### Pre-existing drift (reported, not repaired)
- **Saving colour.** Do's and Don'ts says to frame savings "in gold". The Haggle helper component says "the saving in positive text". The rail lock follows the component (`text/positive`), so the two incumbent rules still disagree.
- **Earlier drift still stands.** The drift listed in the first documentation pass is unchanged:
  - the sidecar is not schemaVersion 2;
  - "Logo & host mocks" is a non-canonical section;
  - Beige vs `bg/sand` naming is ambiguous;
  - Layout has no web-app shell or mobile guidance. The auth split layout (400 + 600) adds another unrecorded web layout to that gap.

## Auth: e-mail and password (2026-10-08)

User request: replace the e-mail one-time code with e-mail + password; registration gets a username field. Google stays. This supersedes "Google + email one-time code, no password" above and the OTP step (candidate 7).

- **Registracija** (74:1979 desktop, 74:2263 mobile): heading, subtitle, Secondary "Nastavi s Googleom", "ili", then a `Fields` stack (16px gap) of three DS Inputs: "Korisničko ime" (Icon/user, placeholder "npr. ivana_zg", helper "Prikazuje se uz tvoje recenzije."), "E-mail adresa" (Icon/mail, no helper), "Lozinka" (Icon/lock, placeholder "Najmanje 8 znakova", trailing Icon/eye show/hide). Primary "Napravi račun". Legal line, "Već imaš račun? Prijavi se".
- **Prijava** (74:2078 desktop, 75:2371 mobile): subtitle "Upiši e-mail i lozinku ili nastavi s Googleom.", Inputs "E-mail adresa" and "Lozinka" (placeholder "Upiši lozinku", trailing eye), a right-aligned "Zaboravljena lozinka?" link in the link style, Primary "Prijavi se".
- The Primary now names its action ("Napravi račun", "Prijavi se") instead of "Nastavi".
- Sign-in is by e-mail, not username. The minimum password length shown (8) matches the Better Auth default.
- **DS changes applied:** new `Icon/eye` (Lucide, 2px stroke, `cell eye` in the icon grid); the Input component set gained `Show trailing icon` (boolean, default off) and `Trailing icon` (instance swap, default Icon/eye) on all four states. Existing instances are unchanged.
- **Open:** "Desktop · Prijava · kod" (74:2171) and "Mobile · Prijava · kod" (75:2418) are left in place. They are obsolete for sign-in; they could be deleted or repurposed for e-mail verification or a password reset. The "Zaboravljena lozinka?" flow has no screens yet.
