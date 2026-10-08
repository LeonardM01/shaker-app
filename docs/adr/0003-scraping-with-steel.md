# 0003: Read all three marketplaces through Steel with per-marketplace parsers

- Status: accepted
- Date: 2026-10-08

## Context

Shaker reads Njuškalo, Facebook Marketplace and Index oglasi at launch, both for the listing being checked and for comparable searches (ADR 0002). Probed with plain HTTP from a residential IP on 2026-10-08:

- **Njuškalo:** redirected to a Radware ShieldSquare captcha (`validate.perfdrive.com`).
- **Facebook Marketplace:** logged-out search (`/marketplace/zagreb/search/?query=…`) returns 200 with listing JSON embedded in the HTML (`marketplace_listing_title`, `formatted_amount`, city, photos) when browser-like headers are sent. Without them it returns 400.
- **Index oglasi:** returns a client-rendered shell with no listing data in the HTML.

## Decision

- All marketplace reads go through Steel (https://steel.dev) browser sessions with its proxy and captcha solving. No direct `fetch` to marketplaces from our functions.
- Each marketplace has a deterministic parser: a Playwright script over a Steel session that reads the page's embedded data (or rendered DOM) into one shared typed shape. Search pages block images, fonts and media.
- An LLM-driven browser agent is only a fallback when a parser fails, and its output still has to pass the same schema validation.
- Sessions are logged out. We don't run Facebook (or other) accounts for scraping.

## Consequences

- One parser per marketplace and page type (listing page, search page) to maintain. Parser failures must be visible (error code on the check), not silently empty.
- If Facebook starts requiring login for Marketplace, Facebook support moves to the browser extension (reading the page the user already has open) rather than server-side accounts. Revisit this ADR then.
- Search results include wrong models and accessories, so comparable observations need product attributes before they can be matched (see ADR 0002).
