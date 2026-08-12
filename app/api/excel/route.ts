import { getCurrentAppUser } from "../../../lib/auth";
import { excelSheets, type ExcelSheetConfig } from "../../../lib/excel-config";
import {
  buildExportWorkbook,
  buildImportResultWorkbook,
  buildTemplateWorkbook,
  parseImportWorkbook,
  type ExcelRow,
  type ImportPreview,
  type ImportPreviewRow,
} from "../../../lib/excel-workbook";
import {
  createSupabaseRow,
  insertSupabaseTimeline,
  isSupabaseConfigured,
  listSupabaseRows,
  updateSupabaseRow,
} from "../../../lib/supabase-store";

type ExistingRows = Record<string, Record<string, unknown>[]>;

export async function GET(request: Request) {
  const user = await getCurrentAppUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "blank-template";
  const scope = searchParams.get("scope") ?? "";

  if (action === "blank-template") return buildTemplateWorkbook("blank");
  if (action === "example-template") return buildTemplateWorkbook("example");
  if (action === "export") {
    const rowsByEntity = await loadRows();
    return buildExportWorkbook(rowsByEntity, scope || undefined);
  }

  return Response.json({ error: "Unknown Excel action." }, { status: 400 });
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!(await isSupabaseConfigured())) {
    return Response.json({ error: "Excel import requires the configured Supabase datastore." }, { status: 500 });
  }

  const form = await request.formData();
  const mode = String(form.get("mode") ?? "validate");
  const scope = String(form.get("scope") ?? "");

  if (mode === "commit") {
    const previewJson = String(form.get("preview") ?? "");
    if (!previewJson) return Response.json({ error: "Validated import preview is required before confirmation." }, { status: 400 });
    const preview = JSON.parse(previewJson) as ImportPreview;
    if (preview.errors.length) return Response.json({ error: "Critical validation errors must be corrected before import.", preview }, { status: 400 });
    const existingRows = await loadRows();
    const executed = await commitPreview(preview, existingRows, user.email);
    return buildImportResultWorkbook(preview, executed);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Upload a .xlsx file before validating." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return Response.json({ error: "Only .xlsx files are accepted." }, { status: 400 });
  }
  const existingRows = await loadRows();
  const preview = parseImportWorkbook(await file.arrayBuffer(), file.name, existingRows, scope || undefined);
  return Response.json({ preview });
}

async function loadRows() {
  const rows = Object.fromEntries(await Promise.all(
    excelSheets.map(async (sheet) => [sheet.entity, await listSupabaseRows(sheet.entity)]),
  )) as ExistingRows;
  return rows;
}

