# Glossary

Domain terms used in code, issues and docs. Croatian UI words are in parentheses.

**Listing** (oglas). One item for sale on a marketplace, identified by marketplace + the marketplace's own ID. Shared by every user. Avoid: post, ad.

**Check** (provjera). One run of the pipeline on a listing a user asked about: read the listing, extract, find comparables, score, write the report.

**Checked listing.** A listing that has been through at least one check, so we have its full page, photos and extraction.

**Comparable observation.** A listing we only saw on a marketplace search results page: title, price, city, URL, seen-at. No photos, no extraction beyond product attributes.

**Search key.** A short normalized name of the item for sale (e.g. `iPhone 13 Pro 128 GB`), produced when a listing is checked. Used both as the marketplace search query and as the tokens a comparable's title must contain.

**Ocjena ponude** (offer score). 0–100 score of how good a deal the listing is: price fairness against comparables, combined with the seller's reviews on Shaker. Needs at least 5 reviews; shown as a score only, without the comparable count. Not the same as the verdict.

**Verdict** (presuda: Odlična cijena, Fer cijena, Prostor za pregovor, Rizik, Nema podataka). The badge next to the price. Based on price against comparables only.

**Kvaliteta oglasa** (listing quality). 0–100 score of how well the listing informs a buyer: photos, completeness of the description, stated defects, contradictions between text and photos.

**Comparable** (usporedivi oglas). A checked listing or comparable observation in the same category whose title contains every search-key token and no excluded word, seen in the last 30 days. Avoid: similar post.
