-- CreateEnum
CREATE TYPE "TradeKind" AS ENUM ('SELL', 'BARTER', 'REQUEST');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PostKind" ADD VALUE 'TRADE';

-- CreateTable
CREATE TABLE "TradeListing" (
    "id" TEXT NOT NULL,
    "kind" "TradeKind" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "offerItemId" TEXT,
    "offerQty" INTEGER NOT NULL DEFAULT 1,
    "askPoints" INTEGER NOT NULL DEFAULT 0,
    "askItemId" TEXT,
    "askQty" INTEGER NOT NULL DEFAULT 1,
    "counterpartyId" TEXT,
    "deliveredItemId" TEXT,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TradeListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "startPrice" INTEGER NOT NULL DEFAULT 100,
    "minIncrement" INTEGER NOT NULL DEFAULT 10,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'OPEN',
    "winnerId" TEXT,
    "finalPrice" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeListing_postId_key" ON "TradeListing"("postId");

-- CreateIndex
CREATE INDEX "TradeListing_status_createdAt_idx" ON "TradeListing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Auction_status_endsAt_idx" ON "Auction"("status", "endsAt");

-- CreateIndex
CREATE INDEX "Bid_auctionId_amount_idx" ON "Bid"("auctionId", "amount");

-- AddForeignKey
ALTER TABLE "TradeListing" ADD CONSTRAINT "TradeListing_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeListing" ADD CONSTRAINT "TradeListing_offerItemId_fkey" FOREIGN KEY ("offerItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeListing" ADD CONSTRAINT "TradeListing_askItemId_fkey" FOREIGN KEY ("askItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeListing" ADD CONSTRAINT "TradeListing_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeListing" ADD CONSTRAINT "TradeListing_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
