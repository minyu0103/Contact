-- CreateEnum
CREATE TYPE "StoryConditionType" AS ENUM ('REALM_PROGRESS', 'SERVER_ESCAPES', 'DATE', 'MANUAL');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "isNpc" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StoryEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "bannerText" TEXT NOT NULL DEFAULT '',
    "bannerDays" INTEGER NOT NULL DEFAULT 3,
    "conditionType" "StoryConditionType" NOT NULL DEFAULT 'MANUAL',
    "realmId" TEXT,
    "threshold" INTEGER NOT NULL DEFAULT 50,
    "triggerAt" TIMESTAMP(3),
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardItemId" TEXT,
    "rewardQty" INTEGER NOT NULL DEFAULT 1,
    "publishRealmId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryEvent_pkey" PRIMARY KEY ("id")
);
