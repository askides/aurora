/*
  Warnings:

  - The migration will add a unique constraint covering the columns `[url]` on the table `websites`. If there are existing duplicate values, the migration will fail.
  - The migration will add a unique constraint covering the columns `[seed]` on the table `websites`. If there are existing duplicate values, the migration will fail.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "websites.url_unique" ON "websites"("url");

-- CreateIndex
CREATE UNIQUE INDEX "websites.seed_unique" ON "websites"("seed");
