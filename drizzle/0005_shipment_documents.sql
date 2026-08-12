CREATE TABLE `shipment_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_id` integer NOT NULL,
	`document_type` text DEFAULT 'Other' NOT NULL,
	`document_number` text DEFAULT '' NOT NULL,
	`document_date` text DEFAULT '' NOT NULL,
	`file_name` text DEFAULT '' NOT NULL,
	`storage_path` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
