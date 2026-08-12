import * as XLSX from "xlsx";
import {
  allowedValueGroups,
  excelSheets,
  excelTemplateVersion,
  maxImportFileBytes,
  maxImportRowsPerSheet,
  type ExcelColumn,
  type ExcelSheetConfig,
} from "./excel-config";

export type ExcelRow = Record<string, string | number | boolean | null>;
export type ImportIssue = {
  severity: "error" | "warning";
  sheet: string;
  row: number;
  identifier: string;
  message: string;
  received?: string;
  expected?: string;
};
export type ImportPreviewRow = {
  sheet: string;
  row: number;
  entity: string;
  action: "create" | "update" | "skip";
  identifier: string;
  data: ExcelRow;
};
export type ImportPreview = {
  sessionId: string;
  templateVersion: string;
  fileName: string;
  fileSize: number;
  sheetsProcessed: string[];
  sheetsIgnored: string[];
  created: number;
  updated: number;
  skipped: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  rows: ImportPreviewRow[];
};

const workbookType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const exampleText = "EXAMPLE ONLY - DO NOT IMPORT";

export function buildTemplateWorkbook(kind: "blank" | "example") {
  const workbook = XLSX.utils.book_new();
  appendAoASheet(workbook, "Instructions", buildInstructions(kind));
  appendAoASheet(workbook, "Field Dictionary", buildFieldDictionary());
  appendAoASheet(workbook, "Allowed Values", buildAllowedValues());

  for (const sheet of excelSheets) {
    const rows = kind === "example" ? [exampleRow(sheet)] : [];
    appendJsonSheet(workbook, sheet.sheet, sheet.columns.map((column) => column.header), rows);
  }

  return workbookResponse(workbook, kind === "blank" ? "Import_Intelligence_Blank_Template.xlsx" : "Import_Intelligence_Example_Template.xlsx");
}

export function buildExportWorkbook(rowsByEntity: Record<string, Record<string, unknown>[]>, scope?: string) {
  const workbook = XLSX.utils.book_new();
  appendAoASheet(workbook, "Instructions", buildInstructions("blank"));
  appendAoASheet(workbook, "Field Dictionary", buildFieldDictionary());
  appendAoASheet(workbook, "Allowed Values", buildAllowedValues());

  const selectedSheets = scope ? excelSheets.filter((sheet) => sheet.entity === scope || sheet.sheet === scope) : excelSheets;
  for (const sheet of selectedSheets) {
    const rows = (rowsByEntity[sheet.entity] ?? []).map((row) => exportRow(sheet, row, rowsByEntity));
    appendJsonSheet(workbook, sheet.sheet, sheet.columns.map((column) => column.header), rows);
  }

  return workbookResponse(workbook, scope ? `${safeFileName(scope)}_Export.xlsx` : "Import_Intelligence_Export.xlsx");
}

