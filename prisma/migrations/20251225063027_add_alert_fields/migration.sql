-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "expiryAlertDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "lowStockAlertQty" INTEGER NOT NULL DEFAULT 10;
