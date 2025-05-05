/*
  Warnings:

  - You are about to drop the column `publish` on the `post` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `post` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `post` table. All the data in the column will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `deviceName` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `post` DROP FOREIGN KEY `Post_userId_fkey`;

-- DropIndex
DROP INDEX `Post_userId_fkey` ON `post`;

-- AlterTable
ALTER TABLE `post` DROP COLUMN `publish`,
    DROP COLUMN `title`,
    DROP COLUMN `userId`,
    ADD COLUMN `deviceName` VARCHAR(191) NOT NULL,
    ADD COLUMN `time` DATETIME(3) NOT NULL,
    ADD COLUMN `user` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `user`;
