/*
  Warnings:

  - The migration will add a unique constraint covering the columns `[engineId]` on the table `Event`. If there are existing duplicate values, the migration will fail.
  - The migration will add a unique constraint covering the columns `[osId]` on the table `Event`. If there are existing duplicate values, the migration will fail.
  - The migration will add a unique constraint covering the columns `[deviceId]` on the table `Event`. If there are existing duplicate values, the migration will fail.
  - Added the required column `engineId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `osId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceId` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "engineId" INTEGER NOT NULL,
ADD COLUMN     "osId" INTEGER NOT NULL,
ADD COLUMN     "deviceId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Event_engineId_unique" ON "Event"("engineId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_osId_unique" ON "Event"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_deviceId_unique" ON "Event"("deviceId");

-- AddForeignKey
ALTER TABLE "Event" ADD FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD FOREIGN KEY ("osId") REFERENCES "Os"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
