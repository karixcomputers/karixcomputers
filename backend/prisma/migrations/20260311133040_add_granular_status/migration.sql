/*
  Warnings:

  - You are about to drop the column `awb` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "awb",
ALTER COLUMN "status" SET DEFAULT 'in_procesare';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "awb" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'in_asteptare';
