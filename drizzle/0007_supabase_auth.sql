ALTER TABLE `accounts` ADD `auth_provider_user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_identity` ON `accounts` (`auth_provider_user_id`);--> statement-breakpoint
ALTER TABLE `auth_tokens` ADD `claim_id` text;--> statement-breakpoint
ALTER TABLE `auth_tokens` ADD `claim_version` integer;