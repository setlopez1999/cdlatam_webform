CREATE TABLE `localUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`displayName` varchar(255),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `localUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `localUsers_username_unique` UNIQUE(`username`)
);
