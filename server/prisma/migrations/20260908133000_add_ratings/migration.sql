CREATE TABLE "ratings" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "storeId" INTEGER NOT NULL,
  "stars" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ratings_orderId_key" ON "ratings"("orderId");
CREATE INDEX "ratings_storeId_createdAt_idx" ON "ratings"("storeId", "createdAt");
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
