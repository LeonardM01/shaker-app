# Marketplace pages through Steel: what they show and how they read

Checked 2026-10-08 with logged-out Steel sessions (`steel-sdk` 0.18.0, Playwright over CDP, residential proxy geolocated to Croatia, `solveCaptcha: true`, images, fonts and media blocked). 30 sessions in total: 10 to capture fixtures, 20 to run `createSteelMarketplaceReader` end to end. Answers the "before building" questions for the marketplace reader; the code is in `src/features/marketplaces/`.

## Pages looked at (all 2026-10-08)

| Marketplace | Page | URL |
| --- | --- | --- |
| Njuškalo | Search | https://www.njuskalo.hr/search/?keywords=iPhone+13+Pro+128+GB |
| Njuškalo | Listing (private seller) | https://www.njuskalo.hr/iphone-13-pro/iphone-13-pro-128-gb-odlicno-ocuvan-sve-originalno-oglas-51499769 |
| Njuškalo | Listing (store) | https://www.njuskalo.hr/iphone-13-pro/apple-iphone-13-pro-128gb-hr-racun-r1-jamstvo-gratis-oprema-oglas-47521025 |
| Njuškalo | Inactive listing (HTTP 410) | https://www.njuskalo.hr/iphone-11/iphone-11-oglas-30000001 |
| Njuškalo | Unknown listing (HTTP 404) | https://www.njuskalo.hr/iphone-13-pro/nepostojeci-oglas-99999999 |
| Njuškalo | Private seller profile | https://www.njuskalo.hr/korisnik/korisnik11 (and `/korisnik/ElektronikOutlet`) |
| Njuškalo | Store profile | https://www.njuskalo.hr/trgovina/TechClub |
| Facebook Marketplace | Search | https://www.facebook.com/marketplace/zagreb/search/?query=iPhone%2013%20Pro%20128%20GB |
| Facebook Marketplace | Item | https://www.facebook.com/marketplace/item/1838276653964413/ |
| Facebook Marketplace | Unknown item | https://www.facebook.com/marketplace/item/1000000000000001/ |
| Facebook Marketplace | Seller profiles | https://www.facebook.com/marketplace/profile/4/, https://www.facebook.com/marketplace/profile/100004156512453/ |
| Facebook Marketplace | Login page | https://www.facebook.com/login/?next=… (the profile URL above) |
| Index oglasi | Search | https://www.index.hr/oglasi/pretraga?searchQuery=… for "iPhone 13 Pro 128 GB" and "iPhone 13 Pro" |
| Index oglasi | Listing | https://www.index.hr/oglasi/mobiteli/iphone/oglas/apple-iphone-13-pro-128gb-kao-novogarancijarazne-boje-moguca-zamjena-za-razno-128-gb/6053031 |
| Index oglasi | Gone listing | https://www.index.hr/oglasi/mobiteli/iphone/oglas/apple-iphone-11/3000000 |
| Index oglasi | Seller profile | https://www.index.hr/oglasi/korisnik/-MixSHOP- (and an unknown username) |

Fixtures saved from these pages live in `src/features/marketplaces/<marketplace>/fixtures/`. Seller names, phone numbers, e-mail addresses, websites and logo/avatar URLs are replaced with fixed fake values (`prodavac-test`, `prodavac-01`…, `-TestShop-`, `091 000 0000`, `prodavac@example.com`); everything else is verbatim. Index oglasi fixtures hold the page's API responses instead of HTML (see that folder's README).

## Where the data is

