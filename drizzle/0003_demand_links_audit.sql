CREATE TABLE `shipment_demands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_id` integer NOT NULL,
	`demand_id` integer NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`demand_id`) REFERENCES `demands`(`id`) ON UPDATE no action ON DELETE no action
);

ALTER TABLE `audit_events` ADD `field_name` text DEFAULT '' NOT NULL;
ALTER TABLE `audit_events` ADD `previous_value` text DEFAULT '' NOT NULL;
ALTER TABLE `audit_events` ADD `new_value` text DEFAULT '' NOT NULL;
ALTER TABLE `audit_events` ADD `notes` text DEFAULT '' NOT NULL;
