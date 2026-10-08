---
name: Shaker
description: Trust and price layer for Njuškalo, Facebook Marketplace, Index oglasi and Vinted
colors:
  muted-olive: "#A6C36F"
  olive-hover: "#8DAA55"
  olive-muted: "#D3E3B4"
  olive-deep: "#556B30"
  olive-subtle: "#F5F9EE"
  muted-teal: "#86BAA1"
  teal-subtle: "#E6F0EB"
  teal-deep: "#34574A"
  icy-blue: "#B0DAF1"
  icy-subtle: "#E3F2FB"
  icy-deep: "#1F4D68"
  beige: "#EDEAD0"
  beige-surface: "#F6F4E6"
  golden-pollen: "#FFCF56"
  pollen-subtle: "#FFF5D9"
  pollen-deep: "#5E4400"
  risk-red: "#B92D1F"
  risk-subtle: "#FDECEA"
  risk-deep: "#96220F"
  ink: "#1A2410"
  ink-secondary: "#4D5645"
  ink-tertiary: "#646D5B"
  ink-disabled: "#B1B9A4"
  border: "#E4E8DC"
  border-strong: "#CFD5C4"
  neutral-fill: "#F1F3EC"
  surface: "#F8F9F5"
  paper: "#FFFFFF"
  dark-screen: "#11180A"
  dark-elevated: "#1A2410"
  dark-neutral: "#212B19"
typography:
  display-large:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "72px"
    fontWeight: 800
    fontVariation: "'opsz' 96"
    lineHeight: "74px"
    letterSpacing: "-0.03em"
  display-medium:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "56px"
    fontWeight: 800
    fontVariation: "'opsz' 96"
    lineHeight: "58px"
    letterSpacing: "-0.03em"
  display-small:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: "44px"
    letterSpacing: "-0.02em"
  headline-large:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: "38px"
    letterSpacing: "-0.015em"
  headline-medium:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "-0.01em"
  headline-small:
    fontFamily: "Inter, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-0.005em"
  body-large:
    fontFamily: "Inter, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "28px"
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "-0.005em"
  body-small:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "-0.005em"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "-0.005em"
  label-small:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  price-xl:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    fontVariation: "'opsz' 96"
    lineHeight: "52px"
    letterSpacing: "-0.03em"
  price:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: "28px"
    letterSpacing: "-0.015em"
rounded:
  none: "0px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  full: "9999px"
spacing:
  3xs: "2px"
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.muted-olive}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.olive-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  button-tertiary:
    textColor: "{colors.olive-deep}"
    rounded: "{rounded.full}"
  button-danger:
    backgroundColor: "{colors.risk-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
  button-medium:
    padding: "0 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  verdict-great:
    backgroundColor: "{colors.muted-teal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  verdict-fair:
    backgroundColor: "{colors.icy-blue}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  verdict-haggle:
    backgroundColor: "{colors.golden-pollen}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  verdict-check:
    backgroundColor: "{colors.pollen-subtle}"
    textColor: "{colors.pollen-deep}"
    rounded: "{rounded.full}"
  verdict-risk:
    backgroundColor: "{colors.risk-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
  verdict-unknown:
    backgroundColor: "{colors.neutral-fill}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.xl}"
    padding: "24px"
  tag:
    backgroundColor: "{colors.neutral-fill}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label-small}"
    rounded: "{rounded.xs}"
    padding: "2px 8px"
---

# Design System: Shaker

Figma source of truth: https://www.figma.com/design/yYrUqxBmK1rH5djf9hvIF4/SHAKER (page "Design System"). Variables there are named `color/bg/*`, `color/text/*`, `color/border/*`, `color/icon/*`, `spacing/*` and `radius/*`, and each carries its CSS code syntax (`var(--color-bg-brand)` and so on).

## Overview

**Creative North Star: "The Street-Smart Friend"**

Shaker is the friend who comes along when you buy something second-hand: calm, on your side, a little cheeky about the price. The system borrows Wise's product discipline (generous white space, flat tinted surfaces, pill actions, big confident numbers, dark ink on bright green) and swaps in a muted olive brand over a dark olive-forest ink (the same pairing as Wise's bright green on forest green), with teal and icy blue carrying the price verdicts, a warm beige for community, and gold for savings. Bricolage Grotesque gives the voice; Inter does the work.

The extension is a guest on someone else's page. It stays compact, floats with a soft shadow and a hairline border, and never restyles the host.

**Key Characteristics:**
- Mostly paper and ink; Muted Olive only where there is an action.
- Each verdict color means exactly one thing, and always appears with an icon and a word.
- Big Bricolage numerals for prices and savings.
- Light and Dark modes are the same tokens (Facebook and Vinted both ship dark themes).
- Croatian-first copy.

## Colors

Muted olive and soft naturals on paper, grounded by a dark olive-forest ink, with gold kept for opportunity.