export function parseImportWorkbook(input: ArrayBuffer, fileName: string, existingRows: Record<string, Record<string, unknown>[]>, scope?: string): ImportPreview {
  if (input.byteLength > maxImportFileBytes) {
    return emptyPreview(fileName, input.byteLength, [{
      severity: "error",
      sheet: "Workbook",
      row: 0,
      identifier: fileName,
      message: `File is larger than the ${Math.round(maxImportFileBytes / 1024 / 1024)} MB limit.`,
    }]);
  }

  const workbook = XLSX.read(input, { type: "array", cellDates: false, cellFormula: true });
  const expectedSheets = new Set((scope ? excelSheets.filter((sheet) => sheet.entity === scope || sheet.sheet === scope) : excelSheets).map((sheet) => sheet.sheet));
  const ignored = workbook.SheetNames.filter((name) => !expectedSheets.has(name) && !["Instructions", "Field Dictionary", "Allowed Values", "Import Result"].includes(name));
  const issues: ImportIssue[] = [];
  const rows: ImportPreviewRow[] = [];
  const processed: string[] = [];

  const version = findTemplateVersion(workbook) || "Unknown";
  if (version !== excelTemplateVersion) {
    issues.push({
      severity: "warning",
      sheet: "Instructions",
      row: 1,
      identifier: "Template Version",
      message: `Template version is ${version}. Current version is ${excelTemplateVersion}.`,
      received: version,
      expected: excelTemplateVersion,
    });
  }

  for (const config of excelSheets.filter((sheet) => expectedSheets.has(sheet.sheet))) {
    const worksheet = workbook.Sheets[config.sheet];
    if (!worksheet) continue;
    processed.push(config.sheet);
    const matrix = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(worksheet, { header: 1, defval: "" });
    const headers = (matrix[0] ?? []).map((value) => String(value ?? "").trim());
    validateHeaders(config, headers, issues);
    const dataRows = matrix.slice(1).filter((row) => row.some((value) => String(value ?? "").trim() !== ""));
    if (dataRows.length > maxImportRowsPerSheet) {
      issues.push(issue("error", config.sheet, 0, config.sheet, `Sheet exceeds the ${maxImportRowsPerSheet} row limit.`));
      continue;
    }
    dataRows.forEach((values, index) => {
      const rowNumber = index + 2;
      const mapped = mapExcelRow(config, headers, values, rowNumber, issues);
      if (!mapped) return;
      if (isExampleRow(mapped)) {
        rows.push({ sheet: config.sheet, row: rowNumber, entity: config.entity, action: "skip", identifier: "Example row", data: mapped });
        return;
      }
      const identifier = rowIdentifier(config, mapped);
      const existing = findExisting(config, mapped, existingRows);
      rows.push({ sheet: config.sheet, row: rowNumber, entity: config.entity, action: existing ? "update" : "create", identifier, data: mapped });
    });
  }

  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");
  return {
    sessionId: `EXCEL-${Date.now().toString(36).toUpperCase()}`,
    templateVersion: version,
    fileName,
    fileSize: input.byteLength,
    sheetsProcessed: processed,
    sheetsIgnored: ignored,
    created: rows.filter((row) => row.action === "create").length,
    updated: rows.filter((row) => row.action === "update").length,
    skipped: rows.filter((row) => row.action === "skip").length,
    errors,
    warnings,
    rows,
  };
}

export function buildImportResultWorkbook(preview: ImportPreview, executedRows: Array<ImportPreviewRow & { result: string; message: string }>) {
  const workbook = XLSX.utils.book_new();
  appendJsonSheet(workbook, "Import Result", [
    "Sheet",
    "Row",
    "Identification",
    "Result",
    "Message",
    "Action Executed",
    "Session",
  ], executedRows.map((row) => ({
    Sheet: row.sheet,
    Row: row.row,
    Identification: row.identifier,
    Result: row.result,
    Message: row.message,
    "Action Executed": row.action,
    Session: preview.sessionId,
  })));
  appendJsonSheet(workbook, "Errors", ["Severity", "Sheet", "Row", "Identification", "Message", "Received", "Expected"], [...preview.errors, ...preview.warnings].map((item) => ({
    Severity: item.severity,
    Sheet: item.sheet,
    Row: item.row,
    Identification: item.identifier,
    Message: item.message,
    Received: item.received ?? "",
    Expected: item.expected ?? "",
  })));
  return workbookResponse(workbook, `Import_Result_${preview.sessionId}.xlsx`);
}

