-- CreateTable
CREATE TABLE "Pixel" (
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Pixel_pkey" PRIMARY KEY ("x","y")
);

-- CreateTable
CREATE TABLE "History" (
    "id" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);
