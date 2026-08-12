import { eq } from "drizzle-orm";
import {
  agents,
  auditEvents,
  commercialInvoices,
  consolidations,
  containers,
  consolidationShipments,
  demands,
  exchangeRates,
  freeTimeRules,
  freightContracts,
  invoiceItems,
  locations,
  monthlyExchangeRates,
  packages,
  partNumbers,
  publicRates,
  requesters,
  shipmentCosts,
  shipmentDocuments,
  shipments,
  shipmentDemands,
  supplierPartHistory,
  suppliers,
  surcharges,
  timelineEvents,
} from "../../../../db/schema";
import {
  calculateCbm,
  resolveDemandStatus,
  resolveShipmentStatus,
  type EntityKey,
} from "../../../../lib/domain";
import { getCurrentAppUser } from "../../../../lib/auth";
import {
  createSupabaseRow,
  deleteSupabaseRow,
  insertSupabaseAudit,
  isSupabaseConfigured,
  listSupabaseRows,
  updateSupabaseRow,
  getSupabaseRow,
  recalculateSupabaseDemandFulfillment,
  insertSupabaseTimeline,
  recordInvoiceItemHistory,
  recalculateSupabaseShipmentSavings,
  refreshSupabaseContractUsage,
  propagateSupabaseConsolidation,
  applySupabaseContainerFreeTime,
} from "../../../../lib/supabase-store";
import { buildTransitExcelExport, isReportExport } from "../../../../lib/report-export";

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
  shipmentDemands,
  invoiceItems,
  supplierPartHistory,
  monthlyExchangeRates,
  shipmentCosts,
  shipmentDocuments,
  freeTimeRules,
  consolidationShipments,
  timelineEvents,
} as const;

const entityLabels: Record<EntityKey, string> = {
  suppliers: "Suppliers",
  partNumbers: "Part Numbers",
  requesters: "Requesters",
  agents: "Freight Forwarders",
  pol: "POL",
  cfs: "CFS",
  demands: "Demands",
  shipments: "Shipments",
  consolidations: "Consolidations",
  freightContracts: "Freight Contracts",
  publicRates: "Reference Rates",
  surcharges: "Surcharges",
  exchangeRates: "Daily Exchange Rates",
  commercialInvoices: "Commercial Invoices",
  packages: "Packing",
  containers: "Containers",
  shipmentDemands: "Demand Allocation",
  invoiceItems: "Invoice Items",
  supplierPartHistory: "Supplier Part History",
  monthlyExchangeRates: "Monthly Modine Rates",
  shipmentCosts: "Shipment Costs",
  shipmentDocuments: "Shipment Documents",
  freeTimeRules: "Free Time Rules",
  consolidationShipments: "Consolidation Loads",
  timelineEvents: "Activity History",
};

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("D1 binding") || message.includes("no such table")) {
    return "The operational database is not initialized yet. Apply the included migration before writing records.";
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
    if (cleaned.pcdIsSet && cleaned.etd && !cleaned.pcd) cleaned.pcd = cleaned.etd;
    if (cleaned.pcdIsSet && cleaned.eta && !cleaned.initialEta) cleaned.initialEta = cleaned.eta;
    cleaned.status = resolveShipmentStatus(cleaned);
  }

  if (entity === "demands") {
    cleaned.status = resolveDemandStatus(cleaned);
  }

  if (entity === "packages") {
    cleaned.cbm = calculateCbm(cleaned);
  }

  if (entity === "invoiceItems" && cleaned.isSample) {
    cleaned.payableValue = 0;
  }

  return cleaned;
}