export function workbookResponse(workbook: XLSX.WorkBook, filename: string) {
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  return new Response(bytes, {
    headers: {
      "content-type": workbookType,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

function appendAoASheet(workbook: XLSX.WorkBook, name: string, rows: unknown[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = autoColumns(rows);
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, rows.length - 1), c: Math.max(0, (rows[0]?.length ?? 1) - 1) } }) };
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

function appendJsonSheet(workbook: XLSX.WorkBook, name: string, headers: string[], rows: Record<string, unknown>[]) {
  const matrix = [headers, ...rows.map((row) => headers.map((header) => sanitizeExportValue(row[header] ?? "")))];
  appendAoASheet(workbook, name, matrix);
}

function buildInstructions(kind: "blank" | "example") {
  return [
    ["Template Version", excelTemplateVersion],
    ["Tipo do arquivo", kind === "blank" ? "Template vazio para uso real" : "Template de exemplo para referencia"],
    ["Finalidade", "Preencher, atualizar, validar, exportar e reimportar dados operacionais do Import Operations."],
    ["Ordem recomendada", "1. Cadastros mestres; 2. Demandas; 3. Embarques; 4. Vinculos; 5. Invoices; 6. Itens; 7. Packing; 8. Containers; 9. Custos; 10. Consolidacoes."],
    ["Criar registros", "Preencha uma nova linha usando identificadores operacionais legiveis, como Supplier Code, Part Number, Shipment Number ou Demand Number."],
    ["Atualizar registros", "Use o mesmo identificador operacional. O sistema mostra a acao proposta antes de gravar."],
    ["Relacionamentos", "Use codigos legiveis. Nao preencha UUIDs nem chaves tecnicas."],
    ["Datas", "Use YYYY-MM-DD. Exemplo: 2026-08-12."],
    ["Mes", "Use YYYY-MM. Exemplo: 2026-08."],
    ["Decimais", "Use 1250.50 ou 1250,50. Nao use separador de milhar ambiguo."],
    ["Booleanos", "Use Yes ou No."],
    ["Avisos importantes", "Nao altere nomes das abas, cabecalhos, ordem das colunas, nao use celulas mescladas e nao importe linhas de exemplo como dados reais."],
    ["Documentos", "O Excel importa metadados de documentos. Ele nao faz upload de arquivos externos."],
  ];
}

function buildFieldDictionary() {
  return [[
    "Sheet",
    "Column",
    "Description in Portuguese",
    "Required",
    "Data Type",
    "Format",
    "Allowed Values",
    "Example",
    "Used to Match Existing Records",
    "Can Be Updated",
    "Notes",
  ], ...excelSheets.flatMap((sheet) => sheet.columns.map((column) => [
    sheet.sheet,
    column.header,
    column.descriptionPt,
    column.required ? "Yes" : "No",
    column.type,
    column.format ?? "",
    column.allowed?.join(", ") ?? "",
    column.example ?? "",
    column.match ? "Yes" : "No",
    column.updatable && !column.readOnly ? "Yes" : "No",
    column.notes ?? (column.readOnly ? "Campo calculado ou somente leitura." : ""),
  ]))];
}

function buildAllowedValues() {
  return [["Category", "Allowed Value"], ...Object.entries(allowedValueGroups).flatMap(([category, values]) => values.map((value) => [category, value]))];
}

function exampleRow(sheet: ExcelSheetConfig) {
  return Object.fromEntries(sheet.columns.map((column) => [column.header, column.example ?? defaultExample(column)]));
}

function defaultExample(column: ExcelColumn) {
  if (column.header === "Supplier Code") return "EXAMPLE-SUP";
  if (column.header === "Shipment Number") return "EXAMPLE-SHIP-001";
  if (column.header === "Demand Number") return "EXAMPLE-DEM-001";
  if (column.header === "Invoice Number") return "EXAMPLE-INV-001";
  if (column.header === "Part Number") return "EXAMPLE-PN-001";
  if (column.header === "Document Type") return "Commercial Invoice";
  if (column.type === "date") return "2026-08-12";
  if (column.type === "month") return "2026-08";
  if (column.type === "number") return 1;
  if (column.type === "boolean") return "Yes";
  return column.required ? exampleText : "";
}

function exportRow(sheet: ExcelSheetConfig, row: Record<string, unknown>, rowsByEntity: Record<string, Record<string, unknown>[]>) {
  return Object.fromEntries(sheet.columns.map((column) => [column.header, exportValue(column, row, rowsByEntity)]));
}

function exportValue(column: ExcelColumn, row: Record<string, unknown>, rowsByEntity: Record<string, Record<string, unknown>[]>) {
  if (column.key === "supplierCode") return lookup(rowsByEntity.suppliers, row.supplierId, "code");
  if (column.key === "partNumber") return lookup(rowsByEntity.partNumbers, row.partNumberId, "partNumber") || row.partNumber;
  if (column.key === "requesterName") return lookup(rowsByEntity.requesters, row.requesterId, "name");
  if (column.key === "freightForwarder") return lookup(rowsByEntity.agents, row.agentId, "name");
  if (column.key === "freightContract") return lookup(rowsByEntity.freightContracts, row.contractId, "contractNumber");
  if (column.key === "shipmentNumber") return lookup(rowsByEntity.shipments, row.shipmentId, "shipmentNumber") || row.shipmentNumber;
  if (column.key === "demandNumber") return lookup(rowsByEntity.demands, row.demandId, "demandNumber") || row.demandNumber;
  if (column.key === "invoiceNumber") return lookup(rowsByEntity.commercialInvoices, row.invoiceId, "invoiceNumber") || row.invoiceNumber;
  const value = row[column.key];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value ?? "";
}

function lookup(rows: Record<string, unknown>[] | undefined, id: unknown, key: string) {
  return rows?.find((row) => String(row.id) === String(id))?.[key] ?? "";
}

function validateHeaders(config: ExcelSheetConfig, headers: string[], issues: ImportIssue[]) {
  const expected = config.columns.map((column) => column.header);
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  duplicates.forEach((header) => issues.push(issue("error", config.sheet, 1, header, `Duplicate column "${header}".`)));
  expected.forEach((header) => {
    if (!headers.includes(header)) issues.push(issue("error", config.sheet, 1, header, `Required header "${header}" is missing.`));
  });
}

function mapExcelRow(config: ExcelSheetConfig, headers: string[], values: Array<string | number | boolean | null>, rowNumber: number, issues: ImportIssue[]) {
  const output: ExcelRow = {};
  for (const column of config.columns) {
    const index = headers.indexOf(column.header);
    if (index === -1) continue;
    const raw = values[index];
    const parsed = parseValue(column, raw);
    if (column.required && isBlank(parsed.value)) {
      issues.push(issue("error", config.sheet, rowNumber, column.header, `${column.header} is required.`));
    }
    if (parsed.error) {
      issues.push(issue("error", config.sheet, rowNumber, column.header, parsed.error, String(raw ?? ""), column.format));
    }
    if (column.allowed?.length && !isBlank(parsed.value) && !column.allowed.includes(String(parsed.value))) {
      issues.push(issue("error", config.sheet, rowNumber, column.header, `${column.header} has an unsupported value.`, String(parsed.value), column.allowed.join(", ")));
    }
    output[column.key] = parsed.value;
  }
  return output;
}

function parseValue(column: ExcelColumn, raw: unknown): { value: string | number | boolean | null; error?: string } {
  if (raw === null || raw === undefined || String(raw).trim() === "") return { value: null };
  const text = String(raw).trim();
  if (column.type === "number") {
    const normalized = normalizeDecimal(text);
    if (!Number.isFinite(normalized)) return { value: null, error: `${column.header} must be a valid decimal number.` };
    return { value: normalized };
  }
  if (column.type === "boolean") {
    if (/^(yes|true|1)$/i.test(text)) return { value: true };
    if (/^(no|false|0)$/i.test(text)) return { value: false };
    return { value: null, error: `${column.header} must be Yes or No.` };
  }
  if (column.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { value: text, error: `${column.header} must use YYYY-MM-DD format.` };
  }
  if (column.type === "month" && !/^\d{4}-\d{2}$/.test(text)) {
    return { value: text, error: `${column.header} must use YYYY-MM format.` };
  }
  return { value: text };
}

function normalizeDecimal(text: string) {
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(text)) return Number.NaN;
  return Number(text.replace(",", "."));
}

