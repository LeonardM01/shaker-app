# 0008: A seller is one marketplace account; no automatic cross-platform linking

- Status: accepted
- Date: 2026-10-08

## Context

The report's "Prodavač i recenzije" section mixes marketplace profile facts (member since, response time, phone verified), Vrijedi.Ly reviews, and "Isti profil na Njuškalu i Facebooku". Linking accounts across marketplaces automatically would mean matching phone numbers, names or profile photos: personal-data processing under GDPR, and false links would move one seller's reviews onto another (against "fair to both sides").

## Decision

- A **seller** is one marketplace account, keyed by `(marketplace, externalSellerId)`. The "Prodavač i recenzije" check step scrapes its profile through Steel. The report shows only facts the marketplace actually publishes; rows such as "126 prodanih oglasa" are dropped unless a marketplace shows them.
- Vrijedi.Ly reviews attach to the seller and record the listing they are about.
- No automatic cross-platform linking. "Isti profil na …" appears only when the seller has claimed both accounts.
- **Claiming (MVP):** a signed-in user presses a button on the report (right rail) to claim the listing, which claims its seller account. The claim is treated as verified: no ownership proof, no "unverified" labels, no limits. Proof (e.g. a code in a listing description) comes after the MVP.

## Consequences

- Seller rows that the design shows but marketplaces don't publish must be removed from the design.
- Until ownership proof exists, anyone can claim any listing: reply to reviews as that seller, and link accounts across marketplaces. Disputes are fixed by hand in the database. Revisit before public launch.
