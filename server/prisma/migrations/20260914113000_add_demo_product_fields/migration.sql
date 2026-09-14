ALTER TABLE "menu_items"
  ADD COLUMN "originalPrice" DECIMAL(12,2),
  ADD COLUMN "discountType" TEXT,
  ADD COLUMN "discountValue" DECIMAL(12,2),
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "demoRating" DECIMAL(3,2),
  ADD COLUMN "demoRatingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ratings"
  ADD COLUMN "menuItemId" INTEGER;

CREATE INDEX "ratings_menuItemId_createdAt_idx" ON "ratings"("menuItemId", "createdAt");

ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
