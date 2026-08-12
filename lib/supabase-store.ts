import type { EntityKey } from "./domain";

type RuntimeEnv = Record<string, string | undefined>;

type AppUserRow = {
  id: number;
  email: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  role: string;
};

type AppUserInput = {
  email: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
  role: string;
};

const entityTables: Record<EntityKey, string> = {
  suppliers: "ii_suppliers",
  partNumbers: "ii_part_numbers",
  requesters: "ii_requesters",
  agents: "ii_agents",
  pol: "ii_locations",
  cfs: "ii_locations",
  demands: "ii_demands",
  shipments: "ii_shipments",
  consolidations: "ii_consolidations",
  freightContracts: "ii_freight_contracts",
  publicRates: "ii_public_rates",
  surcharges: "ii_surcharges",
  exchangeRates: "ii_exchange_rates",
  commercialInvoices: "ii_commercial_invoices",
  packages: "ii_packages",
  containers: "ii_containers",
  shipmentDemands: "ii_shipment_demands",
  invoiceItems: "ii_invoice_items",
  supplierPartHistory: "ii_supplier_part_history",
  monthlyExchangeRates: "ii_monthly_exchange_rates",
  shipmentCosts: "ii_shipment_costs",
  shipmentDocuments: "shipment_documents",
  freeTimeRules: "ii_free_time_rules",
  consolidationShipments: "ii_consolidation_shipments",
  timelineEvents: "ii_timeline_events",
};

const dateFields = new Set([
  "required_date",
  "quotation_date",
  "green_light_date",
  "cargo_ready_date",
  "pickup_scheduled_date",
  "pickup_confirmed_date",
  "booking_confirmed_date",
  "etd",
  "atd",
  "initial_eta",
  "eta",
  "ata",
  "pcd",
  "delivery_date",
  "ddl_date",
  "closing_date",
  "valid_from",
  "valid_to",
  "rate_date",
  "readiness_date",
  "modine_deadline",
  "deadline",
  "stock_entry_date",
  "hbl_awb_date",
  "free_time_deadline",
  "source_date",
  "document_date",
  "hbl_awb_date",
]);

const numericFields = new Set([
  "requested_quantity",
  "fulfilled_quantity",
  "net_weight_kg",
  "cbm",
  "gross_weight_kg",
  "length_cm",
  "width_cm",
  "height_cm",
  "amount",
  "rate",
  "total_cbm",
  "linked_quantity",
  "shipped_quantity",
  "excess_quantity",
  "total_equipment",
  "package_quantity",
  "quantity",
  "unit_price",
  "customs_value",
  "payable_value",
  "usd_brl",
  "eur_brl",
  "gbp_brl",
  "sek_brl",
  "contract_cost",
  "public_cost",
  "saving_amount",
  "free_time_days",
  "alert_days_before",
]);

export async function isSupabaseConfigured() {
  return Boolean(await getSupabaseConfig());
}

export async function supabaseAppHasUsers() {
  const rows = await requestSupabase<AppUserRow[]>("ii_app_users", "GET", {
    query: "select=id&limit=1",
  });
  return rows.length > 0;
}

export async function findSupabaseUserByEmail(email: string) {
  const rows = await requestSupabase<AppUserRow[]>("ii_app_users", "GET", {
    query: `select=*&email=eq.${encodeURIComponent(email)}&limit=1`,
  });
  return toAppUser(rows[0]);
}

export async function createSupabaseUser(input: AppUserInput) {
  const [row] = await requestSupabase<AppUserRow[]>("ii_app_users", "POST", {
    body: [
      {
        email: input.email,
        display_name: input.displayName,
        password_hash: input.passwordHash,
        password_salt: input.passwordSalt,
        role: input.role,
      },
    ],
    prefer: "return=representation",
  });
  return toAppUser(row);
}

export async function createSupabaseSession(userId: number, tokenHash: string, expiresAt: string) {
  await requestSupabase("ii_app_sessions", "POST", {
    body: [{ user_id: userId, token_hash: tokenHash, expires_at: expiresAt }],
    prefer: "return=minimal",
  });
}

export async function deleteSupabaseSession(tokenHash: string) {
  await requestSupabase("ii_app_sessions", "DELETE", {
    query: `token_hash=eq.${encodeURIComponent(tokenHash)}`,
  });
}

