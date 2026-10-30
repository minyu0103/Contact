-- CreateEnum
CREATE TYPE "SpecialStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "PostKind" ADD VALUE 'REPORT';

-- AlterTable
ALTER TABLE "Realm" ADD COLUMN     "applicantId" TEXT;

-- CreateTable
CREATE TABLE "SpecialApplication" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "SpecialStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "atmosphere" TEXT NOT NULL,
    "master" TEXT NOT NULL,
    "anomalies" TEXT NOT NULL,
    "extra" TEXT NOT NULL DEFAULT '',
    "adminComment" TEXT NOT NULL DEFAULT '',
    "rewardPaid" INTEGER NOT NULL DEFAULT 0,
    "isReportPublic" BOOLEAN NOT NULL DEFAULT false,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "realmId" TEXT,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "SpecialApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialApplication_realmId_key" ON "SpecialApplication"("realmId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialApplication_postId_key" ON "SpecialApplication"("postId");

-- CreateIndex
CREATE INDEX "SpecialApplication_status_createdAt_idx" ON "SpecialApplication"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SpecialApplication" ADD CONSTRAINT "SpecialApplication_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialApplication" ADD CONSTRAINT "SpecialApplication_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialApplication" ADD CONSTRAINT "SpecialApplication_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
