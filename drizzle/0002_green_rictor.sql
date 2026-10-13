CREATE TABLE `academic_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`offering_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `academic_offerings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teacher_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_assignment_role" CHECK("academic_assignments"."role" in ('PRIMARY','CO'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_assigned_teacher` ON `academic_assignments` (`offering_id`,`teacher_id`);--> statement-breakpoint
CREATE TABLE `academic_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`program_id` text NOT NULL,
	`code` text NOT NULL,
	`start_year` integer NOT NULL,
	`end_year` integer NOT NULL,
	`active` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `academic_programs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_batch_years" CHECK("academic_batches"."start_year" >= 2000 and "academic_batches"."end_year" > "academic_batches"."start_year" and "academic_batches"."end_year" <= 2100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_batch_code` ON `academic_batches` (`program_id`,`code`);--> statement-breakpoint
CREATE TABLE `academic_departments` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`active` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_department_code` ON `academic_departments` (`campus_id`,`code`);--> statement-breakpoint
CREATE TABLE `academic_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`offering_id` text NOT NULL,
	`status` text NOT NULL,
	`effective_at` text NOT NULL,
	`ended_at` text,
	`auto_allocated` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `academic_placements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `academic_offerings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_enrollment_status" CHECK("academic_enrollments"."status" in ('ACTIVE','CLOSED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_active_enrollment` ON `academic_enrollments` (`learner_id`,`offering_id`) WHERE "academic_enrollments"."status" = 'ACTIVE';--> statement-breakpoint
CREATE TABLE `academic_institutes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `campuses`(`owner_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `academic_offerings` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`section_id` text NOT NULL,
	`course_id` text NOT NULL,
	`exam` text NOT NULL,
	`status` text NOT NULL,
	`capacity` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `academic_subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`section_id`) REFERENCES `academic_sections`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_offering_status" CHECK("academic_offerings"."status" in ('DRAFT','ACTIVE')),
	CONSTRAINT "academic_offering_capacity" CHECK("academic_offerings"."capacity" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_offering_section` ON `academic_offerings` (`subject_id`,`section_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `academic_offering_course` ON `academic_offerings` (`campus_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `academic_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `academic_placement_history` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`from_section_id` text,
	`to_section_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`date` text NOT NULL,
	`actor_id` text NOT NULL,
	`previous_course_ids` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `academic_placements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_section_id`) REFERENCES `academic_sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_section_id`) REFERENCES `academic_sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operation_id`) REFERENCES `academic_operations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `academic_placements` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`roll_no` text NOT NULL,
	`section_id` text NOT NULL,
	`electives` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`section_id`) REFERENCES `academic_sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_student_roll` ON `academic_placements` (`campus_id`,`roll_no`);--> statement-breakpoint
CREATE TABLE `academic_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`department_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`duration_semesters` integer NOT NULL,
	`active` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `academic_departments`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_program_duration" CHECK("academic_programs"."duration_semesters" between 1 and 20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_program_code` ON `academic_programs` (`department_id`,`code`);--> statement-breakpoint
CREATE TABLE `academic_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`semester_id` text NOT NULL,
	`name` text NOT NULL,
	`capacity` integer NOT NULL,
	`active` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`semester_id`) REFERENCES `academic_semesters`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_section_capacity" CHECK("academic_sections"."capacity" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_section_name` ON `academic_sections` (`semester_id`,`name`);--> statement-breakpoint
CREATE TABLE `academic_semesters` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`number` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`active` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `academic_batches`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_semester_dates" CHECK("academic_semesters"."start_date" < "academic_semesters"."end_date")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_semester_number` ON `academic_semesters` (`batch_id`,`number`);--> statement-breakpoint
CREATE TABLE `academic_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`program_id` text NOT NULL,
	`semester_no` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`credits` integer NOT NULL,
	`type` text NOT NULL,
	`elective_group` text,
	`group_required` integer NOT NULL,
	`content_course_id` text NOT NULL,
	`owner_teacher_id` text,
	`active` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `academic_programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_teacher_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_subject_type" CHECK("academic_subjects"."type" in ('CORE_THEORY','CORE_LAB','ELECTIVE')),
	CONSTRAINT "academic_subject_credits" CHECK("academic_subjects"."credits" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_subject_code` ON `academic_subjects` (`program_id`,`semester_no`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `academic_subject_content` ON `academic_subjects` (`campus_id`,`content_course_id`);--> statement-breakpoint
CREATE TABLE `academic_units` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`name` text NOT NULL,
	`weight` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `academic_institutes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `academic_subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "academic_unit_weight" CHECK("academic_units"."weight" between 0 and 100)
);
