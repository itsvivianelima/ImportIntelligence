import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import {
  agents,
  auditEvents,
  commercialInvoices,
  consolidations,
  containers,
  demands,
  exchangeRates,
  freightContracts,
  locations,
  packages,
  partNumbers,
  publicRates,
  requesters,
  shipments,
  suppliers,
  surcharges,
} from "../../../../db/schema";
import {
  calculateCbm,
  resolveDemandStatus,
  resolveShipmentStatus,
  type EntityKey,
} from "../../../../lib/domain";

type RouteContext = { params: Promise<{ entity: string }> };

const tableByEntity = {
  suppliers,
  partNumbers,
  requesters,
  agents,
  pol: locations,
  cfs: locations,
  demands,
  shipments,
  consolidations,
  freightContracts,
  publicRates,
  surcharges,
  exchangeRates,
  commercialInvoices,
  packages,
  containers,
} as const;

const entityLabels: Record<EntityKey, string> = {
  suppliers: "SUPPLIERS",
  partNumbers: "PART NUMBERS",
  requesters: "REQUESTERS",
  agents: "AGENTS",
  pol: "POL",
  cfs: "CFS",
  demands: "DEMANDS",
  shipments: "SHIPMENTS",
  consolidations: "CONSOLIDATIONS",
  freightContracts: "FREIGHT CONTRACTS",
  publicRates: "PUBLIC RATES",
  surcharges: "SURCHARGES",
  exchangeRates: "EXCHANGE RATES",
  commercialInvoices: "COMMERCIAL INVOICES",
  packages: "PACKAGES",
  containers: "CONTAINERS",
};

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("D1 binding") || message.includes("no such table")) {
    return "The IMPORT INTELLIGENCE database is not initialized yet. Generate and apply the included D1 migration before writing operational records.";
  }
  return message;
}

async function resolveEntity(params: RouteContext["params"]) {
  const { entity } = await params;
  if (!(entity in tableByEntity)) {
    throw new Response(JSON.stringify({ error: "Unknown entity" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  return entity as EntityKey;
}

function normalizePayload(entity: EntityKey, payload: Record<string, unknown>) {
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== "id" && key !== "createdAt" && key !== "updatedAt"),
  );

  if (entity === "pol" || entity === "cfs") {
    cleaned.kind = entity.toUpperCase();
  }

  if (entity === "shipments") {
    cleaned.status = resolveShipmentStatus(cleaned);
  }

  if (entity === "demands") {
    cleaned.status = resolveDemandStatus(cleaned);
  }

  if (entity === "packages") {
    cleaned.cbm = calculateCbm(cleaned);
  }

  return cleaned;
}

function rowTitle(entity: EntityKey, values: Record<string, unknown>) {
  const title =
    values.name ||
    values.code ||
    values.shipmentNumber ||
    values.demandNumber ||
    values.consolidationNumber ||
    values.contractNumber ||
    values.invoiceNumber ||
    values.containerNumber ||
    values.partNumber ||
    entityLabels[entity];
  return String(title);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const entity = await resolveEntity(context.params);
    const db = getDb();
    const table = tableByEntity[entity];
    const rows = await db.select().from(table).limit(200);

    const filtered =
      entity === "pol" || entity === "cfs"
        ? rows.filter((row) => row.kind === entity.toUpperCase())
        : rows;

    return Response.json({ rows: filtered });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const entity = await resolveEntity(context.params);
    const payload = (await request.json()) as Record<string, unknown>;
    const values = normalizePayload(entity, payload);
    const db = getDb();
    const table = tableByEntity[entity];
    const [row] = await db.insert(table).values(values).returning();

    await db.insert(auditEvents).values({
      entity,
      entityId: row.id,
      action: "CREATE",
      actorEmail: user.email,
      summary: `Created ${rowTitle(entity, row)}`,
    });

    return Response.json({ row }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const entity = await resolveEntity(context.params);
    const payload = (await request.json()) as Record<string, unknown>;
    const id = Number(payload.id);
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const values = normalizePayload(entity, payload);
    const db = getDb();
    const table = tableByEntity[entity];
    const [row] = await db.update(table).set(values).where(eq(table.id, id)).returning();

    await db.insert(auditEvents).values({
      entity,
      entityId: id,
      action: "UPDATE",
      actorEmail: user.email,
      summary: `Updated ${rowTitle(entity, row ?? values)}`,
    });

    return Response.json({ row });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const entity = await resolveEntity(context.params);
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const db = getDb();
    const table = tableByEntity[entity];
    await db.delete(table).where(eq(table.id, id));
    await db.insert(auditEvents).values({
      entity,
      entityId: id,
      action: "DELETE",
      actorEmail: user.email,
      summary: `Deleted ${entityLabels[entity]} #${id}`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}
