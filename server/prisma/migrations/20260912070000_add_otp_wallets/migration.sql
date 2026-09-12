ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "otp_verifications" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "otp_verifications_userId_expiresAt_idx" ON "otp_verifications"("userId", "expiresAt");
ALTER TABLE "otp_verifications" DROP CONSTRAINT IF EXISTS "otp_verifications_userId_fkey";
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "wallets" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_userId_key" ON "wallets"("userId");
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_userId_fkey";
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "wallet_transactions" (
  "id" SERIAL NOT NULL,
  "walletId" INTEGER NOT NULL,
  "orderId" INTEGER,
  "amount" DECIMAL(12,2) NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_walletId_orderId_type_key"
  ON "wallet_transactions"("walletId", "orderId", "type");
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_walletId_fkey";
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_orderId_fkey";
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
