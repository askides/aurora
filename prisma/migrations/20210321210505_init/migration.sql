/*
  Warnings:

  - You are about to drop the `Browser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Device` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Engine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Os` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Website` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_browserId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_engineId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_osId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_websiteId_fkey";

-- DropForeignKey
ALTER TABLE "Website" DROP CONSTRAINT "Website_userId_fkey";

-- DropTable
DROP TABLE "Browser";

-- DropTable
DROP TABLE "Device";

-- DropTable
DROP TABLE "Engine";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "Os";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Website";

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "element" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "browserId" INTEGER NOT NULL,
    "engineId" INTEGER NOT NULL,
    "osId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browsers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "version" VARCHAR(255) NOT NULL,
    "major" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engines" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "version" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "version" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "vendor" VARCHAR(255) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "firstname" VARCHAR(255) NOT NULL,
    "lastname" VARCHAR(255) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_browserId_unique" ON "events"("browserId");

-- CreateIndex
CREATE UNIQUE INDEX "events_engineId_unique" ON "events"("engineId");

-- CreateIndex
CREATE UNIQUE INDEX "events_osId_unique" ON "events"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "events_deviceId_unique" ON "events"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "users.email_unique" ON "users"("email");

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("browserId") REFERENCES "browsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("engineId") REFERENCES "engines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("osId") REFERENCES "oses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
