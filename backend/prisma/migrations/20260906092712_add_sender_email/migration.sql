/*
  Warnings:

  - Added the required column `senderEmail` to the `emails` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "senderEmail" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "emails_senderEmail_idx" ON "emails"("senderEmail");
