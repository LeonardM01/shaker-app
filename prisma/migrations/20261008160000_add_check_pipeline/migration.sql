-- Comparables match on normalized titles through a trigram index (ADR 0002).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "listing_kind" AS ENUM ('checked', 'observation');

-- CreateEnum
CREATE TYPE "listing_category" AS ENUM ('phones', 'computers', 'tablets', 'game_consoles', 'audio_video', 'cameras', 'cars', 'motorcycles', 'bicycles', 'furniture', 'appliances', 'clothing', 'sports', 'tools', 'other');

-- CreateEnum
CREATE TYPE "check_status" AS ENUM ('running', 'completed', 'failed', 'removed');

-- CreateEnum
CREATE TYPE "check_step_name" AS ENUM ('read', 'photos', 'extract', 'comparables_njuskalo', 'comparables_facebook_marketplace', 'comparables_index_oglasi', 'seller', 'scam', 'score', 'write');

-- CreateEnum
CREATE TYPE "check_step_status" AS ENUM ('queued', 'running', 'done', 'failed', 'skipped');

-- AlterEnum
ALTER TYPE "risk_evidence_kind" ADD VALUE 'off_platform_payment_link';
ALTER TYPE "risk_evidence_kind" ADD VALUE 'price_far_below_market';
ALTER TYPE "risk_evidence_kind" ADD VALUE 'off_platform_contact';
ALTER TYPE "risk_evidence_kind" ADD VALUE 'advance_payment_only';
ALTER TYPE "risk_evidence_kind" ADD VALUE 'urgency_pressure';

-- AlterTable
ALTER TABLE "listing" ADD COLUMN     "category" "listing_category",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "listing_kind" NOT NULL DEFAULT 'checked',
ADD COLUMN     "neighbourhood" TEXT,
ADD COLUMN     "normalized_title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "posted_at" TIMESTAMPTZ,
ADD COLUMN     "price_cents" INTEGER,
ADD COLUMN     "search_key" TEXT,
ADD COLUMN     "seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "seller_id" UUID;

-- Approximates normalizeTitle() for rows from before this migration; the
-- next check of each listing rewrites it exactly.
UPDATE "listing" SET "normalized_title" = ' ' || lower("title") || ' ';
ALTER TABLE "listing" ALTER COLUMN "normalized_title" DROP DEFAULT;

-- AlterTable
ALTER TABLE "listing_check" ADD COLUMN     "canonical_url" TEXT,
ADD COLUMN     "checklist" JSONB,
ADD COLUMN     "comparable_stats" JSONB,
ADD COLUMN     "facts" JSONB,
ADD COLUMN     "jev_answers" JSONB,
ADD COLUMN     "listing_quality" JSONB,
ADD COLUMN     "marketplace" "marketplace",
ADD COLUMN     "offer_message" TEXT,
ADD COLUMN     "offer_score" JSONB,
ADD COLUMN     "price_verdict" "verdict",
ADD COLUMN     "questions" JSONB,
ADD COLUMN     "ruleset_version" TEXT,
ADD COLUMN     "scam_results" JSONB,
ADD COLUMN     "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "check_status" NOT NULL DEFAULT 'completed',
ADD COLUMN     "suggested_offer" JSONB,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "widened_match" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "listing_id" DROP NOT NULL,
ALTER COLUMN "checked_at" DROP NOT NULL,
ALTER COLUMN "price_cents" DROP NOT NULL,
ALTER COLUMN "verdict" SET DEFAULT 'no_data',
ALTER COLUMN "comparable_count" SET DEFAULT 0;

-- Checks from before this migration were all finished ones.
UPDATE "listing_check" AS c
SET "canonical_url" = l."canonical_url", "marketplace" = l."marketplace", "started_at" = c."checked_at"
FROM "listing" AS l
WHERE l."id" = c."listing_id";
ALTER TABLE "listing_check"
ALTER COLUMN "canonical_url" SET NOT NULL,
ALTER COLUMN "marketplace" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'running';

-- CreateTable
CREATE TABLE "listing_photo" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "phash" BIGINT NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_step" (
    "id" UUID NOT NULL,
    "check_id" UUID NOT NULL,
    "name" "check_step_name" NOT NULL,
    "status" "check_step_status" NOT NULL DEFAULT 'queued',
    "error_code" TEXT,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "summary" JSONB,

    CONSTRAINT "check_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_comparable" (
    "id" UUID NOT NULL,
    "check_id" UUID NOT NULL,
    "comparable_listing_id" UUID NOT NULL,
    "marketplace" "marketplace" NOT NULL,
    "price_cents" INTEGER NOT NULL,

    CONSTRAINT "listing_comparable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller" (
    "id" UUID NOT NULL,
    "marketplace" "marketplace" NOT NULL,
    "external_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "profile_url" TEXT,
    "member_since" TIMESTAMPTZ,
    "city" TEXT,
    "profile_facts" JSONB,
    "last_scraped_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_claim" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "seller_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "seller_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "stars" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "review_stars_check" CHECK ("stars" BETWEEN 1 AND 5)
);

-- CreateTable
CREATE TABLE "review_reply" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpful" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_report" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_tick" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" UUID NOT NULL,
    "item_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_tick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listing_photo_listing_id_position_key" ON "listing_photo"("listing_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "check_step_check_id_name_key" ON "check_step"("check_id", "name");

-- CreateIndex
CREATE INDEX "listing_comparable_check_id_idx" ON "listing_comparable"("check_id");

-- CreateIndex
CREATE INDEX "listing_comparable_comparable_listing_id_idx" ON "listing_comparable"("comparable_listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_marketplace_external_id_key" ON "seller"("marketplace", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_claim_seller_id_key" ON "seller_claim"("seller_id");

-- CreateIndex
CREATE INDEX "seller_claim_user_id_idx" ON "seller_claim"("user_id");

-- CreateIndex
CREATE INDEX "review_seller_id_created_at_idx" ON "review"("seller_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "review_user_id_seller_id_key" ON "review"("user_id", "seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_reply_review_id_key" ON "review_reply"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_review_id_user_id_key" ON "review_helpful"("review_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_report_review_id_user_id_key" ON "review_report"("review_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_tick_user_id_listing_id_item_key_key" ON "checklist_tick"("user_id", "listing_id", "item_key");

-- CreateIndex
CREATE INDEX "listing_marketplace_category_seen_at_idx" ON "listing"("marketplace", "category", "seen_at" DESC);

-- CreateIndex
CREATE INDEX "listing_normalized_title_idx" ON "listing" USING GIN ("normalized_title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "listing_seller_id_idx" ON "listing"("seller_id");

-- CreateIndex
CREATE INDEX "listing_check_canonical_url_started_at_idx" ON "listing_check"("canonical_url", "started_at" DESC);

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_photo" ADD CONSTRAINT "listing_photo_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_step" ADD CONSTRAINT "check_step_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "listing_check"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_comparable" ADD CONSTRAINT "listing_comparable_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "listing_check"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_comparable" ADD CONSTRAINT "listing_comparable_comparable_listing_id_fkey" FOREIGN KEY ("comparable_listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_claim" ADD CONSTRAINT "seller_claim_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reply" ADD CONSTRAINT "review_reply_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_tick" ADD CONSTRAINT "checklist_tick_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

