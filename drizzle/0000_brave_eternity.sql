CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer NOT NULL,
	`action` text NOT NULL,
	`actor_email` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commercial_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_id` integer,
	`invoice_number` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`payment_terms` text DEFAULT '' NOT NULL,
	`ddl_date` text DEFAULT '' NOT NULL,
	`risk` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consolidations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`consolidation_number` text NOT NULL,
	`cfs` text DEFAULT '' NOT NULL,
	`pol` text DEFAULT '' NOT NULL,
	`pod` text DEFAULT '' NOT NULL,
	`closing_date` text DEFAULT '' NOT NULL,
	`eta` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`total_cbm` real DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `containers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_id` integer,
	`container_number` text NOT NULL,
	`equipment` text DEFAULT '' NOT NULL,
	`seal` text DEFAULT '' NOT NULL,
	`free_time_days` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `demands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`demand_number` text NOT NULL,
	`requester_id` integer,
	`supplier_id` integer,
	`part_number_id` integer,
	`required_date` text DEFAULT '' NOT NULL,
	`requested_quantity` real DEFAULT 0 NOT NULL,
	`fulfilled_quantity` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`forecast_modal` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `requesters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`part_number_id`) REFERENCES `part_numbers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rate_date` text NOT NULL,
	`from_currency` text NOT NULL,
	`to_currency` text DEFAULT 'BRL' NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `freight_contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contract_number` text NOT NULL,
	`carrier` text NOT NULL,
	`modal` text DEFAULT '' NOT NULL,
	`pol` text DEFAULT 'ALL' NOT NULL,
	`pod` text DEFAULT 'ALL' NOT NULL,
	`equipment` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`valid_from` text DEFAULT '' NOT NULL,
	`valid_to` text DEFAULT '' NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_id` integer,
	`package_type` text DEFAULT '' NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`length_cm` real DEFAULT 0 NOT NULL,
	`width_cm` real DEFAULT 0 NOT NULL,
	`height_cm` real DEFAULT 0 NOT NULL,
	`cbm` real DEFAULT 0 NOT NULL,
	`gross_weight_kg` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `part_numbers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer,
	`part_number` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`ncm` text DEFAULT '' NOT NULL,
	`material_type` text DEFAULT 'Matéria Prima' NOT NULL,
	`net_weight_kg` real DEFAULT 0 NOT NULL,
	`cbm` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `public_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`carrier` text NOT NULL,
	`modal` text DEFAULT '' NOT NULL,
	`pol` text DEFAULT 'ALL' NOT NULL,
	`pod` text DEFAULT 'ALL' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`charging_basis` text DEFAULT 'W/M' NOT NULL,
	`valid_from` text DEFAULT '' NOT NULL,
	`valid_to` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `requesters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_number` text NOT NULL,
	`supplier_id` integer,
	`agent_id` integer,
	`modal` text DEFAULT 'LCL' NOT NULL,
	`shipment_type` text DEFAULT 'Matéria Prima' NOT NULL,
	`incoterm` text DEFAULT '' NOT NULL,
	`cfs` text DEFAULT '' NOT NULL,
	`pol` text DEFAULT '' NOT NULL,
	`pod` text DEFAULT '' NOT NULL,
	`quotation_date` text DEFAULT '' NOT NULL,
	`green_light_date` text DEFAULT '' NOT NULL,
	`cargo_ready_date` text DEFAULT '' NOT NULL,
	`pickup_scheduled_date` text DEFAULT '' NOT NULL,
	`pickup_confirmed_date` text DEFAULT '' NOT NULL,
	`booking_confirmed_date` text DEFAULT '' NOT NULL,
	`etd` text DEFAULT '' NOT NULL,
	`atd` text DEFAULT '' NOT NULL,
	`initial_eta` text DEFAULT '' NOT NULL,
	`eta` text DEFAULT '' NOT NULL,
	`ata` text DEFAULT '' NOT NULL,
	`pcd` text DEFAULT '' NOT NULL,
	`delivery_date` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`tin` text DEFAULT '' NOT NULL,
	`default_pol` text DEFAULT '' NOT NULL,
	`default_cfs` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `surcharges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`modal` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`charging_basis` text DEFAULT '' NOT NULL,
	`comparable` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
