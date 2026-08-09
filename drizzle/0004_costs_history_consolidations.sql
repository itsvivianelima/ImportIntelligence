ALTER TABLE `shipments` ADD `contract_id` integer REFERENCES `freight_contracts`(`id`);
ALTER TABLE `shipments` ADD `contract_cost` real DEFAULT 0 NOT NULL;
ALTER TABLE `shipments` ADD `public_cost` real DEFAULT 0 NOT NULL;
ALTER TABLE `shipments` ADD `saving_amount` real DEFAULT 0 NOT NULL;
ALTER TABLE `shipments` ADD `cost_currency` text DEFAULT '' NOT NULL;

CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`shipment_id` integer,
	`supplier_id` integer,
	`part_number_id` integer,
	`quantity` real DEFAULT 0 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT '' NOT NULL,
	`net_weight_kg` real,
	`gross_weight_kg` real,
	`cbm` real,
	`package_type` text DEFAULT '' NOT NULL,
	`value_kind` text DEFAULT 'Confirmed / Document Value' NOT NULL,
	`customs_value` real DEFAULT 0 NOT NULL,
	`payable_value` real DEFAULT 0 NOT NULL,
	`is_sample` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `supplier_part_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`part_number_id` integer NOT NULL,
	`shipment_id` integer,
	`invoice_id` integer,
	`invoice_item_id` integer,
	`source_date` text,
	`source_invoice` text DEFAULT '' NOT NULL,
	`unit_price` real,
	`currency` text DEFAULT '' NOT NULL,
	`net_weight_kg` real,
	`gross_weight_kg` real,
	`cbm` real,
	`package_type` text DEFAULT '' NOT NULL,
	`value_kind` text DEFAULT 'Confirmed / Document Value' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `monthly_exchange_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month` text NOT NULL,
	`usd_brl` real DEFAULT 0 NOT NULL,
	`eur_brl` real DEFAULT 0 NOT NULL,
	`gbp_brl` real DEFAULT 0 NOT NULL,
	`sek_brl` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `shipment_costs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_id` integer NOT NULL,
	`cost_type` text DEFAULT 'Estimated Cost' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT '' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `free_time_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`equipment` text NOT NULL,
	`free_time_days` integer DEFAULT 0 NOT NULL,
	`alert_days_before` integer DEFAULT 3 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `consolidation_shipments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`consolidation_id` integer NOT NULL,
	`shipment_id` integer NOT NULL,
	`managed_fields` text DEFAULT 'cfs,pol,pod,eta,etd,atd,ata' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `timeline_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer NOT NULL,
	`field_name` text DEFAULT '' NOT NULL,
	`previous_value` text DEFAULT '' NOT NULL,
	`new_value` text DEFAULT '' NOT NULL,
	`actor_email` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