export async function findSupabaseUserBySession(tokenHash: string, nowIso: string) {
  const rows = await requestSupabase<Array<{ ii_app_users: AppUserRow }>>("ii_app_sessions", "GET", {
    query: `select=ii_app_users(*)&token_hash=eq.${encodeURIComponent(tokenHash)}&expires_at=gt.${encodeURIComponent(nowIso)}&limit=1`,
  });
  return toAppUser(rows[0]?.ii_app_users);
}

export async function listSupabaseRows(entity: EntityKey) {
  const table = entityTables[entity];
  const filters = entity === "pol" || entity === "cfs" ? `&kind=eq.${entity.toUpperCase()}` : "";
  const rows = await requestSupabase<Record<string, unknown>[]>(table, "GET", {
    query: `select=*&order=id.asc&limit=200${filters}`,
  });
  return rows.map(fromSnakeRow);
}

export async function getSupabaseRow(entity: EntityKey, id: number) {
  const table = entityTables[entity];
  const rows = await requestSupabase<Record<string, unknown>[]>(table, "GET", {
    query: `select=*&id=eq.${id}&limit=1`,
  });
  return rows[0] ? fromSnakeRow(rows[0]) : null;
}

export async function createSupabaseRow(entity: EntityKey, values: Record<string, unknown>) {
  const table = entityTables[entity];
  const [row] = await requestSupabase<Record<string, unknown>[]>(table, "POST", {
    body: [toSnakeRow(values)],
    prefer: "return=representation",
  });
  return fromSnakeRow(row);
}

export async function updateSupabaseRow(entity: EntityKey, id: number, values: Record<string, unknown>) {
  const table = entityTables[entity];
  const [row] = await requestSupabase<Record<string, unknown>[]>(table, "PATCH", {
    query: `id=eq.${id}`,
    body: toSnakeRow({ ...values, updatedAt: new Date().toISOString() }),
    prefer: "return=representation",
  });
  return row ? fromSnakeRow(row) : null;
}

export async function deleteSupabaseRow(entity: EntityKey, id: number) {
  await requestSupabase(entityTables[entity], "DELETE", {
    query: `id=eq.${id}`,
  });
}

export async function insertSupabaseAudit(values: {
  entity: string;
  entityId: number;
  action: string;
  actorEmail: string;
  summary: string;
  fieldName?: string;
  previousValue?: string;
  newValue?: string;
  notes?: string;
}) {
  await requestSupabase("ii_audit_events", "POST", {
    body: [
      {
        entity: values.entity,
        entity_id: values.entityId,
        action: values.action,
        actor_email: values.actorEmail,
        field_name: values.fieldName ?? "",
        previous_value: values.previousValue ?? "",
        new_value: values.newValue ?? "",
        summary: values.summary,
        notes: values.notes ?? "",
      },
    ],
    prefer: "return=minimal",
  });
}

export async function insertSupabaseTimeline(values: {
  entity: string;
  entityId: number;
  fieldName?: string;
  previousValue?: string;
  newValue?: string;
  actorEmail?: string;
  notes?: string;
}) {
  await requestSupabase("ii_timeline_events", "POST", {
    body: [
      {
        entity: values.entity,
        entity_id: values.entityId,
        field_name: values.fieldName ?? "",
        previous_value: values.previousValue ?? "",
        new_value: values.newValue ?? "",
        actor_email: values.actorEmail ?? "",
        notes: values.notes ?? "",
      },
    ],
    prefer: "return=minimal",
  });
}

export async function recalculateSupabaseDemandFulfillment(demandId: number) {
  const demand = await getSupabaseRow("demands", demandId);
  if (!demand) return null;

  const links = await requestSupabase<Record<string, unknown>[]>("ii_shipment_demands", "GET", {
    query: `select=*&demand_id=eq.${demandId}`,
  });
  const linkedQuantity = links.reduce((total, row) => total + Number(row.quantity ?? 0), 0);
  const requestedQuantity = Number(demand.requestedQuantity ?? 0);
  const shippedQuantity = Math.min(linkedQuantity, requestedQuantity || linkedQuantity);
  const excessQuantity = Math.max(0, linkedQuantity - requestedQuantity);
  const manuallyClosed = Boolean(demand.manuallyClosed);
  const status = resolveDemandStatusForQuantities(requestedQuantity, shippedQuantity, manuallyClosed);

  return await updateSupabaseRow("demands", demandId, {
    linkedQuantity,
    shippedQuantity,
    fulfilledQuantity: shippedQuantity,
    excessQuantity,
    status,
  });
}

