-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