- **Njuškalo** server-renders a Nuxt state object, `window.__INITIAL_STATE__`, on listing and search pages: numeric price, ISO `createdAt`, `state` (`ACTIVE`/`INACTIVE`), all photos (`media.photos[].fullUrl`), the owner (`id`, `profileName`, `profileUrl`, `isPhoneVerified`, `averageRatingAsSeller`, `numberOfReviewsAsSeller`) and the location ("Krapinsko-zagorska, Zabok, Zabok"). Search results only carry a formatted price ("600,43 €"). Seller profiles are older server-rendered pages: a boot JSON (`app.boot.push({"name":"UserProfileDetails"|"BrandPage",…})` with id, name, URL, registration date) plus HTML for the rest. Zagreb locations are written by city district ("Voltino - Trešnjevka - Sjever"); the parser maps the 17 districts to Zagreb.
- **Facebook Marketplace** embeds its Relay data in `<script type="application/json">` blocks. The item is spread over several records with the same ID; search results are `marketplace_search.feed_units.edges`.
- **Index oglasi** is a client-rendered React app. The HTML has no listing data, and the rendered DOM shows only the first 5 of 14 photos and day-level dates. The page fetches everything from Index's own API (`/oglasi/api/aditem/single-ad?code=…`, `/oglasi/api/aditem?text=…`, `/oglasi/api/user/…`, `/oglasi/api/user-rating/overall-count/…`), so the adapter keeps those responses as the page loads them and the parsers read them. We never call the API ourselves. Search results give English category names; listing URLs are built with the Croatian names from `/oglasi/api/configuration/category`, which every page loads.

## 1. What each seller profile shows, and what we parse

| Fact | Njuškalo private (`/korisnik/`) | Njuškalo store (`/trgovina/`) | Facebook | Index oglasi |
| --- | --- | --- | --- | --- |
| Member since | "Registriran na Njuškalu od: 11.12.2007." **parsed** | "Datum registracije: 25.04.2025." **parsed** | not readable | "Registriran 01.02.2022." (ISO in API) **parsed** |
| Location | "49221 Bedekovčina, Krapinsko-zagorska, Hrvatska" **parsed (city)** | "10000 Zagreb, Grad Zagreb, Hrvatska" **parsed (city)** | not readable | city and county **parsed (city)** |
| Rating | only when there are PayProtect ratings | "5,0 (11)", PayProtect buyers only **parsed** | not readable | stars + count, "nema ocjena" when none **parsed when > 0** |
| Active listing count | "4 oglasa" **parsed** | "253 oglasa" **parsed** | not readable | 306 (API `count`) **parsed** |
| Phone verified | "Korisnik je verificirao broj telefona u državi: Hrvatska" **parsed** | not shown | not readable | "Verificiran broj telefona" (`isVerified`) **parsed** |
| E-mail verified | not shown | not shown | not readable | not shown |
| Business or private | "Korisnik nije trgovac te na njega nisu primjenjive EU odredbe o zaštiti potrošača" **parsed** | it's a store **parsed** | not readable | "Pravna osoba" / "Fizička osoba" **parsed** |
| Response time | not shown | not shown | not readable | API field `replyStatisticsMessage`, null for the seller we read; not parsed |
| Sold count | not shown | not shown | not readable | not shown |
| Other | "Pošalji poruku" | web address, e-mail, phone button, buyer review texts ("Ocjene kupaca") | | optional working hours, website, Facebook and Instagram links, description |

Contract change: `sellerFactSchema` gained `{ kind: 'seller_type', type: 'private' | 'business' }`. Both Njuškalo and Index state it on every profile, and it decides whether EU consumer protection applies. No marketplace publishes a sold count or e-mail verification. Response time may exist on Index but was empty, so it isn't modelled. Contact data (e-mail, web, phone) and review texts are not parsed.

Njuškalo agency profiles (`/agencija/…`, real estate) were not looked at; the parser fails with `parse_failed` on a layout it doesn't know.

## 2. Does a Facebook item page read logged out?

Yes, except for the seller. A logged-out Steel session gets title, price (`listing_price.amount` with `currency: "EUR"`), the full description (`redacted_description.text`), every photo (6 here, at 960 px), location text ("Zagreb, Grad Zagreb"), creation time, and `is_live`/`is_sold`. A cookie dialog covers the page and scrolling opens a login modal, but the data is already in the HTML, so neither matters.

