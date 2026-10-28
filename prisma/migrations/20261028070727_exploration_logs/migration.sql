-- CreateEnum
CREATE TYPE "LogKind" AS ENUM ('DIARY', 'CAMERA');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "PostKind" ADD VALUE 'LOG';

-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "hadCamera" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExplorationLog" (
    "id" TEXT NOT NULL,
    "kind" "LogKind" NOT NULL,
    "status" "LogStatus" NOT NULL DEFAULT 'APPROVED',
    "runId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "nodeId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "postId" TEXT NOT NULL,
    "rewardPaid" INTEGER NOT NULL DEFAULT 0,
    "adminComment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ExplorationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExplorationLog_postId_key" ON "ExplorationLog"("postId");

-- CreateIndex
CREATE INDEX "ExplorationLog_realmId_nodeId_idx" ON "ExplorationLog"("realmId", "nodeId");

-- CreateIndex
CREATE INDEX "ExplorationLog_status_createdAt_idx" ON "ExplorationLog"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExplorationLog_runId_kind_key" ON "ExplorationLog"("runId", "kind");

-- AddForeignKey
ALTER TABLE "ExplorationLog" ADD CONSTRAINT "ExplorationLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationLog" ADD CONSTRAINT "ExplorationLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationLog" ADD CONSTRAINT "ExplorationLog_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationLog" ADD CONSTRAINT "ExplorationLog_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationLog" ADD CONSTRAINT "ExplorationLog_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
