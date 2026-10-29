-- CreateEnum
CREATE TYPE "ArchiveCategory" AS ENUM ('REALM', 'CREATURE', 'INFECTED');

-- CreateTable
CREATE TABLE "ArchiveEntry" (
    "id" TEXT NOT NULL,
    "category" "ArchiveCategory" NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "adoptedLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveStage" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "hint" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ArchiveStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchiveEntry_adoptedLogId_key" ON "ArchiveEntry"("adoptedLogId");

-- AddForeignKey
ALTER TABLE "ArchiveEntry" ADD CONSTRAINT "ArchiveEntry_adoptedLogId_fkey" FOREIGN KEY ("adoptedLogId") REFERENCES "ExplorationLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveStage" ADD CONSTRAINT "ArchiveStage_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ArchiveEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
