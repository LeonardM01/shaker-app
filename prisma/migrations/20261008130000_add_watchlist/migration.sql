-- CreateEnum
CREATE TYPE "marketplace" AS ENUM ('njuskalo', 'facebook_marketplace', 'index_oglasi');

-- CreateEnum
CREATE TYPE "listing_status" AS ENUM ('active', 'removed');

-- CreateEnum
CREATE TYPE "verdict" AS ENUM ('great_price', 'fair_price', 'room_to_haggle', 'risk', 'no_data');

-- CreateEnum
CREATE TYPE "risk_evidence_kind" AS ENUM ('duplicate_photo');

-- CreateTable
CREATE TABLE "listing" (
    "id" UUID NOT NULL,
    "marketplace" "marketplace" NOT NULL,
    "external_id" TEXT NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT,
    "photo_key" TEXT,
    "status" "listing_status" NOT NULL DEFAULT 'active',
    "removed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_check" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "verdict" "verdict" NOT NULL,
    "market_average_cents" INTEGER,
    "comparable_count" INTEGER NOT NULL,
    "risk_evidence_kind" "risk_evidence_kind",
    "risk_evidence_count" INTEGER,

    CONSTRAINT "listing_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_listing" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listing_marketplace_external_id_key" ON "listing"("marketplace", "external_id");

-- CreateIndex
CREATE INDEX "listing_check_listing_id_checked_at_idx" ON "listing_check"("listing_id", "checked_at" DESC);

-- CreateIndex
CREATE INDEX "tracked_listing_listing_id_idx" ON "tracked_listing"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_listing_user_id_listing_id_key" ON "tracked_listing"("user_id", "listing_id");

-- AddForeignKey
ALTER TABLE "listing_check" ADD CONSTRAINT "listing_check_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_listing" ADD CONSTRAINT "tracked_listing_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

