/*
  Warnings:

  - Added the required column `costPerItem` to the `Batch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Batch" ADD COLUMN     "costPerItem" DECIMAL(10,2) NOT NULL;
