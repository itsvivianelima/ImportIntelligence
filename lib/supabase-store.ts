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
}) {
  await requestSupabase("ii_audit_events", "POST", {
    body: [
      {
        entity: values.entity,
        entity_id: values.entityId,
        action: values.action,
        actor_email: values.actorEmail,
        summary: values.summary,
      },
    ],
    prefer: "return=minimal",
  });
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