export async function recordInvoiceItemHistory(invoiceItemId: number) {
  const item = await getSupabaseRow("invoiceItems", invoiceItemId);
  if (!item || item.valueKind === "Estimated / Auto-filled") return null;
  const supplierId = Number(item.supplierId ?? 0);
  const partNumberId = Number(item.partNumberId ?? 0);
  if (!supplierId || !partNumberId) return null;

  let invoice: Record<string, unknown> | null = null;
  const invoiceId = Number(item.invoiceId ?? 0);
  if (invoiceId) {
    const rows = await requestSupabase<Record<string, unknown>[]>("ii_commercial_invoices", "GET", {
      query: `select=*&id=eq.${invoiceId}&limit=1`,
    });
    invoice = rows[0] ? fromSnakeRow(rows[0]) : null;
  }

  const [history] = await requestSupabase<Record<string, unknown>[]>("ii_supplier_part_history", "POST", {
    body: [
      toSnakeRow({
        supplierId,
        partNumberId,
        shipmentId: item.shipmentId,
        invoiceId: item.invoiceId,
        invoiceItemId,
        sourceDate: invoice?.ddlDate || new Date().toISOString().slice(0, 10),
        sourceInvoice: invoice?.invoiceNumber || "",
        unitPrice: item.unitPrice,
        currency: item.currency,
        netWeightKg: item.netWeightKg,
        grossWeightKg: item.grossWeightKg,
        cbm: item.cbm,
        packageType: item.packageType,
        valueKind: item.valueKind,
      }),
    ],
    prefer: "return=representation",
  });
  return fromSnakeRow(history);
}

export async function recalculateSupabaseShipmentSavings(shipmentId: number) {
  const shipment = await getSupabaseRow("shipments", shipmentId);
  if (!shipment) return null;

  const contractId = Number(shipment.contractId ?? 0);
  if (!contractId) return shipment;

  const [contractRows, containerRows, publicRateRows, surchargeRows] = await Promise.all([
    requestSupabase<Record<string, unknown>[]>("ii_freight_contracts", "GET", {
      query: `select=*&id=eq.${contractId}&limit=1`,
    }),
    requestSupabase<Record<string, unknown>[]>("ii_containers", "GET", {
      query: `select=*&shipment_id=eq.${shipmentId}`,
    }),
    requestSupabase<Record<string, unknown>[]>("ii_public_rates", "GET", {
      query: `select=*&modal=eq.${encodeURIComponent(String(shipment.modal ?? ""))}`,
    }),
    requestSupabase<Record<string, unknown>[]>("ii_surcharges", "GET", {
      query: `select=*&modal=eq.${encodeURIComponent(String(shipment.modal ?? ""))}&comparable=eq.true`,
    }),
  ]);

  const contract = contractRows[0] ? fromSnakeRow(contractRows[0]) : null;
  if (!contract) return shipment;

  const containers = containerRows.map(fromSnakeRow);
  const equipmentCount = Math.max(1, containers.length || 0);
  const contractRate = Number(contract.rate ?? 0);
  const comparableSurcharges = surchargeRows.map(fromSnakeRow).reduce((total, row) => total + Number(row.amount ?? 0) * equipmentCount, 0);
  const publicRate = findMatchingPublicRate(publicRateRows.map(fromSnakeRow), shipment, containers);
  const publicOcean = Number(publicRate?.rate ?? 0) * equipmentCount;
  const contractCost = contractRate * equipmentCount + comparableSurcharges;
  const publicCost = publicOcean + comparableSurcharges;
  const savingAmount = publicCost - contractCost;

  const updated = await updateSupabaseRow("shipments", shipmentId, {
    contractCost,
    publicCost,
    savingAmount,
    costCurrency: contract.currency || publicRate?.currency || "",
  });

  await refreshSupabaseContractUsage(contractId);
  return updated;
}

export async function refreshSupabaseContractUsage(contractId: number) {
  const shipments = await requestSupabase<Record<string, unknown>[]>("ii_shipments", "GET", {
    query: `select=id&contract_id=eq.${contractId}`,
  });
  let usedCount = 0;
  for (const shipment of shipments) {
    const containers = await requestSupabase<Record<string, unknown>[]>("ii_containers", "GET", {
      query: `select=id&shipment_id=eq.${shipment.id}`,
    });
    usedCount += Math.max(1, containers.length || 0);
  }
  await updateSupabaseRow("freightContracts", contractId, { usedCount });
}

