ALTER TABLE "users"
  ADD COLUMN "approvalStatus" "SubmissionStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "rejectionReason" TEXT;

CREATE INDEX "users_approvalStatus_idx" ON "users"("approvalStatus");
