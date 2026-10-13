ALTER TABLE `accounts` ADD `username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_campus_username` ON `accounts` (`campus_id`,`username`);