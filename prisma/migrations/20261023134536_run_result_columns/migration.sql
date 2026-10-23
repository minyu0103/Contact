-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "lastResult" JSONB,
ADD COLUMN     "summary" JSONB,
ADD COLUMN     "testState" JSONB;
