-- CreateTable
CREATE TABLE "Pixel" (
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Pixel_pkey" PRIMARY KEY ("x","y")
);

-- CreateTable
CREATE TABLE "History" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blobUrl" TEXT NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "History_timestamp_idx" ON "History"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "Snapshot_timestamp_idx" ON "Snapshot"("timestamp" DESC);
