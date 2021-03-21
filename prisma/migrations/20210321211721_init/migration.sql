/*
  Warnings:

  - You are about to drop the column `createdAt` on the `browsers` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `browsers` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `devices` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `devices` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `engines` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `engines` table. All the data in the column will be lost.
  - You are about to drop the column `websiteId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `browserId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `engineId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `osId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `oses` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `oses` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `websites` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `websites` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `websites` table. All the data in the column will be lost.
  - The migration will add a unique constraint covering the columns `[browser_id]` on the table `events`. If there are existing duplicate values, the migration will fail.
  - The migration will add a unique constraint covering the columns `[engine_id]` on the table `events`. If there are existing duplicate values, the migration will fail.
  - The migration will add a unique constraint covering the columns `[os_id]` on the table `events`. If there are existing duplicate values, the migration will fail.
  - The migration will add a unique constraint covering the columns `[device_id]` on the table `events`. If there are existing duplicate values, the migration will fail.
  - Added the required column `updated_at` to the `browsers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `devices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `engines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `website_id` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `browser_id` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `engine_id` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `os_id` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `device_id` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `oses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `websites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `websites` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_browserId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_engineId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_osId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_websiteId_fkey";

-- DropForeignKey
ALTER TABLE "websites" DROP CONSTRAINT "websites_userId_fkey";

-- DropIndex
DROP INDEX "events_engineId_unique";

-- DropIndex
DROP INDEX "events_browserId_unique";

-- DropIndex
DROP INDEX "events_osId_unique";

-- DropIndex
DROP INDEX "events_deviceId_unique";

-- AlterTable
ALTER TABLE "browsers" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "devices" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "engines" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "websiteId",
DROP COLUMN "browserId",
DROP COLUMN "engineId",
DROP COLUMN "osId",
DROP COLUMN "deviceId",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "website_id" INTEGER NOT NULL,
ADD COLUMN     "browser_id" INTEGER NOT NULL,
ADD COLUMN     "engine_id" INTEGER NOT NULL,
ADD COLUMN     "os_id" INTEGER NOT NULL,
ADD COLUMN     "device_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "oses" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "websites" DROP COLUMN "userId",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "events_browser_id_unique" ON "events"("browser_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_engine_id_unique" ON "events"("engine_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_os_id_unique" ON "events"("os_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_device_id_unique" ON "events"("device_id");

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("browser_id") REFERENCES "browsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("engine_id") REFERENCES "engines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("os_id") REFERENCES "oses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
