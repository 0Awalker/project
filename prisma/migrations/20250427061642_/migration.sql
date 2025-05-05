/*
  Warnings:

  - Added the required column `number` to the `Records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sn` to the `Records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `records` ADD COLUMN `number` INTEGER NOT NULL,
    ADD COLUMN `sn` VARCHAR(191) NOT NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL;
