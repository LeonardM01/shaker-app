# Index oglasi fixtures

Index oglasi renders in the browser, so its HTML is an empty shell plus about 1 MB of inline CSS. The parsers read the JSON the page fetches from Index's own API while it loads in the Steel session (see `../api-responses.ts`), so each fixture holds only those responses, verbatim, not the HTML.

Each file is `{ pageUrl, capturedAt, responses: [{ url, status, body }] }`, captured through Steel on 2026-10-08:

| File | Page | Responses |
| --- | --- | --- |
| `listing-page.json` | listing 6053031 | `aditem/single-ad?code=…`, `user/<id>` |
| `listing-page-removed.json` | listing 3000000 (gone) | `aditem/single-ad?code=…` (HTTP 404) |
| `search-page.json` | search "iPhone 13 Pro 128 GB" | `configuration/category`, `aditem?text=…` |
| `search-page-broad.json` | search "iPhone 13 Pro" | `configuration/category`, `aditem?text=…` |
| `seller-page.json` | the listing's seller | `user/<username>`, `user-rating/overall-count/<id>`, `aditem?userId=…` |

Redacted: the seller's username and shop name (now `-TestShop-` / `TestShop`), its web and Instagram handles, the phone numbers in the description (`091 000 0000`) and the avatar path. Listing photo paths and IDs are unchanged.
