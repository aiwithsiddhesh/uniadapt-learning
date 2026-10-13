CREATE TABLE `academic_calendar_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`semester_id` text NOT NULL,
	`version` integer NOT NULL,
	`calendar` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`semester_id`) REFERENCES `academic_semesters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_calendar_version` ON `academic_calendar_versions` (`semester_id`,`version`);--> statement-breakpoint
CREATE TABLE `academic_calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`semester_id` text NOT NULL,
	`version` integer NOT NULL,
	`working_days` text NOT NULL,
	`holidays` text NOT NULL,
	`windows` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`semester_id`) REFERENCES `academic_semesters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_calendar_semester` ON `academic_calendars` (`semester_id`);--> statement-breakpoint
CREATE TABLE `academic_exams` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`offering_id` text NOT NULL,
	`type` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `academic_offerings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_exam_time" CHECK("academic_exams"."start_at" < "academic_exams"."end_at"),
	CONSTRAINT "academic_exam_type" CHECK("academic_exams"."type" in ('IA','PRACTICAL','UNIVERSITY'))
);
--> statement-breakpoint
CREATE TABLE `academic_timetables` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`section_id` text NOT NULL,
	`offering_id` text NOT NULL,
	`day` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`kind` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`section_id`) REFERENCES `academic_sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `academic_offerings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_timetable_day" CHECK("academic_timetables"."day" between 0 and 6),
	CONSTRAINT "academic_timetable_time" CHECK("academic_timetables"."start_time" < "academic_timetables"."end_time"),
	CONSTRAINT "academic_timetable_kind" CHECK("academic_timetables"."kind" in ('CLASS','LAB'))
);
--> statement-breakpoint
CREATE TABLE `academic_unit_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`version` integer NOT NULL,
	`units` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `academic_subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_unit_policy_version` ON `academic_unit_policies` (`subject_id`,`version`);--> statement-breakpoint
ALTER TABLE `academic_institutes` ADD `code` text DEFAULT 'UNIADAPT' NOT NULL;--> statement-breakpoint
ALTER TABLE `academic_institutes` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `academic_institutes` ADD `auth_policy` text DEFAULT '{"accountAttempts":5,"ipAttempts":20,"windowSeconds":900}' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `department_id` text REFERENCES academic_departments(id);