### Brand (user-pinned, v2)
- **Muted Olive** (#A6C36F): brand, logo, primary actions, focus. Text on it is always ink (7.8:1); white text fails contrast. Never used as a verdict.
- **Muted Teal** (#86BAA1): the "great price" verdict and success states. Green still means "good deal".
- **Icy Blue** (#B0DAF1): the "fair price" verdict and informational states. Calm and neutral.
- **Beige** (#EDEAD0): the warm community surface for seller replies and the haggle helper.
- **Golden Pollen** (#FFCF56): room to haggle, savings, rating stars. It frames an opportunity, never a warning.

### Support
- **Ink** (#1A2410): all text, icons, the inverse hero. A dark olive-forest black so it sits with the olive.
- **Risk Red** (#B92D1F): only for risk backed by evidence (duplicated photos, fake delivery links, contradictory messages).
- **Neutrals**: olive-tinted grays (#F8F9F5 → #4D5645). Secondary text #4D5645 (7.7:1), tertiary #646D5B (5.4:1 on paper, 4.8:1 on `bg/neutral`).
- **Avatars** use olive-200 (#D3E3B4) via `bg/brand-muted`, so people never wear a verdict color.

### Named Rules
**The One Meaning Rule.** Teal = below market, Icy Blue = within market, Pollen = above market (haggle), Pollen-subtle = check one thing, Red = evidence of risk, Gray = no data. Olive is action only. Never reuse a verdict color for decoration.

**The Evidence Rule.** Red never appears without the evidence written next to it. "No data" is gray, never amber or red: it is unknown, not suspicious.

**The Pastel Field, Deep Edge Rule.** The five brand colors are fills, never the only boundary of a data graphic. As shapes on white they sit at only 1.5–2.2:1. Every chart zone, indicator or star gets a 3px edge or outline in its own hue's deep step: `border/positive` (sage-700), `border/info` (icy-700), `border/warning` (pollen-700). In Dark mode these remap to the 300 steps. Data points use `icon/secondary` at full opacity, never translucent. Measured minimum: 4.88:1 Light, 5.54:1 Dark.

**The Proportion Rule.** About 55% paper, 18% ink, 12% olive, 5% beige, 4% teal, 4% icy blue, 2% pollen.

## Typography

**Display Font:** Bricolage Grotesque (96pt optical size, ExtraBold) for display and prices; ExtraBold/Bold for headings.
**Body Font:** Inter (Regular, Medium, Semi Bold).

**Character:** Bricolage's ink traps and slightly condensed heavy forms read as confident and street-level. It is an open-source counterpart to Wise Sans. Inter keeps the extension legible at 12–14px and handles č ć đ š ž cleanly.

### Hierarchy
- **Display** (Bricolage 96pt ExtraBold, 72/56px, −3%): hero statements, big verdicts.
- **Headline** (Bricolage ExtraBold/Bold 32/24px; Inter Semi Bold 20px): panel and section titles.
- **Title** (Inter Semi Bold 16/24): list and card titles.
- **Body** (Inter Regular 18/16/14px, −0.5%): reading text. Measure 65–75ch.
- **Label** (Inter Semi Bold 14px; Medium 12px): buttons, tabs, badges, tags.
- **Price** (Bricolage 96pt ExtraBold 48px; ExtraBold 24px): prices and savings. Use tabular figures in Inter wherever prices sit in columns.

Alternatives if the tone should shift: Schibsted Grotesk (calmer) or Onest/Geist (more neutral) for display, with Inter kept for UI.

## Layout

4px base unit. Tight inside groups (8–12px) and generous between them (24–48px), with more space above a heading than below it. The extension side panel is 400px wide with 24px padding, structured like Wise's drawers:
- **Top (pinned)**: logo, close, segmented control. It gains a bottom hairline once the body scrolls.
- **Body (scroll)**: the only part that moves, with a 4px `border/strong` scrollbar thumb.
- **Footer (pinned)**: the single Primary action for the current tab (e.g. "Kopiraj ponudu · 640 €") plus a one-line caption.

Design for a 720px-tall viewport first: about 480px of body is visible there. The web app uses an 80px gutter at 1440px.

## Elevation & Depth

Flat by default: hierarchy comes from tinted fills (`bg/neutral`, `bg/sand`), not shadows. Shadows exist only for things that float over a host page:
- **Raised**: 0 2 8 rgba(26,36,16,.08). Hover lift; the selected segment.
- **Overlay**: 0 2 6 rgba(26,36,16,.08) + 0 12 32 −4 rgba(26,36,16,.14). The Listing Chip and popovers.
- **Panel**: −8 0 40 rgba(26,36,16,.18). The docked side panel.

## Shapes

Pills (`full`) for actions, chips, compact verdicts and avatars. 12px for inputs, 16px for full verdict badges and list rows, 24px for cards, 32px for panels and sections. Tags use 4px so they never read as verdicts. No colored side borders on cards or alerts: the whole surface carries the tone.

## Components

- **Button**: pill. Primary (Muted Olive + ink), Secondary (neutral fill), Tertiary (text), Danger (irreversible actions only). Large 48px for the web app, Medium 36px for the extension. Focus is a 2px `border/focus` ring with a 2px offset (`Focused` boolean in Figma, `:focus-visible` in code). One Primary per view. Secondary is neutral-filled, so never place it on a `bg/neutral` surface; use Primary there.
- **Verdict Badge** (the Full size's icon circle uses `bg/icon-tint`: white at 40% in Light, 14% in Dark): Great / Fair / Haggle / Check / Risk / Unknown × Compact (next to the price on host pages) / Full (panel). Always icon + label; Full adds a one-line reason.
- **Listing Chip**: the white pill the extension injects next to a listing's price: Shaker mark + compact verdict + seller rating + chevron. 32px tall, Overlay shadow, hairline border. Verdicts include `Loading` ("Provjeravam…"). Has a `Focused` ring; Esc in the panel returns focus to the chip.
  - **Size=Full** where there's ≥ 320px beside the price (listing detail pages). **Size=Compact** (62×34: mark + verdict dot) in result grids and lists.
  - Hover or focus on Compact opens Full as a popover *above* the chip, over the photo, never over text. Click opens the panel.
  - aria-label: "Shaker: <presuda>, prodavač <ocjena>".
- **Price Range Bar** (signature): comparable listings as dots over three verdict-colored zones (teal / icy blue / pollen), with a black marker for this listing. With fewer than 5 comparables, use `Position=Insufficient`: gray track, real dots only, no marker or zones, and the copy "Premalo podataka za raspon (3 od potrebnih 5)". Never draw a fake range.
- **Haggle helper**: beige card with the suggested offer in Price XL, the saving in positive text, a pre-written message and a "Kopiraj poruku" button.
- **Alert**: Info / Success / Warning / Danger for message checks. The title says what happened, the body says what to do, and an optional action follows. The action's hit area is at least 24px tall (WCAG 2.5.8).
- **Input**: 48px tall, label above, helper text below. The error text names the problem and how to fix it.
- **Rating**: filled stars are Golden Pollen with a `border/warning` outline; empty stars have an `icon/secondary` outline. Always shown next to the number and the review count.
- **Avatar**: initials on light olive (`bg/brand-muted`), with an olive verified mark. No stock photos.
- **Review Card**: author role + date + platform tag, stars, body, and an optional seller reply on Beige. Reviews go both ways.
- **Seller Card**: verified avatar, tenure, three facts in tinted tiles, and fact checks (✓ olive / ? gray).
- **Segmented Control**: Cijena · Prodavač · Poruke. The selected item is an elevated white pill. States: Default / Hover / Selected, plus a `Focused` ring; ←/→ move between items.
- **Panel states**: every check (price, seller, message) loads and fails on its own; one failure never blocks the panel.
  - **Loading**: skeletons, plus progress per platform (✓ done / clock pending) and an estimate ("5–10 sekundi").
  - **Insufficient data**: Unknown verdict, the Insufficient bar, and a "Prati cijenu" action. A new seller without reviews is labeled not suspicious.
  - **Error**: a neutral (not warning) block naming the cause, a retry button, and a timestamp and error code; the other checks stay live.
  - **Long content**: titles clamp at 2 lines, seller names at 1 line, and prices use Croatian formatting (249.000 €, 4,8).
- **Icons**: Lucide (MIT), 24px, 2px stroke, round caps, colored via `icon/*` tokens.

## Logo & host mocks

- The logo (wordmark and "s" mark) is outlined vector artwork in the `Logo` component. The Listing Chip uses a Logo Mark instance at 75%. Never retype the logo as live text.
- Host-page mocks (layers prefixed `Host/`) deliberately use fixed host colors, not Shaker tokens. Facebook light: `#F0F2F5` / `#FFFFFF` / `#050505` / `#65676B`. Facebook dark: `#18191A` / `#242526` / `#E4E6EB` / `#B0B3B8`. Shaker's chip and panel must prove they hold up on a foreign surface.

## Do's and Don'ts

- **Do** put ink text on all five brand colors.
- **Do** pair every color signal with an icon and a word (red/green color blindness).
- **Do** frame overpricing as savings ("uštedi 80 €"), in gold.
- **Do** keep the extension compact and visibly separate from the host page (border plus Overlay shadow).
- **Don't** use white text on Muted Olive, Teal, Icy Blue or Pollen.
- **Don't** show red without evidence, or show "no data" as anything but gray.
- **Don't** add colored left borders, gradient text, or decorative glass.
- **Don't** use any brand color as text on white. Use the deep steps instead: olive-deep #556B30, teal-deep #34574A, icy-deep #1F4D68, pollen-deep #5E4400.
