import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  country: text("country").notNull().default(""),
  tin: text("tin").notNull().default(""),
  defaultPol: text("default_pol").notNull().default(""),
  defaultCfs: text("default_cfs").notNull().default(""),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const partNumbers = sqliteTable("part_numbers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  partNumber: text("part_number").notNull(),
  description: text("description").notNull().default(""),
  ncm: text("ncm").notNull().default(""),
  materialType: text("material_type").notNull().default("Matéria Prima"),
  netWeightKg: real("net_weight_kg").notNull().default(0),
  cbm: real("cbm").notNull().default(0),
  ...timestamps,
});

export const requesters = sqliteTable("requesters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  department: text("department").notNull().default(""),
  ...timestamps,
});

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  country: text("country").notNull().default(""),
  ...timestamps,
});

export const demands = sqliteTable("demands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  demandNumber: text("demand_number").notNull(),
  requesterId: integer("requester_id").references(() => requesters.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  partNumberId: integer("part_number_id").references(() => partNumbers.id),
  requiredDate: text("required_date").notNull().default(""),
  requestedQuantity: real("requested_quantity").notNull().default(0),
  fulfilledQuantity: real("fulfilled_quantity").notNull().default(0),
  status: text("status").notNull().default("OPEN"),
  forecastModal: text("forecast_modal").notNull().default(""),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const shipments = sqliteTable("shipments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shipmentNumber: text("shipment_number").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  agentId: integer("agent_id").references(() => agents.id),
  modal: text("modal").notNull().default("LCL"),
  shipmentType: text("shipment_type").notNull().default("Matéria Prima"),
  incoterm: text("incoterm").notNull().default(""),
  cfs: text("cfs").notNull().default(""),
  pol: text("pol").notNull().default(""),
  pod: text("pod").notNull().default(""),
  quotationDate: text("quotation_date").notNull().default(""),
  greenLightDate: text("green_light_date").notNull().default(""),
  cargoReadyDate: text("cargo_ready_date").notNull().default(""),
  pickupScheduledDate: text("pickup_scheduled_date").notNull().default(""),
  pickupConfirmedDate: text("pickup_confirmed_date").notNull().default(""),
  bookingConfirmedDate: text("booking_confirmed_date").notNull().default(""),
  etd: text("etd").notNull().default(""),
  atd: text("atd").notNull().default(""),
  initialEta: text("initial_eta").notNull().default(""),
  eta: text("eta").notNull().default(""),
  ata: text("ata").notNull().default(""),
  pcd: text("pcd").notNull().default(""),
  deliveryDate: text("delivery_date").notNull().default(""),
  status: text("status").notNull().default("PLANNED"),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const commercialInvoices = sqliteTable("commercial_invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shipmentId: integer("shipment_id").references(() => shipments.id),
  invoiceNumber: text("invoice_number").notNull(),
  currency: text("currency").notNull().default("USD"),
  amount: real("amount").notNull().default(0),
  paymentTerms: text("payment_terms").notNull().default(""),
  ddlDate: text("ddl_date").notNull().default(""),
  risk: text("risk").notNull().default(""),
  ...timestamps,
});

export const packages = sqliteTable("packages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shipmentId: integer("shipment_id").references(() => shipments.id),
  packageType: text("package_type").notNull().default(""),
  quantity: integer("quantity").notNull().default(0),
  lengthCm: real("length_cm").notNull().default(0),
  widthCm: real("width_cm").notNull().default(0),
  heightCm: real("height_cm").notNull().default(0),
  cbm: real("cbm").notNull().default(0),
  grossWeightKg: real("gross_weight_kg").notNull().default(0),
  ...timestamps,
});

export const containers = sqliteTable("containers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shipmentId: integer("shipment_id").references(() => shipments.id),
  containerNumber: text("container_number").notNull(),
  equipment: text("equipment").notNull().default(""),
  seal: text("seal").notNull().default(""),
  freeTimeDays: integer("free_time_days").notNull().default(0),
  ...timestamps,
});

export const shipmentDemands = sqliteTable("shipment_demands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shipmentId: integer("shipment_id").notNull().references(() => shipments.id),
  demandId: integer("demand_id").notNull().references(() => demands.id),
  quantity: real("quantity").notNull().default(0),
  ...timestamps,
});

export const consolidations = sqliteTable("consolidations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  consolidationNumber: text("consolidation_number").notNull(),
  cfs: text("cfs").notNull().default(""),
  pol: text("pol").notNull().default(""),
  pod: text("pod").notNull().default(""),
  closingDate: text("closing_date").notNull().default(""),
  eta: text("eta").notNull().default(""),
  status: text("status").notNull().default("OPEN"),
  totalCbm: real("total_cbm").notNull().default(0),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const freightContracts = sqliteTable("freight_contracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contractNumber: text("contract_number").notNull(),
  carrier: text("carrier").notNull(),
  modal: text("modal").notNull().default(""),
  pol: text("pol").notNull().default("ALL"),
  pod: text("pod").notNull().default("ALL"),
  equipment: text("equipment").notNull().default(""),
  currency: text("currency").notNull().default("USD"),
  rate: real("rate").notNull().default(0),
  validFrom: text("valid_from").notNull().default(""),
  validTo: text("valid_to").notNull().default(""),
  usedCount: integer("used_count").notNull().default(0),
  ...timestamps,
});

export const publicRates = sqliteTable("public_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  carrier: text("carrier").notNull(),
  modal: text("modal").notNull().default(""),
  pol: text("pol").notNull().default("ALL"),
  pod: text("pod").notNull().default("ALL"),
  currency: text("currency").notNull().default("USD"),
  rate: real("rate").notNull().default(0),
  chargingBasis: text("charging_basis").notNull().default("W/M"),
  validFrom: text("valid_from").notNull().default(""),
  validTo: text("valid_to").notNull().default(""),
  ...timestamps,
});

export const surcharges = sqliteTable("surcharges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  modal: text("modal").notNull().default(""),
  currency: text("currency").notNull().default("USD"),
  amount: real("amount").notNull().default(0),
  chargingBasis: text("charging_basis").notNull().default(""),
  comparable: integer("comparable", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const exchangeRates = sqliteTable("exchange_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rateDate: text("rate_date").notNull(),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull().default("BRL"),
  rate: real("rate").notNull().default(0),
  ...timestamps,
});

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entity: text("entity").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  actorEmail: text("actor_email").notNull().default(""),
  fieldName: text("field_name").notNull().default(""),
  previousValue: text("previous_value").notNull().default(""),
  newValue: text("new_value").notNull().default(""),
  summary: text("summary").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  role: text("role").notNull().default("ADMIN"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const appSessions = sqliteTable("app_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => appUsers.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
