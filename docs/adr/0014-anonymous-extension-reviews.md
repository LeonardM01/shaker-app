# 0014: Extension users review anonymously, and their reviews count

- Status: accepted
- Date: 2026-10-08
- Amends: ADR 0011

## Context

The extension has no sign-in, but reviews are the part of Shaker its users can contribute. ADR 0011 requires a signed-in user and allows one review per seller per user, enforced by a unique `(userId, sellerId)`.

## Decision

- **One shared Shaker user, "Anonimni korisnik"**, owns every review posted from the extension. Its `neon_auth` user ID is configuration, not code. The web report's existing reviewer-name join shows that name, so the web app needs no change.
- **One review per seller per extension install.** The extension generates a random install ID once and keeps it in `chrome.storage.local`. Reviews gain a nullable `install_id`; the unique constraint becomes `(user_id, seller_id, install_id)` with `NULLS NOT DISTINCT`, so signed-in users keep one review per seller.
- **A review is still about one listing.** The extension posts against the listing of a completed check.
- **Anonymous reviews count** toward the Shaker rating and Ocjena ponude like signed-in ones.
- **Sellers can still reply** to them through their claim (ADR 0008), on the web.
- `GET /api/extension/v1/sellers/{sellerId}/reviews?cursor=` lists real reviews, paginated, demo reviews excluded. `POST /api/extension/v1/reviews` writes one.
- Korisno and reporting a review stay web-only, behind sign-in.

| ADR 0011 rule | For anonymous reviews |
| --- | --- |
| Only signed-in users review | Replaced by the shared anonymous user |
| One review per seller per user | One per seller per install ID |
| No review of a seller you've claimed | Not enforceable |
| A review is about one listing | Unchanged |
| Demo reviews never count | Unchanged |

## Consequences

- **Grades are manipulable.** The install ID is client-generated and there are no rate limits (ADR 0013), so anyone can post any number of reviews about a seller and move their Ocjena ponude, which is the extension's headline grade. A seller can review themselves. This weakens "fair to both sides" (`PRODUCT.md`); the seller's reply is the only counterweight. Revisit before the extension is public: rate limits, excluding or down-weighting anonymous reviews in scores, or extension sign-in.
- Anonymous reviews are not distinguishable from each other by reader, only by the hidden install ID.
- Needs a migration (raw SQL for `NULLS NOT DISTINCT`, Postgres 15+) and the anonymous user created in Neon Auth.
