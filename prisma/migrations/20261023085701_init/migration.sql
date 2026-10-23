-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AbilityCategory" AS ENUM ('COMBAT', 'SEARCH', 'PRODUCTION', 'SPECIAL');

-- CreateEnum
CREATE TYPE "AbilityStatus" AS ENUM ('PENDING', 'ACTIVE', 'RETURNED');

-- CreateEnum
CREATE TYPE "CheckType" AS ENUM ('COMBAT', 'SEARCH', 'CRAFT', 'GENERAL');

-- CreateEnum
CREATE TYPE "AbilityEffectType" AS ENUM ('CHECK_BONUS', 'EXTRA_DICE', 'AUTO_SUCCESS', 'TELEPORT', 'CRAFT_DOUBLE', 'NARRATIVE');

-- CreateEnum
CREATE TYPE "RealmKind" AS ENUM ('FIXED', 'INSTANT', 'SPECIAL');

-- CreateEnum
CREATE TYPE "SceneKind" AS ENUM ('BASE', 'EVENT');

-- CreateEnum
CREATE TYPE "LockedDisplay" AS ENUM ('HIDE', 'SHOW_LOCKED');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('CONSUMABLE', 'INFECTED', 'MATERIAL', 'KEY', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "UsableIn" AS ENUM ('RUN', 'OUTSIDE', 'BOTH');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('ACTIVE', 'ESCAPED', 'FALLEN', 'ABORTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "usedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" "AbilityCategory" NOT NULL,
    "abilityName" TEXT NOT NULL,
    "abilityDesc" TEXT NOT NULL,
    "abilityStatus" "AbilityStatus" NOT NULL DEFAULT 'PENDING',
    "abilityComment" TEXT NOT NULL DEFAULT '',
    "proficiencyCheckType" "CheckType",
    "proficiency" INTEGER NOT NULL DEFAULT 1,
    "proficiencyExp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "statPoints" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "mp" INTEGER NOT NULL,
    "maxMp" INTEGER NOT NULL,
    "erosion" INTEGER NOT NULL DEFAULT 0,
    "ap" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "escapeCount" INTEGER NOT NULL DEFAULT 0,
    "autoSuccessUsedToday" INTEGER NOT NULL DEFAULT 0,
    "teleportUsedToday" INTEGER NOT NULL DEFAULT 0,
    "lastDailyResetKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbilityEffect" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" "AbilityEffectType" NOT NULL,
    "checkType" "CheckType",
    "value" INTEGER NOT NULL DEFAULT 0,
    "perDay" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AbilityEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbilityTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbilityTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterTag" (
    "characterId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "CharacterTag_pkey" PRIMARY KEY ("characterId","tagId")
);

-- CreateTable
CREATE TABLE "Realm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intro" TEXT NOT NULL DEFAULT '',
    "kind" "RealmKind" NOT NULL DEFAULT 'FIXED',
    "mapX" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "mapY" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "startNodeId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Realm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "depth" INTEGER NOT NULL DEFAULT 1,
    "isExit" BOOLEAN NOT NULL DEFAULT false,
    "entryErosion" INTEGER,
    "rewardNew" INTEGER,
    "rewardKnown" INTEGER,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revealedAt" TIMESTAMP(3),
    "revealedById" TEXT,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edge" (
    "id" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "bidirectional" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "checkType" "CheckType",
    "checkTarget" INTEGER,
    "failText" TEXT NOT NULL DEFAULT '',
    "failEffects" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "kind" "SceneKind" NOT NULL DEFAULT 'BASE',
    "name" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "chance" INTEGER NOT NULL DEFAULT 100,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Choice" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "lockedDisplay" "LockedDisplay" NOT NULL DEFAULT 'HIDE',
    "checkType" "CheckType",
    "checkTarget" INTEGER,
    "oncePerRun" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "successOutcomeId" TEXT,
    "failOutcomeId" TEXT,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "effects" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "category" "ItemCategory" NOT NULL DEFAULT 'CONSUMABLE',
    "effects" JSONB NOT NULL DEFAULT '[]',
    "usableIn" "UsableIn" NOT NULL DEFAULT 'BOTH',
    "stackLimit" INTEGER NOT NULL DEFAULT 99,
    "shopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 0,
    "minEscapes" INTEGER NOT NULL DEFAULT 0,
    "sellPrice" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DropTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropEntry" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "itemId" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DropEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'ACTIVE',
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "currentNodeId" TEXT,
    "currentSceneId" TEXT,
    "previousNodeId" TEXT,
    "revealedNodeIds" JSONB NOT NULL DEFAULT '[]',
    "visitedNodeIds" JSONB NOT NULL DEFAULT '[]',
    "flags" JSONB NOT NULL DEFAULT '[]',
    "usedChoiceIds" JSONB NOT NULL DEFAULT '[]',
    "loot" JSONB NOT NULL DEFAULT '[]',
    "modifiers" JSONB NOT NULL DEFAULT '[]',
    "lostLoot" JSONB NOT NULL DEFAULT '[]',
    "clues" JSONB NOT NULL DEFAULT '[]',
    "exp" INTEGER NOT NULL DEFAULT 0,
    "reward" INTEGER NOT NULL DEFAULT 0,
    "forceResult" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "nodeId" TEXT,
    "choiceText" TEXT,
    "text" TEXT NOT NULL DEFAULT '',
    "checkDetail" JSONB,
    "deltas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_usedById_key" ON "InviteCode"("usedById");

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_key" ON "Character"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AbilityTag_name_key" ON "AbilityTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Choice_successOutcomeId_key" ON "Choice"("successOutcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "Choice_failOutcomeId_key" ON "Choice"("failOutcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_characterId_itemId_key" ON "InventoryItem"("characterId", "itemId");

-- CreateIndex
CREATE INDEX "Run_characterId_status_idx" ON "Run"("characterId", "status");

-- CreateIndex
CREATE INDEX "RunLog_runId_seq_idx" ON "RunLog"("runId", "seq");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbilityEffect" ADD CONSTRAINT "AbilityEffect_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTag" ADD CONSTRAINT "CharacterTag_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTag" ADD CONSTRAINT "CharacterTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "AbilityTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_revealedById_fkey" FOREIGN KEY ("revealedById") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_successOutcomeId_fkey" FOREIGN KEY ("successOutcomeId") REFERENCES "Outcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_failOutcomeId_fkey" FOREIGN KEY ("failOutcomeId") REFERENCES "Outcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropEntry" ADD CONSTRAINT "DropEntry_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DropTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropEntry" ADD CONSTRAINT "DropEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunLog" ADD CONSTRAINT "RunLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunLog" ADD CONSTRAINT "RunLog_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
