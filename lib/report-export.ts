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

  const reportRows =
    report === "confirmed"
      ? rows.filter(isConfirmedTransit).map((shipment) => shipmentReportRow(shipment, supplierById, "Shipment", ""))
      : report === "probable"
        ? rows.filter(isProbableTransit).map((shipment) => shipmentReportRow(shipment, supplierById, "Shipment", "External schedule"))
        : rows.map((row) => demandReportRow(row, supplierById, pnById));

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

function demandReportRow(demand: Row, supplierById: Map<string, Row>, pnById: Map<string, Row>) {
  const supplier = supplierById.get(String(demand.supplierId ?? ""));
  const pn = pnById.get(String(demand.partNumberId ?? ""));
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
    CURRENCY: "",
    "ORIGINAL VALUE": "",
    "BRL VALUE": "",
    CONFIDENCE: "Demand estimate pending historical invoice data",
  };
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
