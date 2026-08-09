type Row = Record<string, unknown>;

const reportTitles: Record<string, string> = {
  confirmed: "CONFIRMED TRANSIT",
  probable: "PROBABLE TRANSIT",
  estimated: "ESTIMATED TRANSIT",
};

export function isReportExport(value: string | null) {
  return Boolean(value && value in reportTitles);
}

export function buildTransitExcelExport(report: string, rows: Row[], referenceRows: Record<string, Row[]> = {}) {
  const supplierById = new Map((referenceRows.suppliers ?? []).map((supplier) => [String(supplier.id), supplier]));
  const pnById = new Map((referenceRows.partNumbers ?? []).map((partNumber) => [String(partNumber.id), partNumber]));
  const invoices = referenceRows.commercialInvoices ?? [];
  const partHistory = referenceRows.supplierPartHistory ?? [];
  const monthlyExchangeRates = referenceRows.monthlyExchangeRates ?? [];

  const reportRows =
    report === "confirmed"
      ? rows.filter(isConfirmedTransit).map((shipment) => shipmentReportRow(shipment, supplierById, "Shipment", ""))
          .map((row, index) => withShipmentInvoiceValue(row, rows.filter(isConfirmedTransit)[index], invoices, monthlyExchangeRates))
      : report === "probable"
        ? rows.filter(isProbableTransit).map((shipment) => shipmentReportRow(shipment, supplierById, "Shipment", "External schedule"))
            .map((row, index) => withShipmentInvoiceValue(row, rows.filter(isProbableTransit)[index], invoices, monthlyExchangeRates))
        : rows.map((row) => demandReportRow(row, supplierById, pnById, partHistory, monthlyExchangeRates));

  const workbook = buildExcelHtml(reportTitles[report], reportRows);
  return new Response(workbook, {
    headers: {
      "content-type": "application/vnd.ms-excel; charset=utf-8",
      "content-disposition": `attachment; filename="${report}-transit.xls"`,
      "cache-control": "no-store",
    },
  });
}

function isConfirmedTransit(shipment: Row) {
  if (shipment.deliveryDate || shipment.stockEntryDate) return false;
  const incoterm = String(shipment.incoterm ?? "").toUpperCase();
  if (incoterm === "EXW" || incoterm === "FCA") return Boolean(shipment.pickupConfirmedDate);
  if (incoterm === "FOB") return Boolean(shipment.atd);
  return Boolean(shipment.ata);
}

function isProbableTransit(shipment: Row) {
  if (shipment.deliveryDate || shipment.stockEntryDate || isConfirmedTransit(shipment)) return false;
  const incoterm = String(shipment.incoterm ?? "").toUpperCase();
  if (incoterm === "EXW" || incoterm === "FCA") return Boolean(shipment.pickupScheduledDate);
  if (incoterm === "FOB") return Boolean(shipment.etd);
  return Boolean(shipment.eta);
}

function shipmentReportRow(shipment: Row, supplierById: Map<string, Row>, source: string, confidence: string) {
  const supplier = supplierById.get(String(shipment.supplierId ?? ""));
  return {
    SOURCE: source,
    REFERENCE: shipment.reference || shipment.shipmentNumber || "",
    SUPPLIER: supplier?.name ?? "",
    PN: "",
    MODAL: shipment.modal ?? "",
    INCOTERM: shipment.incoterm ?? "",
    PICKUP: shipment.pickupConfirmedDate || shipment.pickupScheduledDate || "",
    "ETD / ATD": [shipment.etd, shipment.atd].filter(Boolean).join(" / "),
    "ETA / ATA": [shipment.eta, shipment.ata].filter(Boolean).join(" / "),
    INVOICES: "",
    CURRENCY: "",
    "ORIGINAL VALUE": "",
    "BRL VALUE": "",
    CONFIDENCE: confidence,
  };
}

