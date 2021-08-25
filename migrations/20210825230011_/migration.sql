-- CreateTable
CREATE TABLE `TemporaryUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TemporaryUser.email_unique`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Registration` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiredAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Registration.code_unique`(`code`),
    UNIQUE INDEX `Registration.token_unique`(`token`),
    UNIQUE INDEX `Registration_userId_unique`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `User.email_unique`(`email`),
    UNIQUE INDEX `User.alias_unique`(`alias`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `policyReceivePrejudice` ENUM('ALL_FOLLOWERS', 'MUTUAL_ONLY') NOT NULL DEFAULT 'MUTUAL_ONLY',

    UNIQUE INDEX `Setting.userId_unique`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Registration` ADD FOREIGN KEY (`userId`) REFERENCES `TemporaryUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