export async function propagateSupabaseConsolidation(consolidationId: number) {
  const consolidation = await getSupabaseRow("consolidations", consolidationId);
  if (!consolidation) return;

  const links = await requestSupabase<Record<string, unknown>[]>("ii_consolidation_shipments", "GET", {
    query: `select=*&consolidation_id=eq.${consolidationId}`,
  });

  const sharedValues = {
    cfs: consolidation.cfs,
    pol: consolidation.pol,
    pod: consolidation.pod,
    eta: consolidation.eta,
    status: consolidation.status,
  };

  for (const link of links.map(fromSnakeRow)) {
    const shipmentId = Number(link.shipmentId ?? 0);
    if (shipmentId) await updateSupabaseRow("shipments", shipmentId, sharedValues);
  }
}

export async function applySupabaseContainerFreeTime(containerId: number) {
  const container = await getSupabaseRow("containers", containerId);
  if (!container) return null;
  const shipmentId = Number(container.shipmentId ?? 0);
  if (!shipmentId) return container;

  const shipment = await getSupabaseRow("shipments", shipmentId);
  if (!shipment?.ata) return container;

  let freeTimeDays = Number(container.freeTimeDays ?? 0);
  if (!freeTimeDays && container.equipment) {
    const rules = await requestSupabase<Record<string, unknown>[]>("ii_free_time_rules", "GET", {
      query: `select=*&equipment=eq.${encodeURIComponent(String(container.equipment))}&limit=1`,
    });
    freeTimeDays = Number(rules[0]?.free_time_days ?? 0);
  }
  if (!freeTimeDays) return container;

  return await updateSupabaseRow("containers", containerId, {
    freeTimeDays,
    freeTimeDeadline: addDays(String(shipment.ata), freeTimeDays),
  });
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function findMatchingPublicRate(rates: Record<string, unknown>[], shipment: Record<string, unknown>, containers: Record<string, unknown>[]) {
  return (
    rates.find((rate) => matchesRate(rate, shipment, containers[0]?.equipment)) ??
    rates.find((rate) => matchesRate(rate, shipment, "")) ??
    rates[0] ??
    null
  );
}

function matchesRate(rate: Record<string, unknown>, shipment: Record<string, unknown>, equipment: unknown) {
  const pol = String(rate.pol ?? "ALL");
  const pod = String(rate.pod ?? "ALL");
  const containerType = String(rate.containerType ?? "All Equipment");
  return (
    (pol === "ALL" || pol === String(shipment.pol ?? "")) &&
    (pod === "ALL" || pod === String(shipment.pod ?? "")) &&
    (containerType === "All Equipment" || !equipment || containerType === String(equipment))
  );
}

function resolveDemandStatusForQuantities(requestedQuantity: number, shippedQuantity: number, manuallyClosed: boolean) {
  if (manuallyClosed) return "Closed";
  if (requestedQuantity > 0 && shippedQuantity >= requestedQuantity) return "Fulfilled";
  if (shippedQuantity > 0) return "Partially Fulfilled";
  return "Open";
}

function toAppUser(row?: AppUserRow) {
  if (!row) return null;
  return {
    id: Number(row.id),
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    role: row.role,
  };
}

async function requestSupabase<T = unknown>(
  table: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  options: { query?: string; body?: unknown; prefer?: string } = {},
): Promise<T> {
  const config = await getSupabaseConfig();
  if (!config) throw new Error("Supabase is not configured for this runtime.");

  const query = options.query ? `?${options.query}` : "";
  const response = await fetch(`${config.url}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${method} ${table} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function getSupabaseConfig() {
  const runtimeEnv = await getRuntimeEnv();
  const url = runtimeEnv?.SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

async function getRuntimeEnv(): Promise<RuntimeEnv | null> {
  try {
    const mod = (await import("cloudflare:workers")) as { env?: RuntimeEnv };
    return mod.env ?? null;
  } catch {
    return null;
  }
}

function toSnakeRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        const snakeKey = toSnake(key);
        const normalized = dateFields.has(snakeKey) && value === "" ? null : value;
        return [snakeKey, normalized];
      }),
  );
}

function fromSnakeRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      let normalized = value;
      if (dateFields.has(key) && value === null) normalized = "";
      if (numericFields.has(key) && typeof value === "string") normalized = Number(value);
      return [toCamel(key), normalized];
    }),
  );
}

function toSnake(value: string) {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function toCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