function demandIdFromLink(values: Record<string, unknown>) {
  return Number(values.demandId ?? values.demand_id ?? 0);
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

export async function GET(request: Request, context: RouteContext) {
  try {
    const entity = await resolveEntity(context.params);
    if (await isSupabaseConfigured()) {
      const rows = await listSupabaseRows(entity);
      const exportType = new URL(request.url).searchParams.get("export");
      if (isReportExport(exportType) && (entity === "shipments" || entity === "demands")) {
        return buildTransitExcelExport(exportType!, rows, {
          suppliers: await listSupabaseRows("suppliers"),
          partNumbers: entity === "demands" ? await listSupabaseRows("partNumbers") : [],
          commercialInvoices: entity === "shipments" ? await listSupabaseRows("commercialInvoices") : [],
          supplierPartHistory: entity === "demands" ? await listSupabaseRows("supplierPartHistory") : [],
          monthlyExchangeRates: await listSupabaseRows("monthlyExchangeRates"),
        });
      }
      return Response.json({ rows });
    }

    const db = await getDatabase();
    const table = tableByEntity[entity];
    const rows = (await db.select().from(table).limit(200)) as Array<Record<string, unknown>>;
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
    const user = await getCurrentAppUser();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const entity = await resolveEntity(context.params);
    const payload = (await request.json()) as Record<string, unknown>;
    const values = normalizePayload(entity, payload);
    const useSupabase = await isSupabaseConfigured();
    const row = useSupabase
      ? await createSupabaseRow(entity, values)
      : await createD1Row(entity, values);

    await insertAudit(useSupabase, {
      entity,
      entityId: Number(row.id),
      action: "CREATE",
      actorEmail: user.email,
      summary: `Created ${rowTitle(entity, row)}`,
    });

    if (entity === "shipmentDemands" && useSupabase) {
      const demandId = demandIdFromLink(row);
      if (demandId) await recalculateSupabaseDemandFulfillment(demandId);
    }
    if (entity === "invoiceItems" && useSupabase) {
      await recordInvoiceItemHistory(Number(row.id));
    }
    if ((entity === "shipments" || entity === "containers") && useSupabase) {
      const shipmentId = entity === "shipments" ? Number(row.id) : Number(row.shipmentId ?? 0);
      if (shipmentId) await recalculateSupabaseShipmentSavings(shipmentId);
    }
    if (entity === "containers" && useSupabase) {
      await applySupabaseContainerFreeTime(Number(row.id));
    }
    if (entity === "consolidationShipments" && useSupabase) {
      const consolidationId = Number(row.consolidationId ?? 0);
      if (consolidationId) await propagateSupabaseConsolidation(consolidationId);
    }

    return Response.json({ row }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentAppUser();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const entity = await resolveEntity(context.params);
    const payload = (await request.json()) as Record<string, unknown>;
    const id = Number(payload.id);
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const values = normalizePayload(entity, payload);
    const useSupabase = await isSupabaseConfigured();
    const previousRow = useSupabase ? await getSupabaseRow(entity, id) : null;
    if (entity === "shipments" && previousRow) {
      if (previousRow.pcd && values.pcdIsSet) values.pcd = previousRow.pcd;
      if (previousRow.initialEta && values.pcdIsSet) values.initialEta = previousRow.initialEta;
      if (!previousRow.pcd && values.pcdIsSet && values.etd) values.pcd = values.etd;
      if (!previousRow.initialEta && values.pcdIsSet && values.eta) values.initialEta = values.eta;
      values.status = resolveShipmentStatus(values);
    }
    const row = useSupabase
      ? await updateSupabaseRow(entity, id, values)
      : await updateD1Row(entity, id, values);

    await insertAudit(useSupabase, {
      entity,
      entityId: id,
      action: "UPDATE",
      actorEmail: user.email,
      summary: `Updated ${rowTitle(entity, row ?? values)}`,
      previousValue: previousRow ? JSON.stringify(previousRow) : "",
      newValue: row ? JSON.stringify(row) : JSON.stringify(values),
    });
    if (useSupabase && row) {
      await insertSupabaseTimeline({
        entity,
        entityId: id,
        previousValue: previousRow ? JSON.stringify(previousRow) : "",
        newValue: JSON.stringify(row),
        actorEmail: user.email,
        notes: "Record updated through the operations workspace",
      });
    }

    if (entity === "shipmentDemands" && useSupabase) {
      const previousDemandId = previousRow ? demandIdFromLink(previousRow) : 0;
      const currentDemandId = row ? demandIdFromLink(row) : demandIdFromLink(values);
      if (previousDemandId) await recalculateSupabaseDemandFulfillment(previousDemandId);
      if (currentDemandId && currentDemandId !== previousDemandId) await recalculateSupabaseDemandFulfillment(currentDemandId);
    }
    if (entity === "invoiceItems" && useSupabase) {
      await recordInvoiceItemHistory(id);
    }
    if ((entity === "shipments" || entity === "containers") && useSupabase) {
      const shipmentId = entity === "shipments" ? id : Number(row?.shipmentId ?? previousRow?.shipmentId ?? 0);
      if (shipmentId) await recalculateSupabaseShipmentSavings(shipmentId);
    }
    if (entity === "containers" && useSupabase) {
      await applySupabaseContainerFreeTime(id);
    }
    if (entity === "consolidations" && useSupabase) {
      await propagateSupabaseConsolidation(id);
    }
    if (entity === "consolidationShipments" && useSupabase) {
      const consolidationId = Number(row?.consolidationId ?? previousRow?.consolidationId ?? 0);
      if (consolidationId) await propagateSupabaseConsolidation(consolidationId);
    }

    return Response.json({ row });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentAppUser();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const entity = await resolveEntity(context.params);
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const useSupabase = await isSupabaseConfigured();
    const previousRow = useSupabase ? await getSupabaseRow(entity, id) : null;
    if (useSupabase) {
      await deleteSupabaseRow(entity, id);
    } else {
      await deleteD1Row(entity, id);
    }

    await insertAudit(useSupabase, {
      entity,
      entityId: id,
      action: "DELETE",
      actorEmail: user.email,
      summary: `Deleted ${entityLabels[entity]} #${id}`,
      previousValue: previousRow ? JSON.stringify(previousRow) : "",
    });

    if (entity === "shipmentDemands" && useSupabase && previousRow) {
      const demandId = demandIdFromLink(previousRow);
      if (demandId) await recalculateSupabaseDemandFulfillment(demandId);
    }
    if (entity === "containers" && useSupabase && previousRow) {
      const shipmentId = Number(previousRow.shipmentId ?? 0);
      if (shipmentId) await recalculateSupabaseShipmentSavings(shipmentId);
    }
    if (entity === "shipments" && useSupabase && previousRow?.contractId) {
      await refreshSupabaseContractUsage(Number(previousRow.contractId));
    }
    if (entity === "consolidationShipments" && useSupabase && previousRow) {
      const consolidationId = Number(previousRow.consolidationId ?? 0);
      if (consolidationId) await propagateSupabaseConsolidation(consolidationId);
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: routeError(error) }, { status: 500 });
  }
}

async function getDatabase() {
  const { getDb } = await import("../../../../db");
  return getDb();
}

async function createD1Row(entity: EntityKey, values: Record<string, unknown>) {
  const db = await getDatabase();
  const table = tableByEntity[entity];
  const [row] = await db.insert(table).values(values).returning();
  return row as Record<string, unknown>;
}

async function updateD1Row(entity: EntityKey, id: number, values: Record<string, unknown>) {
  const db = await getDatabase();
  const table = tableByEntity[entity];
  const [row] = await db.update(table).set(values).where(eq(table.id, id)).returning();
  return (row ?? null) as Record<string, unknown> | null;
}

async function deleteD1Row(entity: EntityKey, id: number) {
  const db = await getDatabase();
  const table = tableByEntity[entity];
  await db.delete(table).where(eq(table.id, id));
}

async function insertAudit(
  useSupabase: boolean,
  values: { entity: string; entityId: number; action: string; actorEmail: string; summary: string; previousValue?: string; newValue?: string },
) {
  if (useSupabase) {
    await insertSupabaseAudit(values);
    return;
  }

  const db = await getDatabase();
  await db.insert(auditEvents).values(values);
}
