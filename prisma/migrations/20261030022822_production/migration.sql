-- AlterEnum
ALTER TYPE "ItemCategory" ADD VALUE 'FACTOR';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "crafterId" TEXT,
ADD COLUMN     "isCrafted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "traitTag" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "EquippedItem" (
    "characterId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "EquippedItem_pkey" PRIMARY KEY ("characterId","slot")
);

-- CreateTable
CREATE TABLE "FactorTrait" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "bonusEffects" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "FactorTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseItemId" TEXT NOT NULL,
    "resultItemId" TEXT NOT NULL,
    "checkTarget" INTEGER NOT NULL DEFAULT 7,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FactorTrait_tag_key" ON "FactorTrait"("tag");

-- AddForeignKey
ALTER TABLE "EquippedItem" ADD CONSTRAINT "EquippedItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquippedItem" ADD CONSTRAINT "EquippedItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_baseItemId_fkey" FOREIGN KEY ("baseItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_resultItemId_fkey" FOREIGN KEY ("resultItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
