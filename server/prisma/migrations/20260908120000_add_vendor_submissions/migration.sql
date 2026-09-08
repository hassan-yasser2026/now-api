-- Vendor-created content is private until an administrator approves it.
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_ADMIN_REVIEW', 'APPROVED', 'REJECTED');

ALTER TABLE "stores"
  ADD COLUMN "approvalStatus" "SubmissionStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "menu_items"
  ADD COLUMN "approvalStatus" "SubmissionStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "rejectionReason" TEXT;

CREATE TABLE "offers" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
  "discountValue" DECIMAL(12,2) NOT NULL,
  "image" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "approvalStatus" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW',
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offers_storeId_approvalStatus_isActive_idx"
  ON "offers"("storeId", "approvalStatus", "isActive");

ALTER TABLE "offers"
  ADD CONSTRAINT "offers_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "stores_approvalStatus_idx" ON "stores"("approvalStatus");
CREATE INDEX "menu_items_approvalStatus_idx" ON "menu_items"("approvalStatus");
