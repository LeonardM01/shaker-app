---
version: 1
slug: "figma-landing"
primary_target: "figma/landing"
related_targets: []
---

# Landing page (Figma page "Landing", 1440 desktop + 390 mobile)

Scope: marketing landing page for the Vrijedi.Ly browser extension. Mode: Persuade. Visitor: a Croatian buyer who just opened a listing on Njuškalo/Index/Vinted/Facebook and is nervous about price, seller, or a scammy message. Action: install the extension ("Dodaj u Chrome — besplatno"). Proof: the product shown working on realistic demo listings, labelled as examples; no user counts, totals, or testimonials. Copy: Croatian, Hormozi value equation (outcome, likelihood, speed, zero effort, free) + Harry Dry (one idea per line, customer's words, specific, visualisable). Sellers get one fair section, never a second CTA.

## Direction contract

THESIS: The page is the six questions a buyer asks before paying, each answered by Vrijedi.Ly's real panel. It refuses the icon-card feature grid and the hero-metric template.
OWN-WORLD: DESIGN.md as-is: paper and ink, Muted Olive only on the action, verdict colors with one meaning, Bricolage display, Inter body, pills and 24px cards, flat surfaces, one dark-ink close.
STORY: "Someone finally answers the question I actually have." Visitor sees their own doubt as a heading, sees the answer rendered on a listing like theirs, believes it takes zero effort, installs.
FIRST VIEWPORT: Left: question headline "Je li ovaj oglas dobar?" (Display Large), two-line answer, primary pill CTA, platform line. Right: a host listing card with the Listing Chip and the Vrijedi.Ly panel open on the AI answer. CTA sits under the headline, above the fold.
FORM: Six buyer questions, user-locked from a three-structure choice (no concept-seed roll; user pin beats the roll). Seed key: user-pinned.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Documentation

Ordinary extension of the incumbent world; DESIGN.md and `.impeccable/design.json` left untouched. Verified against DESIGN.md from the review captures (`.impeccable/review/desktop.png`, `mobile.png`) with pixel histograms of the hero, panel, Price Range Bar, page body and close:

- **Colors.** Every sampled Vrijedi.Ly fill resolves to a frontmatter token: paper #FFFFFF, `bg/sand` #F6F4E6 (suggested-offer tile), `bg/neutral` surface tiles, ink #1A2410 (text, the dark close), Muted Olive #A6C36F (primary pills, logo mark, verified mark only), Golden Pollen #FFCF56 (haggle verdict, stars, savings), Icy Blue #B0DAF1 / Muted Teal #86BAA1 (price zones only), border #E4E8DC, ink-secondary #4D5645, pollen-deep #5E4400 as text on pollen-subtle. No brand color used as text on white; verdict colors carry one meaning each; olive is action-only; the close is one dark-ink block with an olive primary pill.
- **Typography.** Bricolage ExtraBold on the question headlines, section display and prices (640 €, 4,6, 720 €); Inter on body, labels, captions and FAQ rows. Hierarchy matches the frontmatter ramp as far as a raster can show.
- **Shapes and depth.** Pills for every action and chip; 24px white cards; 32px tinted section tiles; 4px neutral tag ("Njuškalo"); Overlay shadow only on the floating panel and Listing Chip. No colored side borders, no gradients, no glass.
- **Components.** Button (Primary / Secondary nav pill / Tertiary "Kako radi"), Listing Chip (Full on desktop beside the price, Compact mark + verdict dot on mobile, as DESIGN.md sizes it), Verdict Badge (Haggle compact + full), Rating (pollen stars with deep outline), Avatar (olive-200 initials + verified mark), Price Range Bar, Review Card with seller reply on sand, Seller Card with tinted fact tiles and ✓/? checks, Logo, Lucide icons. "No data" states render gray/neutral, never amber or red; red appears once, beside its evidence (payment-link message).

**Non-token region (deliberate).** The hero "Host · Njuškalo" listing mock uses fixed host grays (#FFFFFF, #F2F2F2, #1F1F1F, #767676, with #E2E2E2 planned for the photo placeholder; the capture samples the placeholder at #EFEFEF) because it depicts the foreign host page the extension is a guest on. This follows DESIGN.md's "Logo & host mocks" convention (layers prefixed `Host/` use host colors, not Vrijedi.Ly tokens), so it is not drift and must not be tokenized.

**Open DS item (not a landing fix).** DESIGN.md's Pastel Field, Deep Edge Rule asks every chart zone for a 3px edge in its hue's deep step. The Price Range Bar in the capture shows a thin deep-step underline per zone (#44705C / #2F6F94 / #8A6400 under teal / icy / pollen), not the full 3px edge the rule specifies. Fix belongs on the Design System page's Price Range Bar component; the landing inherits it.

## Audit → adapt → harden → polish (2026-10-08)

- **Frames now:** Desktop 1440 (36:763), Laptop 1280 (51:1179), Tablet 1024 (51:1445), Mobile 390 (39:1018). Desktop columns are fluid (copy 1fr, stage 608 fixed); 1024 stacks every two-column section with 48px gutters; H1 drops to Display/Medium below 1440. Rules live in the on-canvas "Handoff · responsive & touch rules" note (51:1705): ≥44px hit areas on every control even where visuals stay DS-sized.
- **States & edge cases board (53:1585):** link hover/focus-visible (light and dark ground), Primary CTA Default/Hover/Focused (DS variants), CTA by browser/device (Chrome desktop installs; Safari/Firefox/Edge "Kopiraj link za Chrome"; phones "Pošalji mi link na računalo"), EN hero stress, host-title clamp, image/alt rules, motion + reduced-motion, skip-link. The Mobile frame's CTAs use the phone variant.
- **Polish:** listing-score bars bound to `text/primary|secondary|tertiary` (≥4.3:1 on the track, flip in Dark mode; verified); host-mock captions #5F5F5F (5.7:1); zero default-named layers; zero unbound fills outside the host mock, all four frames.
- **Still open, outside this surface:** Price Range Bar deep edge (DS component); Review Card tertiary caption on beige (4.42:1, DS component).

**Pre-existing drift, not repaired.** `.impeccable/design.json` is schemaVersion 1 shape (`semanticTokens`, `shadows`, `focusRing` at the top level; no `schemaVersion`, `extensions`, `components` or `narrative`) and predates the frontmatter-first format. The deep-edge steps the build uses for `border/positive|info|warning` (#44705C, #2F6F94, #8A6400) are named in DESIGN.md prose but have no frontmatter color entries.
