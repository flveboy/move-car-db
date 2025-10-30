-- AlterTable
ALTER TABLE `records` ADD COLUMN `driverId` VARCHAR(191) NULL,
    ADD COLUMN `sessionId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `replies` (
    `id` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `senderType` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'ADMIN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `replies_recordId_fkey`(`recordId`),
    INDEX `replies_senderId_fkey`(`senderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configs` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `type` ENUM('BOOLEAN', 'STRING', 'NUMBER', 'JSON') NOT NULL DEFAULT 'BOOLEAN',
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_configs_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_configs` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `dingtalkWebhook` VARCHAR(191) NULL,
    `dingtalkSign` BOOLEAN NOT NULL DEFAULT false,
    `dingtalkKeyword` VARCHAR(191) NULL,
    `dingtalkSecret` VARCHAR(191) NULL,
    `wechatWebhook` VARCHAR(191) NULL,
    `wechatMessage` VARCHAR(191) NULL,
    `wechatMessageType` VARCHAR(191) NULL DEFAULT 'text',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_configs_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `used_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `used_reset_tokens_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `records_driverId_fkey` ON `records`(`driverId`);

-- CreateIndex
CREATE INDEX `records_sessionId_fkey` ON `records`(`sessionId`);

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `replies` ADD CONSTRAINT `replies_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `replies` ADD CONSTRAINT `replies_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_configs` ADD CONSTRAINT `notification_configs_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `used_reset_tokens` ADD CONSTRAINT `used_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
