-- AlterTable
ALTER TABLE "Realm" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSpawnAt" TIMESTAMP(3),
ADD COLUMN     "maxConcurrent" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "sealedAt" TIMESTAMP(3),
ADD COLUMN     "sealedById" TEXT,
ADD COLUMN     "spawnIntervalHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "templateId" TEXT;

-- AddForeignKey
ALTER TABLE "Realm" ADD CONSTRAINT "Realm_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Realm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
