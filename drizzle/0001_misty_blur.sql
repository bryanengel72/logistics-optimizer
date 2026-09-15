CREATE TABLE `fuel` (
	`id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
