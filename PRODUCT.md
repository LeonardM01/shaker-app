# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Surfaces: a browser extension (overlay badges on listing pages plus a side panel/popup) and a responsive web app (desktop 1440 and mobile 390, confirmed by the user 2026-10-08). Users paste listing links from Njuškalo, Facebook Marketplace and Index oglasi into the app; sellers improve their own listings in a separate "Moji oglasi" section. No native mobile app for now.

## Product

Vrijedi.Ly is a trust and price layer for Croatian second-hand marketplaces: Njuškalo, Facebook Marketplace, Index oglasi and Vinted. Users leave reviews on individual listings ("oglasi") and sellers. Vrijedi.Ly scrapes comparable listings to find better prices, helps buyers negotiate, checks the seller's history, and checks whether messages from the other side are consistent with the listing (scam patterns, payment-link tricks).

## Users

Buyers and sellers, weighted equally.

- **Buyers** browse a listing and want to know: is the price fair, is the seller trustworthy, can I haggle, does this message look like a scam.
- **Sellers** are reviewed subjects and want to build and protect their reputation, respond to reviews, and price their listings competitively.

The product must stay fair to both sides: a listing or seller with no data is unknown, not suspicious.

## Language

Croatian first. English comes later via i18n. All design-system examples use Croatian copy.

## Brand commitments

- Brand palette pinned by the user (v2, 2026-10-08): Muted Olive `#A6C36F`, Beige `#EDEAD0`, Muted Teal `#86BAA1`, Icy Blue `#B0DAF1`, Golden Pollen `#FFCF56`. Replaces the earlier Mint Leaf / Celadon palette.
- Supporting colors confirmed by the user: a deep olive-forest ink for text, and a risk red used only for evidence-backed scam/risk states.
- Visual reference pinned by the user: Wise (web) product design language.

## Stack

Landing page and web app: TanStack Start (React, TypeScript) on Vercel, Neon Postgres, Neon Auth where an account is needed, Neon Object Storage for assets. Browser extension stack not decided yet. See `CLAUDE.md` and `CODING_STANDARDS.md`. Figma file: https://www.figma.com/design/yYrUqxBmK1rH5djf9hvIF4/SHAKER.
