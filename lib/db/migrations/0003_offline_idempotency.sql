ALTER TABLE "items"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "items_idempotency_key_unique"
  ON "items" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_unique"
  ON "orders" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "digest_runs"
  ADD COLUMN IF NOT EXISTS "period" TEXT NOT NULL DEFAULT 'daily';

ALTER TABLE "digest_runs"
  DROP CONSTRAINT IF EXISTS "digest_runs_digest_date_unique";

DROP INDEX IF EXISTS "digest_runs_digest_date_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "digest_runs_date_period_unique"
  ON "digest_runs" ("digest_date", "period");
