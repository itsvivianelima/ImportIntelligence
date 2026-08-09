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
  | "containers"
  | "shipmentDemands";

export const materialTypes = [
  "Matéria Prima",
  "Improdutivo",
  "Revenda",
  "Amostra",
] as const;

export const modals = ["AIR", "LCL", "FCL"] as const;
export const clearanceTypes = ["Formal", "Liberação Expressa"] as const;
export const tariffTypes = ["SPOT", "BID", "Contrato Maersk", "Economy", "Priority"] as const;
export const containerTypes = ["20 Dry", "40 Dry", "40 High Cube / 40 HC", "40 NOR"] as const;
export const currencies = ["BRL", "USD", "EUR", "GBP", "SEK"] as const;
export const paymentTerms = ["NET", "DDL", "ADV"] as const;
export const packageTypes = ["Carton", "Pallet", "Wooden Case", "Crate", "Bundle", "Other"] as const;
export const dimensionUnits = ["IN", "CM", "MM"] as const;
export const seaDestinations = ["Santos", "Itajaí"] as const;
export const airDestinations = ["GRU", "VCP"] as const;
export const incoterms = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
] as const;

export const shipmentStatuses = [
  "Pending",
  "Quoted / Scheduled",
  "Waiting for Cargo Readiness",
  "Waiting for Pickup Confirmation",
  "Pickup Confirmed",
  "Waiting for Booking Confirmation",
  "Booking Confirmed",
  "Waiting for Departure Confirmation",
  "In Transit",
  "Confirmed Arrival",
  "Delivered",
] as const;

export const demandStatuses = ["Open", "Partially Fulfilled", "Fulfilled", "Closed"] as const;

export function resolveShipmentStatus(shipment: Record<string, unknown>) {
  if (shipment.deliveryDate || shipment.stockEntryDate) return "Delivered";
  if (shipment.ata) return "Confirmed Arrival";
  if (shipment.atd) return "In Transit";
  if (shipment.etd && !shipment.atd) return "Waiting for Departure Confirmation";
  if (shipment.bookingConfirmedDate || shipment.bookingNumber) return "Booking Confirmed";
  if (shipment.pickupConfirmedDate) return "Pickup Confirmed";
  if (shipment.greenLightDate && !shipment.cargoReadyDate) return "Waiting for Cargo Readiness";
  if (shipment.greenLightDate && shipment.cargoReadyDate && !shipment.pickupConfirmedDate) {
    return "Waiting for Pickup Confirmation";
  }
  if (shipment.quotationDate || shipment.pickupScheduledDate) return "Quoted / Scheduled";
  return "Pending";
}

export function resolveDemandStatus(demand: Record<string, unknown>) {
  if (demand.manuallyClosed || demand.status === "Closed") return "Closed";
  const requested = Number(demand.requestedQuantity ?? 0);
  const fulfilled = Number(demand.fulfilledQuantity ?? 0);
  if (requested > 0 && fulfilled >= requested) return "Fulfilled";
  if (fulfilled > 0) return "Partially Fulfilled";
  return "Open";
}

export function calculateCbm(row: Record<string, unknown>) {
  const quantity = Number(row.quantity ?? 0);
  const length = Number(row.lengthCm ?? 0);
  const width = Number(row.widthCm ?? 0);
  const height = Number(row.heightCm ?? 0);
  if (!quantity || !length || !width || !height) return Number(row.cbm ?? 0);
  return Number(((quantity * length * width * height) / 1_000_000).toFixed(4));
}
