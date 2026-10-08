// Listing vocabulary shared across features and UI. Mirrors the Postgres
// enums in prisma/schema.prisma.

export const marketplaces = ['njuskalo', 'facebook_marketplace', 'index_oglasi'] as const
export type Marketplace = (typeof marketplaces)[number]

export type Verdict = 'great_price' | 'fair_price' | 'room_to_haggle' | 'risk' | 'no_data'
