"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  airDestinations,
  clearanceTypes,
  containerTypes,
  currencies,
  dimensionUnits,
  incoterms,
  materialTypes,
  modals,
  packageTypes,
  paymentTerms,
  resolveDemandStatus,
  resolveShipmentStatus,
  seaDestinations,
  tariffTypes,
  type EntityKey,
} from "../../lib/domain";

type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "checkbox" | "relation" | "lookup";
  options?: readonly string[];
  relation?: EntityKey;
  relationLabel?: string[];
  relationValue?: string;
  dependsOn?: string;
  dependsValueKey?: string;
  quickAdd?: EntityKey;
};

type ModuleConfig = {
  key: EntityKey | "dashboard" | "reports" | "insights" | "settings" | "audit";
  title: string;
  group: string;
  description: string;
  fields?: Field[];
  columns?: string[];
  fullPage?: boolean;
};

type Row = Record<string, string | number | boolean | null>;

const modules: ModuleConfig[] = [
  {
    key: "dashboard",
    title: "DASHBOARD",
    group: "CONTROL",
    description: "Operational control center for open import work.",
  },
  {
    key: "demands",
    title: "DEMANDS",
    group: "OPERATIONS",
    description: "Demand pipeline connected to suppliers, part numbers, deadlines, and fulfillment.",
    fullPage: true,
    columns: ["demandNumber", "requiredDate", "requestedQuantity", "fulfilledQuantity", "status"],
    fields: [
      { key: "demandNumber", label: "DEMAND NUMBER" },
      { key: "reference", label: "REFERENCE" },
      { key: "supplierId", label: "SUPPLIER", type: "relation", relation: "suppliers", relationLabel: ["name", "country"], relationValue: "id" },
      { key: "partNumberId", label: "PART NUMBER", type: "relation", relation: "partNumbers", relationLabel: ["partNumber", "description"], relationValue: "id", dependsOn: "supplierId", dependsValueKey: "supplierId" },
      { key: "requesterId", label: "REQUESTER", type: "relation", relation: "requesters", relationLabel: ["name", "department"], relationValue: "id" },
      { key: "requestedQuantity", label: "QUANTITY", type: "number" },
      { key: "unitOfMeasure", label: "UNIT" },
      { key: "readinessDate", label: "READINESS DATE", type: "date" },
      { key: "modineDeadline", label: "MODINE DEADLINE", type: "date" },
      { key: "fulfilledQuantity", label: "FULFILLED QUANTITY", type: "number" },
      { key: "linkedQuantity", label: "LINKED QUANTITY", type: "number" },
      { key: "shippedQuantity", label: "SHIPPED QUANTITY", type: "number" },
      { key: "excessQuantity", label: "EXCESS QUANTITY", type: "number" },
      { key: "manuallyClosed", label: "CLOSE DEMAND AS FULFILLED", type: "checkbox" },
      { key: "forecastModal", label: "FORECAST MODAL", type: "select", options: ["", ...modals] },
      { key: "demandType", label: "TYPE", type: "select", options: materialTypes },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "shipments",
    title: "SHIPMENTS",
    group: "OPERATIONS",
    description: "Shipment execution with booking, route, documents, costs, and DELIVERY DATE status logic.",
    fullPage: true,
    columns: ["shipmentNumber", "modal", "pol", "pod", "eta", "status", "publicCost", "contractCost", "savingAmount"],
    fields: [
      { key: "shipmentNumber", label: "SHIPMENT NUMBER" },
      { key: "reference", label: "REFERENCE" },
      { key: "supplierId", label: "SUPPLIER", type: "relation", relation: "suppliers", relationLabel: ["name", "country"], relationValue: "id" },
      { key: "agentId", label: "AGENT", type: "relation", relation: "agents", relationLabel: ["name", "paymentTerms"], relationValue: "id" },
      { key: "modal", label: "MODAL", type: "select", options: modals },
      { key: "shipmentType", label: "SHIPMENT TYPE", type: "select", options: materialTypes },
      { key: "incoterm", label: "INCOTERM", type: "select", options: ["", ...incoterms] },
      { key: "clearanceType", label: "CLEARANCE", type: "select", options: ["", ...clearanceTypes] },
      { key: "tariffType", label: "TARIFF", type: "select", options: ["", ...tariffTypes] },
      { key: "contractId", label: "FREIGHT CONTRACT", type: "relation", relation: "freightContracts", relationLabel: ["contractNumber", "carrier"], relationValue: "id" },
      { key: "cfs", label: "CFS", type: "lookup", relation: "cfs", relationLabel: ["code", "name"], relationValue: "code", quickAdd: "cfs" },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code", quickAdd: "pol" },
      { key: "pod", label: "POD / AIRPORT", type: "select", options: ["", ...seaDestinations, ...airDestinations] },
      { key: "deadline", label: "DEADLINE", type: "date" },
      { key: "bookingNumber", label: "BOOKING NUMBER" },
      { key: "vessel", label: "VESSEL" },
      { key: "quotationDate", label: "QUOTATION DATE", type: "date" },
      { key: "greenLightDate", label: "GREEN LIGHT DATE", type: "date" },
      { key: "cargoReadyDate", label: "CARGO READY DATE", type: "date" },
      { key: "pickupScheduledDate", label: "PICKUP SCHEDULED DATE", type: "date" },
      { key: "pickupConfirmedDate", label: "PICKUP CONFIRMED DATE", type: "date" },
      { key: "bookingConfirmedDate", label: "BOOKING CONFIRMED DATE", type: "date" },
      { key: "etd", label: "ETD", type: "date" },
      { key: "atd", label: "ATD", type: "date" },
      { key: "initialEta", label: "INITIAL ETA", type: "date" },
      { key: "eta", label: "ETA", type: "date" },
      { key: "ata", label: "ATA", type: "date" },
      { key: "pcd", label: "PCD", type: "date" },
      { key: "pcdIsSet", label: "THIS ETD IS PCD", type: "checkbox" },
      { key: "deliveryDate", label: "DELIVERY DATE", type: "date" },
      { key: "stockEntryDate", label: "STOCK ENTRY DATE", type: "date" },
      { key: "operationalDeviation", label: "OPERATIONAL DEVIATION — EXCLUDE FROM FORECASTING", type: "checkbox" },
      { key: "hblAwb", label: "HBL / AWB" },
      { key: "hblAwbDate", label: "HBL / AWB DATE", type: "date" },
      { key: "contractCost", label: "CONTRACT COST", type: "number" },
      { key: "publicCost", label: "PUBLIC COST", type: "number" },
      { key: "savingAmount", label: "SAVING", type: "number" },
      { key: "costCurrency", label: "COST CURRENCY", type: "select", options: ["", ...currencies] },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "shipmentDemands",
    title: "SHIPMENT DEMANDS",
    group: "OPERATIONS",
    description: "Explicit demand-to-shipment allocation. Excess stays on the selected demand until manually applied elsewhere.",
    fullPage: true,
    columns: ["shipmentId", "demandId", "quantity", "notes"],
    fields: [
      { key: "shipmentId", label: "SHIPMENT", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber", "reference"], relationValue: "id" },
      { key: "demandId", label: "DEMAND", type: "relation", relation: "demands", relationLabel: ["demandNumber", "reference"], relationValue: "id" },
      { key: "quantity", label: "QUANTITY USED FROM DEMAND", type: "number" },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "consolidations",
    title: "CONSOLIDATIONS",
    group: "OPERATIONS",
    description: "LCL consolidation planning by CFS, POL, POD, closing date, CBM, and shared route fields.",
    fullPage: true,
    columns: ["consolidationNumber", "cfs", "pol", "pod", "closingDate", "totalCbm", "status"],
    fields: [
      { key: "consolidationNumber", label: "CONSOLIDATION NUMBER" },
      { key: "cfs", label: "CFS", type: "lookup", relation: "cfs", relationLabel: ["code", "name"], relationValue: "code", quickAdd: "cfs" },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code", quickAdd: "pol" },
      { key: "pod", label: "POD", type: "select", options: ["", ...seaDestinations] },
      { key: "closingDate", label: "CLOSING DATE", type: "date" },
      { key: "eta", label: "ETA", type: "date" },
      { key: "totalCbm", label: "TOTAL CBM", type: "number" },
      { key: "status", label: "STATUS", type: "select", options: ["OPEN", "CLOSED", "SHIPPED"] },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "consolidationShipments",
    title: "CONSOLIDATION SHIPMENTS",
    group: "OPERATIONS",
    description: "Links LCL shipments to a consolidation. Shared consolidation fields propagate to linked shipments.",
    fullPage: true,
    columns: ["consolidationId", "shipmentId", "managedFields"],
    fields: [
      { key: "consolidationId", label: "CONSOLIDATION", type: "relation", relation: "consolidations", relationLabel: ["consolidationNumber", "cfs"], relationValue: "id" },
      { key: "shipmentId", label: "SHIPMENT", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber", "reference"], relationValue: "id" },
      { key: "managedFields", label: "MANAGED FIELDS" },
    ],
  },
  {
    key: "suppliers",
    title: "SUPPLIERS",
    group: "MASTER DATA",
    description: "Supplier and exporter master data with TIN, default POL, and default CFS.",
    fullPage: true,
    columns: ["name", "city", "country", "defaultCurrency", "tin", "defaultPol", "defaultCfs"],
    fields: [
      { key: "code", label: "SUPPLIER CODE" },
      { key: "name", label: "FULL COMPANY NAME" },
      { key: "address", label: "FULL ADDRESS" },
      { key: "city", label: "CITY" },
      { key: "stateProvince", label: "STATE / PROVINCE" },
      { key: "postalCode", label: "POSTAL CODE" },
      { key: "country", label: "COUNTRY" },
      { key: "continent", label: "CONTINENT" },
      { key: "defaultCurrency", label: "DEFAULT CURRENCY", type: "select", options: ["", ...currencies] },
      { key: "tin", label: "TIN" },
      { key: "defaultIncotermAir", label: "DEFAULT INCOTERM AIR", type: "select", options: ["", ...incoterms] },
      { key: "defaultIncotermLcl", label: "DEFAULT INCOTERM LCL", type: "select", options: ["", ...incoterms] },
      { key: "defaultIncotermFcl", label: "DEFAULT INCOTERM FCL", type: "select", options: ["", ...incoterms] },
      { key: "defaultPol", label: "DEFAULT POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code", quickAdd: "pol" },
      { key: "defaultCfs", label: "DEFAULT CFS", type: "lookup", relation: "cfs", relationLabel: ["code", "name"], relationValue: "code", quickAdd: "cfs" },
      { key: "contactName", label: "CONTACT NAME" },
      { key: "contactEmail", label: "CONTACT EMAIL" },
      { key: "contactPhone", label: "CONTACT PHONE" },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "partNumbers",
    title: "PART NUMBERS",
    group: "MASTER DATA",
    description: "Part number attributes used for demand estimation, NCM, weight, and CBM.",
    columns: ["partNumber", "description", "ncm", "materialType", "netWeightKg", "cbm"],
    fields: [
      { key: "partNumber", label: "PART NUMBER" },
      { key: "supplierId", label: "SUPPLIER", type: "relation", relation: "suppliers", relationLabel: ["name", "country"], relationValue: "id" },
      { key: "description", label: "DESCRIPTION" },
      { key: "ncm", label: "NCM" },
      { key: "ncmReviewedAt", label: "NCM LAST REVIEW DATE", type: "date" },
      { key: "unitOfMeasure", label: "UNIT OF MEASURE" },
      { key: "materialType", label: "MATERIAL TYPE", type: "select", options: materialTypes },
      { key: "netWeightKg", label: "NET WEIGHT KG", type: "number" },
      { key: "cbm", label: "CBM", type: "number" },
    ],
  },
  {
    key: "requesters",
    title: "REQUESTERS",
    group: "MASTER DATA",
    description: "Requester master records for demand ownership and shipment request types.",
    columns: ["name", "email", "department"],
    fields: [
      { key: "name", label: "NAME" },
      { key: "email", label: "EMAIL" },
      { key: "department", label: "DEPARTMENT" },
    ],
  },
  {
    key: "agents",
    title: "AGENTS",
    group: "MASTER DATA",
    description: "Forwarder and agent contacts used in shipment execution and invoices.",
    columns: ["name", "contactName", "paymentTerms", "paymentDays"],
    fields: [
      { key: "name", label: "NAME" },
      { key: "contactName", label: "CONTACT NAME" },
      { key: "email", label: "EMAIL" },
      { key: "phone", label: "PHONE" },
      { key: "paymentDays", label: "PAYMENT DAYS", type: "number" },
      { key: "paymentTerms", label: "PAYMENT TERMS", type: "select", options: ["", ...paymentTerms] },
      { key: "serviceAir", label: "SERVICE AIR", type: "checkbox" },
      { key: "serviceLcl", label: "SERVICE LCL", type: "checkbox" },
      { key: "serviceFcl", label: "SERVICE FCL", type: "checkbox" },
      { key: "serviceCourier", label: "SERVICE COURIER", type: "checkbox" },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "pol",
    title: "POL",
    group: "MASTER DATA",
    description: "Port of loading master data.",
    columns: ["code", "name", "country"],
    fields: [
      { key: "code", label: "CODE" },
      { key: "name", label: "NAME" },
      { key: "country", label: "COUNTRY" },
    ],
  },
  {
    key: "cfs",
    title: "CFS",
    group: "MASTER DATA",
    description: "Container freight station master data.",
    columns: ["code", "name", "country"],
    fields: [
      { key: "code", label: "CODE" },
      { key: "name", label: "NAME" },
      { key: "country", label: "COUNTRY" },
    ],
  },
  {
    key: "freightContracts",
    title: "FREIGHT CONTRACTS",
    group: "CONTRACTS & COSTS",
    description: "Contract rates, equipment, validity, and consumption control.",
    fullPage: true,
    columns: ["contractNumber", "carrier", "modal", "pol", "pod", "currency", "rate", "usedCount"],
    fields: [
      { key: "contractNumber", label: "CONTRACT NUMBER" },
      { key: "carrier", label: "PROVIDER" },
      { key: "modal", label: "MODAL", type: "select", options: modals },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "pod", label: "POD", type: "select", options: ["ALL", ...seaDestinations, ...airDestinations] },
      { key: "equipment", label: "EQUIPMENT", type: "select", options: ["", ...containerTypes] },
      { key: "currency", label: "CURRENCY", type: "select", options: currencies },
      { key: "rate", label: "RATE", type: "number" },
      { key: "validFrom", label: "VALID FROM", type: "date" },
      { key: "validTo", label: "VALID TO", type: "date" },
      { key: "totalEquipment", label: "TOTAL EQUIPMENT", type: "number" },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "publicRates",
    title: "PUBLIC RATES",
    group: "CONTRACTS & COSTS",
    description: "Public tariff baseline used for savings calculations.",
    columns: ["carrier", "modal", "pol", "pod", "currency", "rate", "chargingBasis"],
    fields: [
      { key: "agentId", label: "PROVIDER", type: "relation", relation: "agents", relationLabel: ["name"], relationValue: "id" },
      { key: "carrier", label: "CARRIER / PROVIDER NAME" },
      { key: "modal", label: "MODAL", type: "select", options: modals },
      { key: "containerType", label: "CONTAINER", type: "select", options: ["Todos", ...containerTypes] },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "pod", label: "POD", type: "select", options: ["ALL", ...seaDestinations, ...airDestinations] },
      { key: "currency", label: "CURRENCY", type: "select", options: currencies },
      { key: "rate", label: "RATE", type: "number" },
      { key: "chargingBasis", label: "CHARGING BASIS", type: "select", options: ["W/M", "CBM", "CONTAINER", "AWB"] },
      { key: "validFrom", label: "VALID FROM", type: "date" },
      { key: "validTo", label: "VALID TO", type: "date" },
    ],
  },
  {
    key: "surcharges",
    title: "SURCHARGES",
    group: "CONTRACTS & COSTS",
    description: "Surcharges with comparable flag for accurate cost and savings logic.",
    columns: ["name", "modal", "currency", "amount", "chargingBasis", "comparable"],
    fields: [
      { key: "name", label: "NAME" },
      { key: "agentId", label: "PROVIDER", type: "relation", relation: "agents", relationLabel: ["name"], relationValue: "id" },
      { key: "modal", label: "MODAL", type: "select", options: modals },
      { key: "containerType", label: "CONTAINER", type: "select", options: ["", ...containerTypes] },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "pod", label: "POD", type: "select", options: ["", ...seaDestinations, ...airDestinations] },
      { key: "currency", label: "CURRENCY", type: "select", options: currencies },
      { key: "amount", label: "AMOUNT", type: "number" },
      { key: "chargingBasis", label: "CHARGING BASIS", type: "select", options: ["", "CONTAINER", "SHIPMENT", "BL", "W/M", "CBM", "TON", "PERCENTAGE", "MINIMUM", "MANUAL"] },
      { key: "validFrom", label: "VALID FROM", type: "date" },
      { key: "validTo", label: "VALID TO", type: "date" },
      { key: "comparable", label: "COMPARABLE", type: "checkbox" },
    ],
  },
  {
    key: "exchangeRates",
    title: "EXCHANGE RATES",
    group: "CONTRACTS & COSTS",
    description: "FX rates for multi-currency cost calculation.",
    columns: ["rateDate", "fromCurrency", "toCurrency", "rate"],
    fields: [
      { key: "rateDate", label: "RATE DATE", type: "date" },
      { key: "fromCurrency", label: "FROM CURRENCY", type: "select", options: currencies },
      { key: "toCurrency", label: "TO CURRENCY", type: "select", options: currencies },
      { key: "rate", label: "RATE", type: "number" },
    ],
  },
  {
    key: "commercialInvoices",
    title: "COMMERCIAL INVOICES",
    group: "DOCUMENTS & PACKING",
    description: "Shipment invoices with payment terms, currency, amount, and due date risk.",
    fullPage: true,
    columns: ["invoiceNumber", "shipmentId", "currency", "amount", "paymentTerms", "ddlDate"],
    fields: [
      { key: "shipmentId", label: "SHIPMENT", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber", "reference"], relationValue: "id" },
      { key: "invoiceNumber", label: "INVOICE NUMBER" },
      { key: "currency", label: "CURRENCY", type: "select", options: currencies },
      { key: "amount", label: "TOTAL AMOUNT", type: "number" },
      { key: "paymentTerms", label: "PAYMENT TERMS", type: "select", options: ["", ...paymentTerms] },
      { key: "ddlDate", label: "DDL DATE", type: "date" },
      { key: "risk", label: "RISK" },
    ],
  },
  {
    key: "invoiceItems",
    title: "INVOICE ITEMS",
    group: "DOCUMENTS & PACKING",
    description: "Invoice item lines that feed confirmed Supplier + Part Number history when document values are present.",
    fullPage: true,
    columns: ["invoiceId", "partNumberId", "quantity", "unitPrice", "currency", "valueKind"],
    fields: [
      { key: "invoiceId", label: "INVOICE", type: "relation", relation: "commercialInvoices", relationLabel: ["invoiceNumber", "currency"], relationValue: "id" },
      { key: "shipmentId", label: "SHIPMENT", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber", "reference"], relationValue: "id" },
      { key: "supplierId", label: "SUPPLIER", type: "relation", relation: "suppliers", relationLabel: ["name", "country"], relationValue: "id" },
      { key: "partNumberId", label: "PART NUMBER", type: "relation", relation: "partNumbers", relationLabel: ["partNumber", "description"], relationValue: "id", dependsOn: "supplierId", dependsValueKey: "supplierId" },
      { key: "quantity", label: "QUANTITY", type: "number" },
      { key: "unitPrice", label: "UNIT PRICE", type: "number" },
      { key: "currency", label: "CURRENCY", type: "select", options: currencies },
      { key: "netWeightKg", label: "NW UNIT KG", type: "number" },
      { key: "grossWeightKg", label: "GW UNIT KG", type: "number" },
      { key: "cbm", label: "CBM / UNIT", type: "number" },
      { key: "packageType", label: "PACKAGE TYPE", type: "select", options: ["", ...packageTypes] },
      { key: "valueKind", label: "VALUE KIND", type: "select", options: ["Confirmed / Document Value", "Estimated / Auto-filled"] },
      { key: "isSample", label: "SAMPLE", type: "checkbox" },
      { key: "customsValue", label: "CUSTOMS VALUE", type: "number" },
      { key: "payableValue", label: "PAYABLE VALUE", type: "number" },
    ],
  },
  {
    key: "supplierPartHistory",
    title: "SUPPLIER PART HISTORY",
    group: "DOCUMENTS & PACKING",
    description: "Confirmed historical values by Supplier + Part Number from invoices and packing data.",
    fullPage: true,
    columns: ["supplierId", "partNumberId", "sourceInvoice", "unitPrice", "currency", "sourceDate"],
    fields: [
      { key: "supplierId", label: "SUPPLIER", type: "relation", relation: "suppliers", relationLabel: ["name"], relationValue: "id" },
      { key: "partNumberId", label: "PART NUMBER", type: "relation", relation: "partNumbers", relationLabel: ["partNumber"], relationValue: "id" },
      { key: "shipmentId", label: "SHIPMENT", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber"], relationValue: "id" },
      { key: "invoiceId", label: "INVOICE", type: "relation", relation: "commercialInvoices", relationLabel: ["invoiceNumber"], relationValue: "id" },
      { key: "sourceDate", label: "SOURCE DATE", type: "date" },
      { key: "sourceInvoice", label: "SOURCE INVOICE" },
      { key: "unitPrice", label: "UNIT PRICE", type: "number" },
      { key: "currency", label: "CURRENCY", type: "select", options: ["", ...currencies] },
      { key: "netWeightKg", label: "NW UNIT KG", type: "number" },
      { key: "grossWeightKg", label: "GW UNIT KG", type: "number" },
      { key: "cbm", label: "CBM / UNIT", type: "number" },
      { key: "packageType", label: "PACKAGE TYPE", type: "select", options: ["", ...packageTypes] },
      { key: "valueKind", label: "VALUE KIND", type: "select", options: ["Confirmed / Document Value", "Estimated / Auto-filled"] },
    ],
  },
  {
    key: "packages",
    title: "PACKING",
    group: "DOCUMENTS & PACKING",
    description: "Volumes, dimensions, CBM, gross weight, and stackability.",
    fullPage: true,
    columns: ["packageIdentification", "packageType", "quantity", "cbm", "grossWeightKg"],
    fields: [
      { key: "shipmentId", label: "SHIPMENT", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber", "reference"], relationValue: "id" },
      { key: "packageIdentification", label: "VOLUME IDENTIFICATION" },
      { key: "packageType", label: "PACKAGE TYPE", type: "select", options: packageTypes },
      { key: "quantity", label: "QUANTITY", type: "number" },
      { key: "lengthCm", label: "LENGTH", type: "number" },
      { key: "widthCm", label: "WIDTH", type: "number" },
      { key: "heightCm", label: "HEIGHT", type: "number" },
      { key: "dimensionUnit", label: "DIMENSION UNIT", type: "select", options: dimensionUnits },
      { key: "cbm", label: "CBM", type: "number" },
      { key: "grossWeightKg", label: "GROSS WEIGHT KG", type: "number" },
      { key: "stackable", label: "STACKABLE", type: "checkbox" },
      { key: "stackingLevels", label: "STACKING LEVELS", type: "number" },
    ],
  },
  {
    key: "containers",
    title: "CONTAINERS",
    group: "DOCUMENTS & PACKING",
    description: "Container numbers, equipment, volumes, CBM, gross weight, and free time.",
    fullPage: true,
    columns: ["containerNumber", "equipment", "packageQuantity", "cbm", "grossWeightKg", "freeTimeDeadline"],
    fields: [
      { key: "shipmentId", label: "SHIPMENT", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber", "reference"], relationValue: "id" },
      { key: "containerNumber", label: "CONTAINER NUMBER" },
      { key: "equipment", label: "EQUIPMENT", type: "select", options: ["", ...containerTypes] },
      { key: "packageQuantity", label: "PACKAGE QUANTITY", type: "number" },
      { key: "cbm", label: "CBM", type: "number" },
      { key: "grossWeightKg", label: "GROSS WEIGHT KG", type: "number" },
      { key: "freeTimeDays", label: "FREE TIME DAYS", type: "number" },
      { key: "freeTimeDeadline", label: "FREE TIME DEADLINE", type: "date" },
    ],
  },
  {
    key: "shipmentCosts",
    title: "SHIPMENT COSTS",
    group: "CONTRACTS & COSTS",
    description: "Estimated and actual shipment costs by currency, kept separate for variance analysis.",
    fullPage: true,
    columns: ["shipmentId", "costType", "description", "currency", "amount"],
    fields: [
      { key: "shipmentId", label: "SHIPMENT", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber", "reference"], relationValue: "id" },
      { key: "costType", label: "COST TYPE", type: "select", options: ["Estimated Cost", "Actual Cost"] },
      { key: "description", label: "DESCRIPTION" },
      { key: "currency", label: "CURRENCY", type: "select", options: currencies },
      { key: "amount", label: "AMOUNT", type: "number" },
      { key: "source", label: "SOURCE" },
    ],
  },
  {
    key: "monthlyExchangeRates",
    title: "MONTHLY EXCHANGE RATES",
    group: "CONTRACTS & COSTS",
    description: "Monthly Modine exchange rates used by report month without replacing original values.",
    fullPage: true,
    columns: ["month", "usdBrl", "eurBrl", "gbpBrl", "sekBrl"],
    fields: [
      { key: "month", label: "MONTH YYYY-MM" },
      { key: "usdBrl", label: "USD TO BRL", type: "number" },
      { key: "eurBrl", label: "EUR TO BRL", type: "number" },
      { key: "gbpBrl", label: "GBP TO BRL", type: "number" },
      { key: "sekBrl", label: "SEK TO BRL", type: "number" },
    ],
  },
  {
    key: "freeTimeRules",
    title: "FREE TIME RULES",
    group: "CONTRACTS & COSTS",
    description: "Configurable free time by equipment type. Container deadlines use these values when provided.",
    fullPage: true,
    columns: ["equipment", "freeTimeDays", "alertDaysBefore"],
    fields: [
      { key: "equipment", label: "EQUIPMENT", type: "select", options: containerTypes },
      { key: "freeTimeDays", label: "FREE TIME DAYS", type: "number" },
      { key: "alertDaysBefore", label: "ALERT DAYS BEFORE", type: "number" },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "timelineEvents",
    title: "TIMELINE",
    group: "SYSTEM",
    description: "Audit timeline of relevant operational field changes and propagation notes.",
    fullPage: true,
    columns: ["entity", "entityId", "fieldName", "actorEmail", "createdAt"],
    fields: [
      { key: "entity", label: "ENTITY" },
      { key: "entityId", label: "ENTITY ID", type: "number" },
      { key: "fieldName", label: "FIELD" },
      { key: "previousValue", label: "PREVIOUS VALUE", type: "textarea" },
      { key: "newValue", label: "NEW VALUE", type: "textarea" },
      { key: "actorEmail", label: "ACTOR EMAIL" },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "reports",
    title: "REPORTS",
    group: "ANALYTICS",
    description: "Confirmed transit, probable transit, estimated transit, and savings reports.",
  },
  {
    key: "insights",
    title: "INSIGHTS & INTELLIGENCE",
    group: "ANALYTICS",
    description: "Executive overview, performance intelligence, supplier signals, and pipeline risk.",
  },
  {
    key: "settings",
    title: "SETTINGS",
    group: "SYSTEM",
    description: "General preferences, appearance, and account configuration.",
  },
];

const quickStats = [
  "OPEN DEMANDS",
  "ACTIVE SHIPMENTS",
  "CONFIRMED ARRIVALS",
  "DELIVERED",
  "CONSOLIDATIONS",
  "SAVINGS",
];

const emptyForm: Row = {};

export function ImportIntelligenceApp({
  user,
  signOutPath,
}: {
  user: { displayName: string; email: string };
  signOutPath: string;
}) {
  const [activeKey, setActiveKey] = useState<ModuleConfig["key"]>("dashboard");
  const [rowsByEntity, setRowsByEntity] = useState<Record<string, Row[]>>({});
  const [draft, setDraft] = useState<Row>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [appearance, setAppearance] = useState(() => {
    if (typeof window === "undefined") return "SYSTEM";
    return window.localStorage.getItem("import-intelligence-appearance") ?? "SYSTEM";
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const active = modules.find((module) => module.key === activeKey) ?? modules[0];
  const entityKey = active.fields ? (active.key as EntityKey) : null;
  const rows = entityKey ? rowsByEntity[entityKey] ?? [] : [];
  const filteredRows = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
  );
  const requiredReferences = useMemo(() => {
    const references = new Set<EntityKey>();
    active.fields?.forEach((field) => {
      if (field.relation) references.add(field.relation);
    });
    return Array.from(references).filter((reference) => reference !== entityKey);
  }, [active.fields, entityKey]);

  useEffect(() => {
    document.documentElement.dataset.theme = appearance.toLowerCase();
    window.localStorage.setItem("import-intelligence-appearance", appearance);
  }, [appearance]);

  useEffect(() => {
    if (!entityKey) return;
    let cancelled = false;
    fetch(`/api/records/${entityKey}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setRowsByEntity((current) => ({ ...current, [entityKey]: data.rows ?? [] }));
      })
      .catch(() => setMessage("DATABASE CONNECTION IS NOT READY"));
    return () => {
      cancelled = true;
    };
  }, [entityKey]);

  useEffect(() => {
    let cancelled = false;
    requiredReferences.forEach((reference) => {
      fetch(`/api/records/${reference}`)
        .then((response) => response.json())
        .then((data) => {
          if (!cancelled) setRowsByEntity((current) => ({ ...current, [reference]: data.rows ?? [] }));
        })
        .catch(() => setMessage("RELATED MASTER DATA IS NOT READY"));
    });
    return () => {
      cancelled = true;
    };
  }, [requiredReferences]);

  const groupedModules = useMemo(() => {
    return modules.reduce<Record<string, ModuleConfig[]>>((groups, module) => {
      groups[module.group] = [...(groups[module.group] ?? []), module];
      return groups;
    }, {});
  }, []);

  function startNew() {
    setDraft({});
    setEditingId(null);
    setMessage("");
  }

  function editRow(row: Row) {
    setDraft(row);
    setEditingId(Number(row.id));
    setMessage("");
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityKey) return;

    const method = editingId ? "PATCH" : "POST";
    const payload = { ...draft, ...(editingId ? { id: editingId } : {}) };
    const response = await fetch(`/api/records/${entityKey}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(String(data.error ?? "SAVE FAILED").toUpperCase());
      return;
    }

    setRowsByEntity((current) => {
      const existing = current[entityKey] ?? [];
      const nextRows = editingId
        ? existing.map((row) => (row.id === editingId ? data.row : row))
        : [data.row, ...existing];
      return { ...current, [entityKey]: nextRows };
    });
    setDraft({});
    setEditingId(null);
    setMessage("RECORD SAVED");
  }

  async function deleteRecord(row: Row) {
    if (!entityKey || !row.id) return;
    const response = await fetch(`/api/records/${entityKey}?id=${row.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setMessage(String(data.error ?? "DELETE FAILED").toUpperCase());
      return;
    }
    setRowsByEntity((current) => ({
      ...current,
      [entityKey]: (current[entityKey] ?? []).filter((item) => item.id !== row.id),
    }));
    setMessage("RECORD DELETED");
  }

  const projectedStatus =
    active.key === "shipments"
      ? resolveShipmentStatus(draft)
      : active.key === "demands"
        ? resolveDemandStatus(draft)
        : null;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="PRIMARY NAVIGATION">
        <div className="sidebar-brand">
          <div className="brand-mark">II</div>
          <div>
            <strong>IMPORT INTELLIGENCE</strong>
            <span>CONTROL PLATFORM</span>
          </div>
        </div>
        <nav>
          {Object.entries(groupedModules).map(([group, items]) => (
            <section key={group} className="nav-group">
              <p>{group}</p>
              {items.map((item) => (
                <button
                  key={item.key}
                  className={activeKey === item.key ? "active" : ""}
                  onClick={() => {
                    setActiveKey(item.key);
                    setDraft({});
                    setEditingId(null);
                    setMessage("");
                  }}
                >
                  {item.title}
                </button>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <p className="breadcrumb">IMPORT INTELLIGENCE / {active.title}</p>
            <h1>{active.title}</h1>
          </div>
          <label className="global-search">
            <span>SEARCH</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button className="notification-button" aria-label="NOTIFICATIONS">
            0
          </button>
          <div className="user-menu">
            <button onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
              {user.displayName}
            </button>
            {menuOpen ? (
              <div className="user-popover">
                <strong>USER MENU</strong>
                <span>{user.email}</span>
                <label>
                  APPEARANCE
                  <select value={appearance} onChange={(event) => setAppearance(event.target.value)}>
                    <option>LIGHT</option>
                    <option>DARK</option>
                    <option>SYSTEM</option>
                  </select>
                </label>
                <a href={signOutPath}>SIGN OUT</a>
              </div>
            ) : null}
          </div>
        </header>

        <div className="content-grid">
          <section className="workspace">
            <div className="page-intro">
              <div>
                <h2>{active.title}</h2>
                <p>{active.description}</p>
              </div>
              {entityKey ? <button onClick={startNew}>NEW RECORD</button> : null}
            </div>

            {active.key === "dashboard" ? <Dashboard /> : null}
            {active.key === "reports" ? <Reports /> : null}
            {active.key === "insights" ? <Insights /> : null}
            {active.key === "settings" ? (
              <Settings appearance={appearance} onAppearanceChange={setAppearance} />
            ) : null}

            {entityKey ? (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {(active.columns ?? []).map((column) => (
                          <th key={column}>{labelize(column)}</th>
                        ))}
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length ? (
                        filteredRows.map((row) => (
                          <tr key={String(row.id)}>
                            {(active.columns ?? []).map((column) => (
                              <td key={column}>{formatCell(row[column])}</td>
                            ))}
                            <td className="row-actions">
                              <button onClick={() => editRow(row)}>EDIT</button>
                              <button onClick={() => deleteRecord(row)}>DELETE</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={(active.columns?.length ?? 0) + 1}>
                            <div className="empty-state">
                              <strong>NO OPERATIONAL RECORDS</strong>
                              <span>IMPORT INTELLIGENCE starts empty. Create the first {active.title.toLowerCase()} record when ready.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="pagination">PAGE 1 / {Math.max(1, Math.ceil(filteredRows.length / 200))}</p>
              </>
            ) : null}
          </section>

          <aside className="detail-panel">
            <h2>DETAIL PANEL</h2>
            {message ? <p className="status-message">{message}</p> : null}
            {entityKey && active.fields ? (
              <form onSubmit={saveRecord}>
                <div className="form-section">
                  <h3>{active.fullPage ? "FULL PAGE EDITOR" : "GENERAL INFORMATION"}</h3>
                  {projectedStatus ? (
                    <p className="calculated-status">CALCULATED STATUS: {projectedStatus}</p>
                  ) : null}
                  {active.fields.map((field) =>
                    isFieldVisible(field, draft) ? (
                      <FieldControl
                        key={`${field.key}:${String(draft.id ?? "new")}`}
                        field={field}
                        value={draft[field.key]}
                        draft={draft}
                        referenceRows={field.relation ? rowsByEntity[field.relation] ?? [] : []}
                        onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
                        onQuickAdd={(entity) => {
                          setActiveKey(entity);
                          setDraft({});
                          setEditingId(null);
                          setMessage(`ADD NEW ${labelize(entity)}`);
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="form-actions">
                  <button type="button" onClick={startNew}>
                    CANCEL
                  </button>
                  <button type="submit">SAVE</button>
                </div>
              </form>
            ) : (
            <div className="detail-empty">
                <strong>CONNECTED ENTITIES</strong>
                <span>Supplier {"->"} Part Number {"->"} Demand {"->"} Shipment Demand Link {"->"} Shipment {"->"} Packing {"->"} Containers {"->"} Invoices {"->"} Reports {"->"} Insights</span>
              </div>
            )}
          </aside>
        </div>

        <footer>IMPORT INTELLIGENCE / EMPTY GREENFIELD DATABASE / ENGLISH UI</footer>
      </section>
    </main>
  );
}

function FieldControl({
  field,
  value,
  draft,
  referenceRows,
  onChange,
  onQuickAdd,
}: {
  field: Field;
  value: Row[string];
  draft: Row;
  referenceRows: Row[];
  onChange: (value: string | number | boolean) => void;
  onQuickAdd: (entity: EntityKey) => void;
}) {
  const [searchValue, setSearchValue] = useState(() => {
    const selected = findSelectedReference(field, referenceRows, value);
    return selected ? referenceLabel(field, selected) : String(value ?? "");
  });

  if (field.type === "relation" || field.type === "lookup") {
    const options = filterReferenceRows(field, referenceRows, draft);
    const listId = `${field.key}-options`;
    return (
      <label className="field">
        {field.label}
        <div className="combo-row">
          <input
            list={listId}
            value={searchValue}
            placeholder={options.length ? "SEARCH AND SELECT" : "NO MASTER DATA YET"}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSearchValue(nextValue);
              if (!nextValue) {
                onChange("");
                return;
              }
              const selected = options.find((row) => referenceLabel(field, row) === nextValue);
              if (selected) {
                const rawValue = selected[field.relationValue ?? "id"];
                onChange(field.type === "relation" ? Number(rawValue) : String(rawValue ?? ""));
              }
            }}
          />
          {field.quickAdd ? (
            <button type="button" title={`Add new ${field.quickAdd}`} onClick={() => onQuickAdd(field.quickAdd!)}>
              +
            </button>
          ) : null}
        </div>
        <datalist id={listId}>
          {options.map((row) => (
            <option key={String(row.id ?? referenceLabel(field, row))} value={referenceLabel(field, row)} />
          ))}
        </datalist>
        <span className="field-help">
          {options.length ? "USES MASTER DATA" : "CREATE THE MASTER RECORD FIRST"}
        </span>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="field field-wide">
        {field.label}
        <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="field">
        {field.label}
        <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option || "SELECT"}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="field checkbox-field">
        <input
          type="checkbox"
          checked={Boolean(value ?? true)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  return (
    <label className="field">
      {field.label}
      <input
        type={field.type ?? "text"}
        value={String(value ?? "")}
        onChange={(event) =>
          onChange(field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)
        }
      />
    </label>
  );
}

function isFieldVisible(field: Field, draft: Row) {
  const modal = String(draft.modal ?? "");
  if (field.key === "cfs" && modal === "AIR") return false;
  if (field.key === "vessel" && modal === "AIR") return false;
  return true;
}

function filterReferenceRows(field: Field, rows: Row[], draft: Row) {
  if (!field.dependsOn || !field.dependsValueKey) return rows;
  const expected = draft[field.dependsOn];
  if (!expected) return rows;
  return rows.filter((row) => String(row[field.dependsValueKey!] ?? "") === String(expected));
}

function findSelectedReference(field: Field, rows: Row[], value: Row[string]) {
  const valueKey = field.relationValue ?? "id";
  return rows.find((row) => String(row[valueKey] ?? "") === String(value ?? ""));
}

function referenceLabel(field: Field, row: Row) {
  const parts = (field.relationLabel ?? ["name"])
    .map((key) => row[key])
    .filter((part) => part !== null && part !== undefined && part !== "");
  const value = row[field.relationValue ?? "id"];
  return `${parts.join(" / ") || value} [${value}]`;
}

function Dashboard() {
  return (
    <>
      <section className="welcome-card">
        <div>
          <p className="eyebrow">IMPORT OPERATIONS CONTROL</p>
          <h2>IMPORT INTELLIGENCE</h2>
          <p>Connected import management with an empty operational database ready for real records.</p>
        </div>
        <span className="connection-badge">DATABASE EMPTY</span>
      </section>
      <div className="dashboard-grid">
        {quickStats.map((stat) => (
          <article key={stat} className="metric">
            <span>{stat}</span>
            <strong>0</strong>
            <small>NO RECORDS</small>
          </article>
        ))}
      </div>
    </>
  );
}

function Reports() {
  return (
    <div className="report-grid">
      {[
        ["CONFIRMED TRANSIT", "/api/records/shipments?export=confirmed"],
        ["PROBABLE TRANSIT", "/api/records/shipments?export=probable"],
        ["ESTIMATED TRANSIT", "/api/records/demands?export=estimated"],
        ["SAVINGS", ""],
      ].map(([report, exportPath]) => (
        <article key={report}>
          <h3>{report}</h3>
          <p>Waiting for operational history. No fake production data is loaded.</p>
          {exportPath ? (
            <a className="export-link" href={exportPath}>
              EXPORT EXCEL
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function Insights() {
  return (
    <div className="report-grid">
      {["EXECUTIVE OVERVIEW", "OPERATIONAL PERFORMANCE", "SUPPLIERS & AGENTS", "CONTRACTS & COSTS", "DEMAND & PIPELINE"].map((report) => (
        <article key={report}>
          <h3>{report}</h3>
          <p>Insights will calculate after real demands, shipments, costs, and delivery dates exist.</p>
        </article>
      ))}
    </div>
  );
}

function Settings({
  appearance,
  onAppearanceChange,
}: {
  appearance: string;
  onAppearanceChange: (value: string) => void;
}) {
  return (
    <section className="settings-panel">
      <h3>GENERAL</h3>
      <label className="field">
        APPEARANCE
        <select value={appearance} onChange={(event) => onAppearanceChange(event.target.value)}>
          <option>LIGHT</option>
          <option>DARK</option>
          <option>SYSTEM</option>
        </select>
      </label>
      <p>Appearance is persisted on this device. Operational records remain database-backed.</p>
    </section>
  );
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").trim().toUpperCase();
}

function formatCell(value: Row[string]) {
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}
