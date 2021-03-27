/*
  Warnings:

  - Added the required column `name` to the `websites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "websites" ADD COLUMN     "name" TEXT NOT NULL;
