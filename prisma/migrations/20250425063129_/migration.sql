/*
  Warnings:

  - Added the required column `assets_tag` to the `Records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `records` ADD COLUMN `assets_tag` VARCHAR(191) NOT NULL;
