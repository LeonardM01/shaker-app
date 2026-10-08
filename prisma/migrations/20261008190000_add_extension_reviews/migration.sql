-- Extension reviews (ADR 0014): all written as the anonymous user, one per
-- seller per extension install. Signed-in reviews keep install_id NULL, and
-- NULLS NOT DISTINCT keeps them at one per seller per user.

ALTER TABLE "review" ADD COLUMN "install_id" TEXT;

DROP INDEX "review_user_id_seller_id_key";

CREATE UNIQUE INDEX "review_user_id_seller_id_install_id_key"
  ON "review"("user_id", "seller_id", "install_id") NULLS NOT DISTINCT;