async function commitPreview(preview: ImportPreview, existingRows: ExistingRows, actorEmail: string) {
  const executed: Array<ImportPreviewRow & { result: string; message: string }> = [];
  for (const row of preview.rows) {
    if (row.action === "skip") {
      executed.push({ ...row, result: "Skipped", message: "Example or unchanged row was ignored." });
      continue;
    }
    const config = excelSheets.find((sheet) => sheet.sheet === row.sheet);
    if (!config) {
      executed.push({ ...row, result: "Error", message: "Sheet is not supported by the importer." });
      continue;
    }
    try {
      const payload = resolvePayload(config, row.data, existingRows);
      const existing = findExistingForCommit(config, row.data, existingRows);
      const saved = existing?.id
        ? await updateSupabaseRow(config.entity, Number(existing.id), { ...payload, id: existing.id })
        : await createSupabaseRow(config.entity, payload);
      if (saved) {
        existingRows[config.entity] = upsertLocal(existingRows[config.entity] ?? [], saved);
        await insertSupabaseTimeline({
          entity: config.entity,
          entityId: Number(saved.id),
          actorEmail,
          notes: `Excel Import ${preview.sessionId}`,
          newValue: JSON.stringify(saved),
        });
      }
      executed.push({ ...row, result: "Success", message: existing?.id ? "Record updated." : "Record created." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import row failed.";
      executed.push({ ...row, result: "Error", message });
    }
  }
  return executed;
}

function resolvePayload(config: ExcelSheetConfig, row: ExcelRow, existingRows: ExistingRows) {
  const data: Record<string, unknown> = {};
  for (const column of config.columns) {
    if (column.readOnly) continue;
    if (helperKeys.has(column.key)) continue;
    if (row[column.key] !== null && row[column.key] !== undefined) data[column.key] = row[column.key];
  }

  if ("supplierCode" in row) data.supplierId = requireLookup(existingRows.suppliers, "code", row.supplierCode, config.sheet, "Supplier Code");
  if ("partNumber" in row && config.entity !== "partNumbers") data.partNumberId = requireLookup(existingRows.partNumbers, "partNumber", row.partNumber, config.sheet, "Part Number");
  if ("requesterName" in row) data.requesterId = optionalLookup(existingRows.requesters, "name", row.requesterName);
  if ("freightForwarder" in row) data.agentId = optionalLookup(existingRows.agents, "name", row.freightForwarder);
  if ("freightContract" in row) data.contractId = optionalLookup(existingRows.freightContracts, "contractNumber", row.freightContract);
  if ("shipmentNumber" in row) data.shipmentId = requireLookup(existingRows.shipments, "shipmentNumber", row.shipmentNumber, config.sheet, "Shipment Number");
  if ("demandNumber" in row) data.demandId = requireLookup(existingRows.demands, "demandNumber", row.demandNumber, config.sheet, "Demand Number");
  if ("invoiceNumber" in row && config.entity === "invoiceItems") {
    const shipmentId = data.shipmentId;
    const invoice = (existingRows.commercialInvoices ?? []).find((item) => String(item.shipmentId) === String(shipmentId) && String(item.invoiceNumber) === String(row.invoiceNumber));
    if (!invoice) throw new Error(`Invoice ${row.invoiceNumber} does not exist for shipment ${row.shipmentNumber}.`);
    data.invoiceId = invoice.id;
  }
  if ("consolidationNumber" in row) data.consolidationId = requireLookup(existingRows.consolidations, "consolidationNumber", row.consolidationNumber, config.sheet, "Consolidation Number");
  if (config.entity === "invoiceItems" && data.partNumberId) {
    const part = existingRows.partNumbers.find((item) => String(item.id) === String(data.partNumberId));
    data.supplierId = data.supplierId || part?.supplierId;
  }
  return data;
}

function findExistingForCommit(config: ExcelSheetConfig, row: ExcelRow, existingRows: ExistingRows) {
  if (config.entity === "shipments") return findBy(existingRows.shipments, "shipmentNumber", row.shipmentNumber);
  if (config.entity === "suppliers") return findBy(existingRows.suppliers, "code", row.code);
  if (config.entity === "partNumbers") return findBy(existingRows.partNumbers, "partNumber", row.partNumber);
  if (config.entity === "requesters") return findBy(existingRows.requesters, "name", row.name);
  if (config.entity === "agents") return findBy(existingRows.agents, "name", row.name);
  if (config.entity === "pol" || config.entity === "cfs") return findBy(existingRows[config.entity], "code", row.code);
  if (config.entity === "demands") return findBy(existingRows.demands, "demandNumber", row.demandNumber);
  if (config.entity === "commercialInvoices") {
    const shipmentId = optionalLookup(existingRows.shipments, "shipmentNumber", row.shipmentNumber);
    return existingRows.commercialInvoices?.find((item) => String(item.shipmentId) === String(shipmentId) && String(item.invoiceNumber) === String(row.invoiceNumber));
  }
  if (config.entity === "containers") return findBy(existingRows.containers, "containerNumber", row.containerNumber);
  if (config.entity === "freightContracts") return findBy(existingRows.freightContracts, "contractNumber", row.contractNumber);
  if (config.entity === "monthlyExchangeRates") return findBy(existingRows.monthlyExchangeRates, "month", row.month);
  return null;
}

function requireLookup(rows: Record<string, unknown>[] = [], key: string, value: unknown, sheet: string, label: string) {
  const found = findBy(rows, key, value);
  if (!found) throw new Error(`${sheet}: ${label} ${value || "-"} was not found.`);
  return found.id;
}

function optionalLookup(rows: Record<string, unknown>[] = [], key: string, value: unknown) {
  if (!value) return "";
  return findBy(rows, key, value)?.id ?? "";
}

function findBy(rows: Record<string, unknown>[] = [], key: string, value: unknown) {
  return rows.find((row) => String(row[key] ?? "").trim().toLowerCase() === String(value ?? "").trim().toLowerCase()) ?? null;
}

function upsertLocal(rows: Record<string, unknown>[], row: Record<string, unknown>) {
  return rows.some((item) => item.id === row.id) ? rows.map((item) => (item.id === row.id ? row : item)) : [row, ...rows];
}

const helperKeys = new Set([
  "supplierCode",
  "requesterName",
  "freightForwarder",
  "freightContract",
  "shipmentNumber",
  "demandNumber",
  "invoiceNumber",
  "consolidationNumber",
  "packingLine",
  "partNumber",
]);
