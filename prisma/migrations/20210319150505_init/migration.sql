/*
  Warnings:

  - Made the column `deviceId` on table `Event` required. The migration will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "deviceId" SET NOT NULL;
