CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`password_hash` text,
	`active` integer DEFAULT 0 NOT NULL,
	`token_version` integer DEFAULT 0 NOT NULL,
	`learner_id` text,
	`course_ids` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`owner_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "accounts_role_check" CHECK("accounts"."role" in ('ADMIN','TEACHER','STUDENT'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_campus_email` ON `accounts` (`campus_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_campus_learner` ON `accounts` (`campus_id`,`learner_id`);--> statement-breakpoint
CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_tokens` (
	`hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`owner_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `security_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
