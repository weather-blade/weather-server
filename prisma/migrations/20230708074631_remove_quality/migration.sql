/*
  Warnings:

  - You are about to drop the column `qualityId` on the `Readings` table. All the data in the column will be lost.
  - You are about to drop the `Quality` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Readings" DROP CONSTRAINT "Readings_qualityId_fkey";

-- AlterTable
ALTER TABLE "Readings" DROP COLUMN "qualityId";

-- DropTable
DROP TABLE "Quality";
