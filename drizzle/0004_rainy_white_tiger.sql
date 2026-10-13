ALTER TABLE `academic_placement_history` ADD `event` text DEFAULT 'PLACEMENT' NOT NULL;--> statement-breakpoint
ALTER TABLE `academic_placements` ADD `active` integer DEFAULT 1 NOT NULL;