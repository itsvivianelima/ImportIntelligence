export type EntityKey =
  | "suppliers"
  | "partNumbers"
  | "requesters"
  | "agents"
  | "pol"
  | "cfs"
  | "demands"
  | "shipments"
  | "consolidations"
  | "freightContracts"
  | "publicRates"
  | "surcharges"
  | "exchangeRates"
  | "commercialInvoices"
  | "packages"
  | "containers";

export const materialTypes = [
  "Matéria Prima",
  "Improdutivo",
  "Revenda",
  "Amostra",
] as const;

export function resolveShipmentStatus(shipment: Record<string, unknown>) {
  if (shipment.deliveryDate) return "DELIVERED";
  if (shipment.ata) return "CONFIRMED ARRIVAL";
  if (shipment.atd) return "IN TRANSIT";
  if (shipment.etd && !shipment.atd) return "BOOKED";
  if (shipment.bookingConfirmedDate) return "BOOKING CONFIRMED";
  if (shipment.pickupConfirmedDate) return "PICKUP CONFIRMED";
  if (shipment.pickupScheduledDate) return "PICKUP SCHEDULED";
  if (shipment.greenLightDate && !shipment.cargoReadyDate) return "WAITING CARGO READY";
  if (shipment.greenLightDate && shipment.cargoReadyDate) return "READY TO BOOK";
  if (shipment.quotationDate) return "QUOTED";
  return "PLANNED";
}

export function resolveDemandStatus(demand: Record<string, unknown>) {
  const requested = Number(demand.requestedQuantity ?? 0);
  const fulfilled = Number(demand.fulfilledQuantity ?? 0);
  if (requested > 0 && fulfilled >= requested) return "FULFILLED";
  if (fulfilled > 0) return "PARTIALLY FULFILLED";
  return String(demand.status || "OPEN").toUpperCase();
}

export function calculateCbm(row: Record<string, unknown>) {
  const quantity = Number(row.quantity ?? 0);
  const length = Number(row.lengthCm ?? 0);
  const width = Number(row.widthCm ?? 0);
  const height = Number(row.heightCm ?? 0);
  if (!quantity || !length || !width || !height) return Number(row.cbm ?? 0);
  return Number(((quantity * length * width * height) / 1_000_000).toFixed(4));
}
