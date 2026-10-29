-- CreateTable
CREATE TABLE "OwnerSession" (
    "id" TEXT NOT NULL,
    "passwordVersion" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerLoginState" (
    "id" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "OwnerLoginState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerSession_expiresAt_idx" ON "OwnerSession"("expiresAt");