function rowIdentifier(config: ExcelSheetConfig, row: ExcelRow) {
  return config.columns.filter((column) => column.match).map((column) => row[column.key]).filter(Boolean).join(" / ") || config.sheet;
}

function findExisting(config: ExcelSheetConfig, row: ExcelRow, existingRows: Record<string, Record<string, unknown>[]>) {
  const matchColumns = config.columns.filter((column) => column.match);
  if (!matchColumns.length) return null;
  return (existingRows[config.entity] ?? []).find((existing) => matchColumns.every((column) => String(existing[column.key] ?? "") === String(row[column.key] ?? ""))) ?? null;
}

function isExampleRow(row: ExcelRow) {
  return Object.values(row).some((value) => String(value ?? "").includes("EXAMPLE"));
}

function emptyPreview(fileName: string, fileSize: number, errors: ImportIssue[]): ImportPreview {
  return {
    sessionId: `EXCEL-${Date.now().toString(36).toUpperCase()}`,
    templateVersion: "Unknown",
    fileName,
    fileSize,
    sheetsProcessed: [],
    sheetsIgnored: [],
    created: 0,
    updated: 0,
    skipped: 0,
    errors,
    warnings: [],
    rows: [],
  };
}

function issue(severity: "error" | "warning", sheet: string, row: number, identifier: string, message: string, received?: string, expected?: string): ImportIssue {
  return { severity, sheet, row, identifier, message, received, expected };
}

function isBlank(value: unknown) {
  return value === null || value === undefined || value === "";
}

function findTemplateVersion(workbook: XLSX.WorkBook) {
  const instructions = workbook.Sheets.Instructions;
  if (!instructions) return "";
  const rows = XLSX.utils.sheet_to_json<Array<string>>(instructions, { header: 1, defval: "" });
  return rows.find((row) => row[0] === "Template Version")?.[1] ?? "";
}

function autoColumns(rows: unknown[][]) {
  const widthCount = rows[0]?.length ?? 1;
  return Array.from({ length: widthCount }, (_, index) => ({
    wch: Math.min(42, Math.max(14, ...rows.map((row) => String(row[index] ?? "").length + 2))),
  }));
}

function sanitizeExportValue(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : value;
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "_");
}
