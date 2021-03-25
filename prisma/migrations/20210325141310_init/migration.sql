/*
  Warnings:

  - Added the required column `seed` to the `websites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "websites" ADD COLUMN     "seed" TEXT NOT NULL;
