-- A registration invitation is informational only. It cannot assign an administrator role.
CREATE TABLE "AdminInvitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminInvitation_invitedByUserId_createdAt_idx"
  ON "AdminInvitation"("invitedByUserId","createdAt");
CREATE INDEX "AdminInvitation_email_createdAt_idx"
  ON "AdminInvitation"("email","createdAt");
CREATE INDEX "AdminInvitation_expiresAt_idx" ON "AdminInvitation"("expiresAt");
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
