# Glossary

Domain terms used in code, issues and docs. Croatian UI words are in parentheses.

**Listing** (oglas). One item for sale on a marketplace, identified by marketplace + the marketplace's own ID. Shared by every user. Avoid: post, ad.

**Check** (provjera). One run of the pipeline on a listing a user asked about: read the listing, extract, find comparables, score, write the report.

**Check step.** One stage of a check (read listing, store photos, extract, find comparables, score) with its own status, retries and error code. Shown as a row on "Provjera u tijeku".

**Checked listing.** A listing that has been through at least one check, so we have its full page, photos and extraction.

**Comparable observation.** A listing we only saw on a marketplace search results page: title, price, city, URL, seen-at. No photos, no extraction beyond product attributes.

**Seller** (prodavač). One marketplace account, identified by marketplace + the marketplace's seller ID. Two accounts of the same person are two sellers unless the person claims both. Avoid: user (that's a Shaker account).

**Claim** (preuzimanje oglasa). A signed-in Shaker user saying "this listing, and so its seller account, is mine". Unlocks replying to reviews and linking the user's accounts on other marketplaces.

**Scam pattern** (obrazac prijevare). One entry of the fixed catalogue in ADR 0010, with a strength (strong, medium, weak). A pattern that fires carries its evidence. Avoid: red flag, fraud score.

**Review** (recenzija). A user's rating of a seller, about one listing. One per seller per user; reviews posted from the extension belong to the shared anonymous user, one per seller per install ID (ADR 0014).

**Install ID.** A random ID the extension generates once per installation. Not an account: it only limits anonymous reviews to one per seller.

**Extension API.** The anonymous JSON endpoints under `/api/extension/v1/` the browser extension calls (ADR 0013). Returns the web report's data in the web report's terms. Avoid: insights (the extension's old demo name).

**Potvrđena kupnja** (verified purchase). A review whose purchase has been proven. Placeholder for now: always false on real reviews until we have a way to prove purchases.

**Search key.** A short normalized name of the item for sale (e.g. `iPhone 13 Pro 128 GB`), produced when a listing is checked. Used both as the marketplace search query and as the tokens a comparable's title must contain.

**Ocjena ponude** (offer score). 0–100 score of how good a deal the listing is: price fairness against comparables, combined with the seller's reviews on Shaker. Needs at least 5 reviews; shown as a score only, without the comparable count. Not the same as the verdict.

**Verdict** (presuda: Odlična cijena, Fer cijena, Prostor za pregovor, Rizik, Nema podataka). The badge next to the price. Based on price against comparables only.

**Kvaliteta oglasa** (listing quality). 0–100 score of how well the listing informs a buyer: photos, completeness of the description, stated defects, contradictions between text and photos.

**Comparable** (usporedivi oglas). A checked listing or comparable observation in the same category whose title contains every search-key token and no excluded word, seen in the last 30 days. Avoid: similar post.