function demandReportRow(
  demand: Row,
  supplierById: Map<string, Row>,
  pnById: Map<string, Row>,
  partHistory: Row[],
  monthlyExchangeRates: Row[],
) {
  const supplier = supplierById.get(String(demand.supplierId ?? ""));
  const pn = pnById.get(String(demand.partNumberId ?? ""));
  const latestPrice = findLatestPartHistory(partHistory, demand);
  const operationalQuantity = Math.max(0, Number(demand.requestedQuantity ?? 0) - Number(demand.shippedQuantity ?? demand.fulfilledQuantity ?? 0));
  const originalValue = latestPrice ? operationalQuantity * Number(latestPrice.unitPrice ?? 0) : "";
  const currency = latestPrice?.currency ?? "";
  return {
    SOURCE: "Demand",
    REFERENCE: demand.reference || demand.demandNumber || "",
    SUPPLIER: supplier?.name ?? "",
    PN: pn?.partNumber ?? "",
    MODAL: demand.forecastModal ?? "",
    INCOTERM: "",
    PICKUP: demand.readinessDate ?? "",
    "ETD / ATD": "",
    "ETA / ATA": demand.modineDeadline ?? "",
    INVOICES: "",
    CURRENCY: currency,
    "ORIGINAL VALUE": originalValue,
    "BRL VALUE": originalValue === "" ? "" : convertToBrl(Number(originalValue), String(currency), monthlyExchangeRates),
    CONFIDENCE: latestPrice
      ? `Estimated using Unit Price from Invoice ${latestPrice.sourceInvoice || "-"} / ${latestPrice.sourceDate || "-"}`
      : "Demand estimate pending historical invoice data",
  };
}

function withShipmentInvoiceValue(row: Row, shipment: Row, invoices: Row[], monthlyExchangeRates: Row[]) {
  const shipmentInvoices = invoices.filter((invoice) => String(invoice.shipmentId ?? "") === String(shipment.id ?? ""));
  const currencies = Array.from(new Set(shipmentInvoices.map((invoice) => String(invoice.currency ?? "")).filter(Boolean)));
  if (currencies.length !== 1) {
    return {
      ...row,
      INVOICES: shipmentInvoices.map((invoice) => invoice.invoiceNumber).filter(Boolean).join(", "),
      CURRENCY: currencies.join(" / "),
      "ORIGINAL VALUE": currencies.length ? "MULTI-CURRENCY" : "",
      "BRL VALUE": "",
    };
  }
  const currency = currencies[0];
  const originalValue = shipmentInvoices.reduce((total, invoice) => total + Number(invoice.amount ?? 0), 0);
  return {
    ...row,
    INVOICES: shipmentInvoices.map((invoice) => invoice.invoiceNumber).filter(Boolean).join(", "),
    CURRENCY: currency,
    "ORIGINAL VALUE": originalValue || "",
    "BRL VALUE": originalValue ? convertToBrl(originalValue, currency, monthlyExchangeRates) : "",
  };
}

function findLatestPartHistory(history: Row[], demand: Row) {
  return history
    .filter(
      (row) =>
        String(row.supplierId ?? "") === String(demand.supplierId ?? "") &&
        String(row.partNumberId ?? "") === String(demand.partNumberId ?? "") &&
        row.unitPrice !== null &&
        row.unitPrice !== undefined &&
        row.unitPrice !== "" &&
        row.valueKind !== "Estimated / Auto-filled",
    )
    .sort((left, right) => String(right.sourceDate ?? "").localeCompare(String(left.sourceDate ?? "")))[0];
}

function convertToBrl(value: number, currency: string, monthlyExchangeRates: Row[]) {
  if (!value) return "";
  if (currency === "BRL") return value;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const rateRow = monthlyExchangeRates.find((row) => row.month === currentMonth) ?? monthlyExchangeRates[0];
  if (!rateRow) return "";
  const rateKey = `${currency.toLowerCase()}Brl`;
  const rate = Number(rateRow[rateKey] ?? 0);
  return rate ? Number((value * rate).toFixed(2)) : "";
}

function buildExcelHtml(title: string, rows: Row[]) {
  const columns = [
    "SOURCE",
    "REFERENCE",
    "SUPPLIER",
    "PN",
    "MODAL",
    "INCOTERM",
    "PICKUP",
    "ETD / ATD",
    "ETA / ATA",
    "INVOICES",
    "CURRENCY",
    "ORIGINAL VALUE",
    "BRL VALUE",
    "CONFIDENCE",
  ];

  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<table>
<thead>
<tr><th colspan="${columns.length}">${escapeHtml(title)}</th></tr>
<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
</thead>
<tbody>
${rows.length ? rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">NO RECORDS</td></tr>`}
</tbody>
</table>
</body>
</html>`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
