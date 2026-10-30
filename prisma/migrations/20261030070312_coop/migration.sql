-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('FORMING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "PartyMemberStatus" AS ENUM ('INVITED', 'JOINED', 'LEFT', 'FALLEN');

-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "partyId" TEXT;

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "status" "PartyStatus" NOT NULL DEFAULT 'FORMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyMember" (
    "partyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "PartyMemberStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyMember_pkey" PRIMARY KEY ("partyId","characterId")
);

-- CreateIndex
CREATE INDEX "PartyMember_characterId_status_idx" ON "PartyMember"("characterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Run_partyId_key" ON "Run"("partyId");

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMember" ADD CONSTRAINT "PartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMember" ADD CONSTRAINT "PartyMember_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

