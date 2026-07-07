-- AlterTable
ALTER TABLE "Match" DROP COLUMN "lastSyncedAt";

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