The seller is not available: `marketplace_listing_seller` is `null` on item pages and search results. Seller profiles (`/marketplace/profile/<id>/`) answer with a 302 to themselves until Chromium stops with `ERR_TOO_MANY_REDIRECTS`. So Facebook listings have `seller: null`, the reader maps a redirect loop to `blocked`, and `parseFacebookSellerPage` reports Facebook's login page as `blocked` (fixture `login-wall.html`). Seller facts for Facebook have to come from the browser extension (ADR 0003's fallback). A missing item renders Facebook's error route ("This content isn't available right now"), which the parser reports as `removed`.

Search works logged out: 24 results on the first page, each with title, EUR amount, city and creation time.

## 3. Bot protection, rendering waits, headers, rate limits

- **Njuškalo ShieldSquare never triggered.** None of the 16 Njuškalo page loads through the Croatian proxy was redirected to `validate.perfdrive.com`, and Steel's captcha status listed no tasks, so we could not see whether Steel's solver clears it. The reader waits up to 30 s for the page to leave `validate.perfdrive.com` and otherwise fails with `blocked`. The ShieldSquare script still loads on every page. Inactive listings answer HTTP 410 and redirect to their canonical slug; unknown IDs answer 404 (both render a page the parser recognises).
- **Index oglasi** has to be waited on by its API calls, not by page load events: the reader polls until the listing, search or user response has arrived. The seller's name needs a second call (`/user/<creatorId>`) that starts after the listing response, so the reader waits up to 5 s more for it (and for rating and listing count on seller pages). Index reads were the slowest (table below). Unknown usernames answer 404 (reader returns null). The API reports a gone listing as 404 with a pointer to its old category, and statuses as numbers (1 active, 2 paused, 3 sold, 4 deleted, 5 blocked, 6 expired). Search results report the last renewal as `postedTime`; the listing page has the original date.
- **Facebook** needed no special headers through a real browser. The page language was English despite the Croatian proxy, so the parsers key on data and route names, not on text.
- **Rate limits:** no 429s, captchas or slowdowns across 30 sessions spread over 45 minutes. Not a load test.
- **Steel** failed once: connecting over CDP right after creating a session returned `503 session_unavailable` (1 of 30). The reader reports it as `session_failed`; an immediate retry worked.

## 4. Time and bandwidth per read

End-to-end reads through `createSteelMarketplaceReader` (session create, CDP connect, load, parse, release), two runs: the first number is Steel's recorded session duration, the second the wall time around the reader call. Proxy bandwidth is Steel's per-session `proxyBytesUsed`:

| Page | Njuškalo | Facebook | Index oglasi |
| --- | --- | --- | --- |
| Listing | 7.9 s, 8.5 s | 11.4 s, 10.7 s | 16.7 s, 15.6 s |
| Search | 9.4 s, 10.0 s | 12.9 s, 11.2 s | 8.5 s, 18.5 s |
| Seller | 9.5 s, 10.5 s | 13.6 s (`blocked`) | 10.3 s, 18.5 s |
| Proxy bandwidth | 0.65–0.94 MB | 2.1–3.7 MB | 4.3–5.3 MB |

Creating a session took 1–3.6 s and connecting over CDP 1.8–3.8 s of that. At the Launch plan prices quoted in ADR 0002 ($10/GB proxy, $0.10 per browser-hour), a read costs about $0.01 on Njuškalo, $0.02–0.04 on Facebook and $0.04–0.05 on Index oglasi; browser time adds well under $0.001. Index is above ADR 0002's $0.01–0.03 estimate because even with images blocked the app downloads its JavaScript bundle (7.6 MB uncompressed) and configuration files of 1.4–2.6 MB (`configuration/datasource/location`, `ui-config/*.json`) on every load. Blocking those requests might cut it to about Njuškalo's level but wasn't tested; the app may need them before it calls the listing API.

Captcha solving cost nothing here because no captcha appeared.
