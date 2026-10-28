-- CreateTable
CREATE TABLE "DiscoverySchedule" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "intervalHours" INTEGER NOT NULL DEFAULT 24,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoverySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryExecution" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "message" TEXT,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "unchanged" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiscoveryExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryWorkerStatus" (
    "id" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryWorkerStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscoverySchedule_keyword_key" ON "DiscoverySchedule"("keyword");

-- CreateIndex
CREATE INDEX "DiscoveryExecution_state_startedAt_idx" ON "DiscoveryExecution"("state", "startedAt");

-- AddForeignKey
ALTER TABLE "DiscoveryExecution" ADD CONSTRAINT "DiscoveryExecution_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DiscoverySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

