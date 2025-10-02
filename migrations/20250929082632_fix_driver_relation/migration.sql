-- CreateTable
CREATE TABLE `owners` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLogin` DATETIME(3) NULL,

    UNIQUE INDEX `owners_username_key`(`username`),
    UNIQUE INDEX `owners_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `licensePlate` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `dingtalkWebhook` VARCHAR(191) NULL,
    `dingtalkSign` BOOLEAN NOT NULL DEFAULT false,
    `dingtalkKeyword` VARCHAR(191) NULL,
    `dingtalkSecret` VARCHAR(191) NULL,
    `wechatWebhook` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vehicle_licensePlate_key`(`licensePlate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Driver` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `dingtalkWebhook` VARCHAR(191) NULL,
    `dingtalkSign` BOOLEAN NOT NULL DEFAULT false,
    `dingtalkKeyword` VARCHAR(191) NULL,
    `dingtalkSecret` VARCHAR(191) NULL,
    `wechatWebhook` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Code` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiredAt` DATETIME(3) NULL,

    UNIQUE INDEX `Code_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `records` (
    `id` VARCHAR(191) NOT NULL,
    `codeId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `scanTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `message` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Driver` ADD CONSTRAINT `Driver_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Code` ADD CONSTRAINT `Code_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Code` ADD CONSTRAINT `Code_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Code` ADD CONSTRAINT `Code_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_codeId_fkey` FOREIGN KEY (`codeId`) REFERENCES `Code`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
