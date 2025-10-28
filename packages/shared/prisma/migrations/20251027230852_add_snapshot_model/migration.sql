-- CreateTable
CREATE TABLE "Snapshot" (
    "id" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blobUrl" TEXT NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snapshot_timestamp_idx" ON "Snapshot"("timestamp");
