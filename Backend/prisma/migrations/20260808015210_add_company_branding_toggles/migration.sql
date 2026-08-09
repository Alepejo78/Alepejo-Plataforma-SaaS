-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "brandingLoginVideoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "brandingLogoDarkEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "brandingLogoLightEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "brandingSystemNameEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "brandingThemeToggleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sidebarLayout" VARCHAR(10) NOT NULL DEFAULT 'vertical';
