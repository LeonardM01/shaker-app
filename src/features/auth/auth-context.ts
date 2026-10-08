// What the auth screens' context panel shows. Plain serialisable data: money
// is integer cents. Never carries an offer or anything derived from one.

import type { Verdict } from '#/lib/listing'

/** The listing the visitor came from, reduced to what the panel shows. */
export type AuthContextListing = {
  title: string
  photoUrl: string | null
  /** `risk` is dropped: its red belongs next to the evidence, in the report. */
  verdict: Exclude<Verdict, 'risk'> | null
  priceCents: number
}

export type AuthContext = { kind: 'generic' } | { kind: 'listing'; listing: AuthContextListing }
