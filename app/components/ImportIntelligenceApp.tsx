"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  readOnly?: boolean;
};

type ModuleConfig = {
  key: EntityKey | "dashboard" | "supplierFollowUp" | "reports" | "insights" | "settings";
  title: string;
  group: string;
  description: string;
  fields?: Field[];
  columns?: string[];
  hiddenFromMenu?: boolean;
  readOnly?: boolean;
  newLabel?: string;
  searchPlaceholder?: string;
  modalSize?: "simple" | "medium";
};

type Row = Record<string, string | number | boolean | null>;
type RowsByEntity = Record<string, Row[]>;
type ModalState = { module: ModuleConfig; row: Row | null } | null;

const routeOptions = ["", ...seaDestinations, ...airDestinations];
const documentTypes = [
  "Commercial Invoice",
  "Packing List",
  "HBL",
  "AWB",
  "Booking Confirmation",
  "Arrival Notice",
  "Customs Document",
  "Other",
] as const;

const modules: ModuleConfig[] = [
  { key: "dashboard", title: "Dashboard", group: "Overview", description: "Operational indicators for demands, shipments, arrivals, alerts, and savings." },
  { key: "supplierFollowUp", title: "Supplier Follow-up", group: "Overview", description: "Demand follow-up by priority, supplier, readiness, and outstanding quantity." },
  {
    key: "demands",
    title: "Demands",
    group: "Operations",
    description: "Demand pipeline connected to suppliers, part numbers, deadlines, and fulfillment.",
    columns: ["demandNumber", "reference", "supplierId", "partNumberId", "requesterId", "requestedQuantity", "unitOfMeasure", "modineDeadline", "status"],
    newLabel: "New Demand",
    searchPlaceholder: "Search demands...",
    modalSize: "medium",
    fields: [
      { key: "demandNumber", label: "Demand Number" },
      { key: "reference", label: "Reference" },
      { key: "supplierId", label: "Supplier", type: "relation", relation: "suppliers", relationLabel: ["name", "country"], relationValue: "id" },
      { key: "partNumberId", label: "Part Number", type: "relation", relation: "partNumbers", relationLabel: ["partNumber", "description"], relationValue: "id", dependsOn: "supplierId", dependsValueKey: "supplierId" },
      { key: "requesterId", label: "Requester", type: "relation", relation: "requesters", relationLabel: ["name", "department"], relationValue: "id" },
      { key: "requestedQuantity", label: "Quantity", type: "number" },
      { key: "unitOfMeasure", label: "Unit" },
      { key: "readinessDate", label: "Cargo Ready Date", type: "date" },
      { key: "modineDeadline", label: "Required at Modine", type: "date" },
      { key: "fulfilledQuantity", label: "Fulfilled Quantity", type: "number" },
      { key: "linkedQuantity", label: "Allocated Quantity", type: "number" },
      { key: "shippedQuantity", label: "Shipped Quantity", type: "number" },
      { key: "excessQuantity", label: "Excess Quantity", type: "number" },
      { key: "manuallyClosed", label: "Mark as Fulfilled", type: "checkbox" },
      { key: "forecastModal", label: "Recommended Mode", type: "select", options: ["", ...modals] },
      { key: "demandType", label: "Material Type", type: "select", options: materialTypes },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "shipments",
    title: "Shipments",
    group: "Operations",
    description: "Shipment dossiers with route, demand allocation, invoices, packing, containers, costs, documents, and history.",
    columns: ["shipmentNumber", "reference", "supplierId", "modal", "agentId", "etd", "eta", "status", "alerts"],
    newLabel: "New Shipment",
    searchPlaceholder: "Search shipments...",
    fields: [],
  },
  {
    key: "consolidations",
    title: "Consolidations",
    group: "Operations",
    description: "LCL consolidation planning by CFS, POL, POD, closing date, CBM, and shared route fields.",
    columns: ["consolidationNumber", "cfs", "pol", "pod", "closingDate", "totalCbm", "status"],
    newLabel: "New Consolidation",
    searchPlaceholder: "Search consolidations...",
    modalSize: "medium",
    fields: [
      { key: "consolidationNumber", label: "Consolidation Number" },
      { key: "cfs", label: "CFS", type: "lookup", relation: "cfs", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "pod", label: "POD", type: "select", options: ["", ...seaDestinations] },
      { key: "closingDate", label: "Closing Date", type: "date" },
      { key: "eta", label: "ETA", type: "date" },
      { key: "totalCbm", label: "Total CBM", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Open", "Closed", "Shipped"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "consolidationShipments",
    title: "Consolidation Loads",
    group: "Operations",
    description: "Links LCL shipments to a consolidation. Shared fields propagate to linked shipments.",
    columns: ["consolidationId", "shipmentId", "managedFields"],
    newLabel: "New Load",
    searchPlaceholder: "Search consolidation loads...",
    modalSize: "medium",
    fields: [
      { key: "consolidationId", label: "Consolidation", type: "relation", relation: "consolidations", relationLabel: ["consolidationNumber", "cfs"], relationValue: "id" },
      { key: "shipmentId", label: "Shipment", type: "relation", relation: "shipments", relationLabel: ["shipmentNumber", "reference"], relationValue: "id" },
      { key: "managedFields", label: "Managed Fields" },
    ],
  },
  {
    key: "shipmentDemands",
    title: "Demand Allocation",
    group: "Operations",
    hiddenFromMenu: true,
    description: "Demand allocations owned by shipment dossiers.",
    columns: ["demandId", "quantity", "notes"],
    fields: [
      { key: "demandId", label: "Demand", type: "relation", relation: "demands", relationLabel: ["demandNumber", "reference"], relationValue: "id" },
      { key: "quantity", label: "Allocated to This Shipment", type: "number" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "commercialInvoices",
    title: "Commercial Invoices",
    group: "Documents & Cargo",
    hiddenFromMenu: true,
    description: "Invoice headers owned by shipment dossiers.",
    columns: ["invoiceNumber", "supplierId", "currency", "amount", "paymentTerms", "ddlDate", "risk"],
    fields: [
      { key: "invoiceNumber", label: "Invoice Number" },
      { key: "supplierId", label: "Supplier", type: "relation", relation: "suppliers", relationLabel: ["name"], relationValue: "id" },
      { key: "invoiceDate", label: "Invoice Date", type: "date" },
      { key: "currency", label: "Currency", type: "select", options: currencies },
      { key: "amount", label: "Declared Total", type: "number" },
      { key: "paymentTerms", label: "Payment Terms", type: "select", options: ["", ...paymentTerms] },
      { key: "ddlDate", label: "Due Date", type: "date" },
      { key: "risk", label: "Payment Risk" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "invoiceItems",
    title: "Invoice Items",
    group: "Documents & Cargo",
    hiddenFromMenu: true,
    description: "Invoice item lines owned by shipment dossiers.",
    columns: ["partNumberId", "quantity", "unitPrice", "currency", "totalAmount", "packageType", "valueKind"],
    fields: [
      { key: "partNumberId", label: "Part Number", type: "relation", relation: "partNumbers", relationLabel: ["partNumber", "description"], relationValue: "id", dependsOn: "supplierId", dependsValueKey: "supplierId" },
      { key: "description", label: "Description", readOnly: true },
      { key: "ncm", label: "NCM", readOnly: true },
      { key: "unitOfMeasure", label: "Unit of Measure", readOnly: true },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "unitPrice", label: "Unit Price", type: "number" },
      { key: "currency", label: "Currency", type: "select", options: currencies },
      { key: "netWeightKg", label: "Net Weight per Unit (kg)", type: "number" },
      { key: "grossWeightKg", label: "Gross Weight per Unit (kg)", type: "number" },
      { key: "cbm", label: "CBM per Unit", type: "number" },
      { key: "packageType", label: "Package Type", type: "select", options: ["", ...packageTypes] },
      { key: "valueKind", label: "Value Source", type: "select", options: ["Confirmed from Document", "Estimated from History"] },
    ],
  },
  {
    key: "packages",
    title: "Packing",
    group: "Documents & Cargo",
    hiddenFromMenu: true,
    description: "Packing lines owned by shipment dossiers.",
    columns: ["packageIdentification", "packageType", "quantity", "cbm", "netWeightKg", "grossWeightKg"],
    fields: [
      { key: "packageIdentification", label: "Package Identification" },
      { key: "packageType", label: "Package Type", type: "select", options: packageTypes },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "lengthCm", label: "Length", type: "number" },
      { key: "widthCm", label: "Width", type: "number" },
      { key: "heightCm", label: "Height", type: "number" },
      { key: "dimensionUnit", label: "Dimension Unit", type: "select", options: dimensionUnits },
      { key: "cbm", label: "CBM", type: "number" },
      { key: "netWeightKg", label: "Net Weight (kg)", type: "number" },
      { key: "grossWeightKg", label: "Gross Weight (kg)", type: "number" },
      { key: "stackable", label: "Stackable", type: "checkbox" },
      { key: "stackingLevels", label: "Stacking Levels", type: "number" },
      { key: "linkedInvoice", label: "Linked Invoice" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "containers",
    title: "Containers",
    group: "Documents & Cargo",
    hiddenFromMenu: true,
    description: "Container details owned by shipment dossiers.",
    columns: ["containerNumber", "equipment", "seal", "packageQuantity", "cbm", "grossWeightKg", "freeTimeDays", "freeTimeDeadline"],
    fields: [
      { key: "containerNumber", label: "Container Number" },
      { key: "equipment", label: "Equipment", type: "select", options: ["", ...containerTypes] },
      { key: "seal", label: "Seal Number" },
      { key: "packageQuantity", label: "Package Quantity", type: "number" },
      { key: "cbm", label: "CBM", type: "number" },
      { key: "grossWeightKg", label: "Gross Weight (kg)", type: "number" },
      { key: "freeTimeDays", label: "Free Time Days", type: "number" },
      { key: "freeTimeDeadline", label: "Free Time Deadline", type: "date" },
      { key: "linkedPacking", label: "Linked Packing" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "shipmentCosts",
    title: "Shipment Costs",
    group: "Freight & Costs",
    hiddenFromMenu: true,
    description: "Estimated and actual shipment costs owned by shipment dossiers.",
    columns: ["costType", "description", "currency", "amount", "source"],
    fields: [
      { key: "costType", label: "Cost Type", type: "select", options: ["Estimated Cost", "Actual Cost"] },
      { key: "description", label: "Description" },
      { key: "currency", label: "Currency", type: "select", options: currencies },
      { key: "amount", label: "Amount", type: "number" },
      { key: "source", label: "Source" },
    ],
  },
  {
    key: "shipmentDocuments",
    title: "Shipment Documents",
    group: "Documents & Cargo",
    hiddenFromMenu: true,
    description: "Document metadata linked to shipment storage paths.",
    columns: ["documentType", "documentNumber", "documentDate", "fileName", "storagePath", "notes"],
    fields: [
      { key: "documentType", label: "Document Type", type: "select", options: documentTypes },
      { key: "documentNumber", label: "Document Number" },
      { key: "documentDate", label: "Document Date", type: "date" },
      { key: "fileName", label: "File Name" },
      { key: "storagePath", label: "Storage Path" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "suppliers",
    title: "Suppliers",
    group: "Master Data",
    description: "Supplier and exporter master data.",
    columns: ["code", "name", "city", "country", "defaultCurrency", "tin", "defaultPol", "defaultCfs"],
    newLabel: "New Supplier",
    searchPlaceholder: "Search suppliers...",
    modalSize: "medium",
    fields: [
      { key: "code", label: "Supplier Code" },
      { key: "name", label: "Company Name" },
      { key: "address", label: "Full Address", type: "textarea" },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State / Province" },
      { key: "postalCode", label: "Postal Code" },
      { key: "country", label: "Country" },
      { key: "continent", label: "Continent" },
      { key: "defaultCurrency", label: "Default Currency", type: "select", options: ["", ...currencies] },
      { key: "tin", label: "Tax Identification Number" },
      { key: "defaultIncotermAir", label: "Default Air Incoterm", type: "select", options: ["", ...incoterms] },
      { key: "defaultIncotermLcl", label: "Default LCL Incoterm", type: "select", options: ["", ...incoterms] },
      { key: "defaultIncotermFcl", label: "Default FCL Incoterm", type: "select", options: ["", ...incoterms] },
      { key: "defaultPol", label: "Default POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "defaultCfs", label: "Default CFS", type: "lookup", relation: "cfs", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "contactName", label: "Contact Name" },
      { key: "contactEmail", label: "Contact Email" },
      { key: "contactPhone", label: "Contact Phone" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "partNumbers",
    title: "Part Numbers",
    group: "Master Data",
    description: "Part number attributes used for demand estimation, NCM, weight, and CBM.",
    columns: ["partNumber", "supplierId", "description", "ncm", "ncmReviewedAt", "unitOfMeasure", "materialType", "netWeightKg", "grossWeightKg", "cbm", "packageType"],
    newLabel: "New Part Number",
    searchPlaceholder: "Search part numbers...",
    modalSize: "medium",
    fields: [
      { key: "partNumber", label: "Part Number" },
      { key: "supplierId", label: "Supplier", type: "relation", relation: "suppliers", relationLabel: ["name", "country"], relationValue: "id" },
      { key: "description", label: "Description" },
      { key: "ncm", label: "NCM" },
      { key: "ncmReviewedAt", label: "NCM Last Review", type: "date" },
      { key: "unitOfMeasure", label: "Unit of Measure" },
      { key: "materialType", label: "Material Type", type: "select", options: materialTypes },
      { key: "netWeightKg", label: "Net Weight per Unit (kg)", type: "number" },
      { key: "grossWeightKg", label: "Gross Weight per Unit (kg)", type: "number" },
      { key: "cbm", label: "CBM per Unit", type: "number" },
      { key: "packageType", label: "Package Type", type: "select", options: ["", ...packageTypes] },
    ],
  },
  {
    key: "requesters",
    title: "Requesters",
    group: "Master Data",
    description: "Requester records for demand ownership.",
    columns: ["name", "email", "department"],
    newLabel: "New Requester",
    searchPlaceholder: "Search requesters...",
    fields: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
    ],
  },
  {
    key: "agents",
    title: "Freight Forwarders",
    group: "Master Data",
    description: "Forwarder contacts used in shipment execution and invoices.",
    columns: ["name", "contactName", "email", "phone", "paymentDays", "paymentTerms"],
    newLabel: "New Freight Forwarder",
    searchPlaceholder: "Search freight forwarders...",
    modalSize: "medium",
    fields: [
      { key: "name", label: "Company Name" },
      { key: "contactName", label: "Contact Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "paymentDays", label: "Payment Days", type: "number" },
      { key: "paymentTerms", label: "Payment Terms", type: "select", options: ["", ...paymentTerms] },
      { key: "serviceAir", label: "Air Service", type: "checkbox" },
      { key: "serviceLcl", label: "LCL Service", type: "checkbox" },
      { key: "serviceFcl", label: "FCL Service", type: "checkbox" },
      { key: "serviceCourier", label: "Courier Service", type: "checkbox" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "pol",
    title: "Ports of Loading",
    group: "Master Data",
    description: "Port of loading master data.",
    columns: ["code", "name", "country"],
    newLabel: "New Port of Loading",
    searchPlaceholder: "Search ports...",
    fields: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "country", label: "Country" },
    ],
  },
  {
    key: "cfs",
    title: "Consolidation Locations",
    group: "Master Data",
    description: "Consolidation location master data.",
    columns: ["code", "name", "country"],
    newLabel: "New Consolidation Location",
    searchPlaceholder: "Search consolidation locations...",
    fields: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "country", label: "Country" },
    ],
  },
  {
    key: "freightContracts",
    title: "Freight Contracts",
    group: "Freight & Costs",
    description: "Contract rates, equipment, validity, and consumption control.",
    columns: ["contractNumber", "carrier", "modal", "pol", "pod", "equipment", "currency", "rate", "totalEquipment", "usedCount"],
    newLabel: "New Freight Contract",
    searchPlaceholder: "Search freight contracts...",
    modalSize: "medium",
    fields: [
      { key: "contractNumber", label: "Contract Number" },
      { key: "carrier", label: "Carrier / Provider" },
      { key: "modal", label: "Mode", type: "select", options: modals },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "pod", label: "POD", type: "select", options: ["All", ...routeOptions.filter(Boolean)] },
      { key: "equipment", label: "Equipment", type: "select", options: ["", ...containerTypes] },
      { key: "currency", label: "Currency", type: "select", options: currencies },
      { key: "rate", label: "Rate", type: "number" },
      { key: "validFrom", label: "Valid From", type: "date" },
      { key: "validTo", label: "Valid To", type: "date" },
      { key: "totalEquipment", label: "Total Equipment", type: "number" },
      { key: "usedCount", label: "Equipment Used", type: "number", readOnly: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "publicRates",
    title: "Reference Rates",
    group: "Freight & Costs",
    description: "Reference tariff baseline used for savings calculations.",
    columns: ["carrier", "modal", "containerType", "pol", "pod", "currency", "rate", "chargingBasis"],
    newLabel: "New Reference Rate",
    searchPlaceholder: "Search reference rates...",
    modalSize: "medium",
    fields: [
      { key: "agentId", label: "Carrier / Provider", type: "relation", relation: "agents", relationLabel: ["name"], relationValue: "id" },
      { key: "carrier", label: "Carrier / Provider Name" },
      { key: "modal", label: "Mode", type: "select", options: modals },
      { key: "containerType", label: "Equipment", type: "select", options: ["All Equipment", ...containerTypes] },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "pod", label: "POD", type: "select", options: ["All", ...routeOptions.filter(Boolean)] },
      { key: "currency", label: "Currency", type: "select", options: currencies },
      { key: "rate", label: "Rate", type: "number" },
      { key: "chargingBasis", label: "Charging Basis", type: "select", options: ["W/M", "CBM", "Container", "AWB"] },
      { key: "validFrom", label: "Valid From", type: "date" },
      { key: "validTo", label: "Valid To", type: "date" },
    ],
  },
  {
    key: "surcharges",
    title: "Surcharges",
    group: "Freight & Costs",
    description: "Surcharges with comparison flag for cost and savings logic.",
    columns: ["name", "modal", "currency", "amount", "chargingBasis", "comparable"],
    newLabel: "New Surcharge",
    searchPlaceholder: "Search surcharges...",
    modalSize: "medium",
    fields: [
      { key: "name", label: "Name" },
      { key: "agentId", label: "Carrier / Provider", type: "relation", relation: "agents", relationLabel: ["name"], relationValue: "id" },
      { key: "modal", label: "Mode", type: "select", options: modals },
      { key: "containerType", label: "Equipment", type: "select", options: ["", ...containerTypes] },
      { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
      { key: "pod", label: "POD", type: "select", options: ["", ...routeOptions.filter(Boolean)] },
      { key: "currency", label: "Currency", type: "select", options: currencies },
      { key: "amount", label: "Amount", type: "number" },
      { key: "chargingBasis", label: "Charging Basis", type: "select", options: ["", "Container", "Shipment", "BL", "W/M", "CBM", "Ton", "Percentage", "Minimum", "Manual"] },
      { key: "validFrom", label: "Valid From", type: "date" },
      { key: "validTo", label: "Valid To", type: "date" },
      { key: "comparable", label: "Include in reference cost comparison", type: "checkbox" },
    ],
  },
  {
    key: "exchangeRates",
    title: "Daily Exchange Rates",
    group: "Freight & Costs",
    description: "FX rates for multi-currency cost calculation.",
    columns: ["rateDate", "fromCurrency", "toCurrency", "rate"],
    newLabel: "New Daily Exchange Rate",
    searchPlaceholder: "Search daily exchange rates...",
    fields: [
      { key: "rateDate", label: "Rate Date", type: "date" },
      { key: "fromCurrency", label: "From Currency", type: "select", options: currencies },
      { key: "toCurrency", label: "To Currency", type: "select", options: currencies },
      { key: "rate", label: "Exchange Rate", type: "number" },
    ],
  },
  {
    key: "monthlyExchangeRates",
    title: "Monthly Modine Rates",
    group: "Freight & Costs",
    description: "Monthly exchange rates used by report month without replacing original values.",
    columns: ["month", "usdBrl", "eurBrl", "gbpBrl", "sekBrl"],
    newLabel: "New Monthly Rate",
    searchPlaceholder: "Search monthly rates...",
    fields: [
      { key: "month", label: "Month" },
      { key: "usdBrl", label: "USD to BRL", type: "number" },
      { key: "eurBrl", label: "EUR to BRL", type: "number" },
      { key: "gbpBrl", label: "GBP to BRL", type: "number" },
      { key: "sekBrl", label: "SEK to BRL", type: "number" },
    ],
  },
  {
    key: "freeTimeRules",
    title: "Free Time Rules",
    group: "Freight & Costs",
    description: "Configurable free time by equipment type.",
    columns: ["equipment", "freeTimeDays", "alertDaysBefore"],
    newLabel: "New Free Time Rule",
    searchPlaceholder: "Search free time rules...",
    fields: [
      { key: "equipment", label: "Equipment", type: "select", options: containerTypes },
      { key: "freeTimeDays", label: "Free Time Days", type: "number" },
      { key: "alertDaysBefore", label: "Alert Days Before", type: "number" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "supplierPartHistory",
    title: "Supplier Part History",
    group: "Documents & Cargo",
    description: "Confirmed historical values by supplier and part number from invoices and packing data.",
    columns: ["supplierId", "partNumberId", "sourceInvoice", "unitPrice", "currency", "sourceDate"],
    readOnly: true,
    searchPlaceholder: "Search supplier part history...",
  },
  {
    key: "timelineEvents",
    title: "Activity History",
    group: "Activity History",
    description: "Read-only audit history of operational changes.",
    columns: ["entity", "record", "fieldName", "previousValue", "newValue", "actorEmail", "createdAt", "notes"],
    readOnly: true,
    searchPlaceholder: "Search activity history...",
  },
  { key: "reports", title: "Reports", group: "Analytics", description: "Confirmed transit, probable transit, estimated transit, and savings reports." },
  { key: "insights", title: "Insights", group: "Analytics", description: "Executive overview, performance intelligence, supplier signals, and pipeline risk." },
  { key: "settings", title: "Settings", group: "Settings", description: "General preferences, appearance, and account configuration." },
];

const dashboardEntities: EntityKey[] = [
  "demands",
  "shipments",
  "containers",
  "suppliers",
  "partNumbers",
  "agents",
  "commercialInvoices",
  "shipmentCosts",
];
const shipmentChildEntities: EntityKey[] = [
  "shipmentDemands",
  "commercialInvoices",
  "invoiceItems",
  "packages",
  "containers",
  "shipmentCosts",
  "shipmentDocuments",
  "timelineEvents",
];
const alwaysReferenceEntities: EntityKey[] = [
  "suppliers",
  "partNumbers",
  "requesters",
  "agents",
  "pol",
  "cfs",
  "demands",
  "freightContracts",
  "commercialInvoices",
  "shipments",
];

export function ImportIntelligenceApp({
  user,
  signOutPath,
}: {
  user: { displayName: string; email: string };
  signOutPath: string;
}) {
  const [activeKey, setActiveKey] = useState<ModuleConfig["key"]>("dashboard");
  const [rowsByEntity, setRowsByEntity] = useState<RowsByEntity>({});
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [appearance, setAppearance] = useState(() => {
    if (typeof window === "undefined") return "SYSTEM";
    return window.localStorage.getItem("import-ops-appearance") ?? "SYSTEM";
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const active = modules.find((module) => module.key === activeKey) ?? modules[0];
  const entityKey = active.fields ? (active.key as EntityKey) : null;
  const rows = entityKey ? rowsByEntity[entityKey] ?? [] : [];
  const filteredRows = rows.filter((row) => searchableText(row, active, rowsByEntity).includes(query.toLowerCase()));
  const alerts = buildOperationalAlerts(rowsByEntity.demands ?? [], rowsByEntity.shipments ?? [], rowsByEntity.containers ?? []);

  const groupedModules = useMemo(() => {
    return modules
      .filter((module) => !module.hiddenFromMenu)
      .reduce<Record<string, ModuleConfig[]>>((groups, module) => {
        groups[module.group] = [...(groups[module.group] ?? []), module];
        return groups;
      }, {});
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = appearance.toLowerCase();
    window.localStorage.setItem("import-ops-appearance", appearance);
  }, [appearance]);

  useEffect(() => {
    const references = new Set<EntityKey>([...dashboardEntities, ...alwaysReferenceEntities]);
    if (entityKey) references.add(entityKey);
    active.fields?.forEach((field) => {
      if (field.relation) references.add(field.relation);
    });
    let cancelled = false;
    Array.from(references).forEach((entity) => {
      fetchRows(entity)
        .then((loadedRows) => {
          if (!cancelled) setRowsByEntity((current) => ({ ...current, [entity]: loadedRows }));
        })
        .catch(() => {
          if (!cancelled) setMessage("Unable to load operational data. Check the connection and try again.");
        });
    });
    return () => {
      cancelled = true;
    };
  }, [active.fields, entityKey]);

  function changeModule(key: ModuleConfig["key"]) {
    setActiveKey(key);
    setQuery("");
    setMessage("");
    setModal(null);
  }

  async function refreshEntity(entity: EntityKey) {
    const loadedRows = await fetchRows(entity);
    setRowsByEntity((current) => ({ ...current, [entity]: loadedRows }));
  }

  async function deleteRecord(module: ModuleConfig, row: Row) {
    if (module.readOnly || !row.id) return;
    const label = displayRecord(row, module.key as EntityKey, rowsByEntity);
    if (!window.confirm(`Delete ${label}? This action cannot be undone.`)) return;
    const response = await fetch(`/api/records/${module.key}?id=${row.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setMessage(String(data.error ?? `Unable to delete ${module.title.toLowerCase()}.`));
      return;
    }
    await refreshEntity(module.key as EntityKey);
    setMessage(`${singular(module.title)} removed successfully.`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-brand">
          <div className="brand-mark">IO</div>
          <div>
            <strong>Import Operations</strong>
            <span>Control workspace</span>
          </div>
        </div>
        <nav>
          {Object.entries(groupedModules).map(([group, items]) => (
            <section key={group} className="nav-group">
              <p>{group}</p>
              {items.map((item) => (
                <button key={item.key} className={activeKey === item.key ? "active" : ""} onClick={() => changeModule(item.key)}>
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
            <p className="breadcrumb">{active.group}</p>
            <h1>{active.title}</h1>
          </div>
          <label className="global-search">
            <span>Search</span>
            <input value={query} placeholder={active.searchPlaceholder ?? "Search this page..."} onChange={(event) => setQuery(event.target.value)} />
          </label>
          {alerts.length ? <button className="notification-button" aria-label={`${alerts.length} active alerts`}>{alerts.length}</button> : null}
          <div className="user-menu">
            <button onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
              {user.displayName}
            </button>
            {menuOpen ? (
              <div className="user-popover">
                <strong>User Menu</strong>
                <span>{user.email}</span>
                <label>
                  Appearance
                  <select value={appearance} onChange={(event) => setAppearance(event.target.value)}>
                    <option value="LIGHT">Light</option>
                    <option value="DARK">Dark</option>
                    <option value="SYSTEM">System Default</option>
                  </select>
                </label>
                <a href={signOutPath}>Sign out</a>
              </div>
            ) : null}
          </div>
        </header>

        <section className="workspace">
          {message ? <p className="status-message">{message}</p> : null}
          <div className="page-intro">
            <div>
              <h2>{active.title}</h2>
              <p>{active.description}</p>
            </div>
            {entityKey && !active.readOnly ? (
              <button onClick={() => setModal({ module: active, row: null })}>{active.newLabel ?? `New ${singular(active.title)}`}</button>
            ) : null}
          </div>

          {active.key === "dashboard" ? <Dashboard rowsByEntity={rowsByEntity} /> : null}
          {active.key === "supplierFollowUp" ? <SupplierFollowUp rowsByEntity={rowsByEntity} /> : null}
          {active.key === "reports" ? <Reports rowsByEntity={rowsByEntity} /> : null}
          {active.key === "insights" ? <Insights rowsByEntity={rowsByEntity} /> : null}
          {active.key === "settings" ? <Settings appearance={appearance} onAppearanceChange={setAppearance} /> : null}

          {entityKey ? (
            <>
              {active.key === "shipments" ? <ShipmentFilters /> : null}
              <RecordTable
                module={active}
                rows={filteredRows}
                rowsByEntity={rowsByEntity}
                onOpen={(row) => setModal({ module: active, row })}
                onDelete={(row) => deleteRecord(active, row)}
              />
              <p className="pagination">Page 1 / {Math.max(1, Math.ceil(filteredRows.length / 200))}</p>
            </>
          ) : null}
        </section>
      </section>

      {modal?.module.key === "shipments" ? (
        <ShipmentDossierModal
          row={modal.row}
          rowsByEntity={rowsByEntity}
          setRowsByEntity={setRowsByEntity}
          onClose={() => setModal(null)}
          onMessage={setMessage}
        />
      ) : modal ? (
        <RecordModal
          module={modal.module}
          row={modal.row}
          rowsByEntity={rowsByEntity}
          onClose={() => setModal(null)}
          onSaved={async (savedModule, savedRow, created) => {
            await refreshEntity(savedModule.key as EntityKey);
            setMessage(`${singular(savedModule.title)} ${created ? "created" : "updated"} successfully.`);
            setModal(null);
            if (savedRow && savedModule.key === activeKey) {
              setRowsByEntity((current) => ({ ...current, [savedModule.key]: updateRows(current[savedModule.key] ?? [], savedRow) }));
            }
          }}
        />
      ) : null}
    </main>
  );
}

function RecordTable({
  module,
  rows,
  rowsByEntity,
  onOpen,
  onDelete,
}: {
  module: ModuleConfig;
  rows: Row[];
  rowsByEntity: RowsByEntity;
  onOpen: (row: Row) => void;
  onDelete: (row: Row) => void;
}) {
  const columns = module.columns ?? [];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{columnLabel(column)}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={String(row.id)} onDoubleClick={() => onOpen(row)}>
                {columns.map((column) => (
                  <td key={column}>{renderCell(row, column, module.key as EntityKey, rowsByEntity)}</td>
                ))}
                <td className="row-actions">
                  <button onClick={() => onOpen(row)}>{module.readOnly ? "View" : "Open"}</button>
                  {!module.readOnly ? <button onClick={() => onDelete(row)}>Delete</button> : null}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + 1}>
                <div className="empty-state">
                  <strong>{module.title}</strong>
                  <span>{emptyText(module.title)}</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecordModal({
  module,
  row,
  rowsByEntity,
  onClose,
  onSaved,
}: {
  module: ModuleConfig;
  row: Row | null;
  rowsByEntity: RowsByEntity;
  onClose: () => void;
  onSaved: (module: ModuleConfig, row: Row | null, created: boolean) => void;
}) {
  const [draft, setDraft] = useState<Row>(row ? { ...row } : {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const firstInput = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    firstInput.current?.focus();
  }, []);

  function requestClose() {
    if (dirty && !window.confirm(`You have unsaved changes. Discard them and close this ${singular(module.title).toLowerCase()}?`)) return;
    onClose();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const created = !row?.id;
    const response = await fetch(`/api/records/${module.key}`, {
      method: created ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draft, ...(created ? {} : { id: row.id }) }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(String(data.error ?? `Unable to save ${module.title.toLowerCase()}. Review the highlighted fields and try again.`));
      return;
    }
    setDirty(false);
    onSaved(module, data.row ?? null, created);
  }

  return (
    <ModalShell
      title={row ? `Edit ${displayRecord(row, module.key as EntityKey, rowsByEntity)}` : module.newLabel ?? `New ${singular(module.title)}`}
      size={module.modalSize ?? "simple"}
      dirty={dirty}
      onClose={requestClose}
    >
      <form onSubmit={save}>
        {error ? <p className="status-message danger">{error}</p> : null}
        <div className="modal-grid">
          {module.fields?.map((field, index) => (
            <FieldControl
              key={field.key}
              field={field}
              value={draft[field.key]}
              draft={draft}
              referenceRows={field.relation ? rowsByEntity[field.relation] ?? [] : []}
              inputRef={index === 0 ? firstInput : undefined}
              onChange={(value) => {
                setDirty(true);
                setDraft((current) => withFieldSideEffects({ ...current, [field.key]: value }, field, rowsByEntity));
              }}
            />
          ))}
        </div>
        <div className="modal-footer">
          <button type="button" onClick={requestClose}>Cancel</button>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : row ? "Save Changes" : `Create ${singular(module.title)}`}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function ShipmentDossierModal({
  row,
  rowsByEntity,
  setRowsByEntity,
  onClose,
  onMessage,
}: {
  row: Row | null;
  rowsByEntity: RowsByEntity;
  setRowsByEntity: (updater: (current: RowsByEntity) => RowsByEntity) => void;
  onClose: () => void;
  onMessage: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Row>(row ? { ...row } : { modal: "LCL", tariffType: "Not Applicable", clearanceType: "Formal Clearance" });
  const [shipmentId, setShipmentId] = useState<number | null>(row?.id ? Number(row.id) : null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [childDrafts, setChildDrafts] = useState<Record<string, Row>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState(row?.updatedAt ? String(row.updatedAt) : "");

  useEffect(() => {
    let cancelled = false;
    [...shipmentChildEntities, ...alwaysReferenceEntities].forEach((entity) => {
      fetchRows(entity)
        .then((loadedRows) => {
          if (!cancelled) setRowsByEntity((current) => ({ ...current, [entity]: loadedRows }));
        })
        .catch(() => {
          if (!cancelled) setError("Unable to load the shipment dossier. Keep the window open and try again.");
        });
    });
    return () => {
      cancelled = true;
    };
  }, [setRowsByEntity]);

  const contextRows = rowsByEntity;
  const children = useMemo(() => getShipmentChildren(shipmentId, contextRows), [shipmentId, contextRows]);
  const summary = shipmentSummary(draft, children);
  const tabs = [
    ["Overview", 0],
    ["Route & Dates", 0],
    ["Demands", children.shipmentDemands.length],
    ["Invoices & Items", children.commercialInvoices.length + children.invoiceItems.length],
    ["Packing", children.packages.length],
    ["Containers", children.containers.length],
    ["Costs", children.shipmentCosts.length],
    ["Documents", children.shipmentDocuments.length],
    ["History", children.timelineEvents.length],
  ];

  function patchDraft(next: Row) {
    if (String(draft.modal ?? "") === "FCL" && String(next.modal ?? "") !== "FCL" && children.containers.length) {
      window.alert("This shipment has containers. They will remain saved; review the Containers tab because they are not applicable to AIR or LCL modes.");
    }
    setDirty(true);
    setDraft(next);
  }

  function requestClose() {
    if (dirty && !window.confirm("You have unsaved changes. Discard them and close this shipment?")) return;
    onClose();
  }

  async function saveShipment(closeAfterSave: boolean, keepOpenAfterCreate = false) {
    setSaving(true);
    setError("");
    const created = !shipmentId;
    const payload = { ...draft, id: shipmentId ?? undefined };
    const response = await fetch("/api/records/shipments", {
      method: created ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(String(data.error ?? "Unable to save the shipment. Review the highlighted fields and try again."));
      return;
    }
    const saved = data.row as Row;
    setShipmentId(Number(saved.id));
    setDraft(saved);
    setDirty(false);
    setLastSaved(new Date().toLocaleString());
    setRowsByEntity((current) => ({ ...current, shipments: updateRows(current.shipments ?? [], saved) }));
    onMessage(created ? "Shipment created successfully. You can now complete the remaining sections." : "Shipment updated successfully.");
    if (closeAfterSave && !keepOpenAfterCreate) onClose();
  }

  async function saveChild(entity: EntityKey, extra: Row = {}) {
    if (!shipmentId) {
      setError("Create the shipment first, then complete the remaining sections.");
      return;
    }
    const draftKey = childKey(entity, extra.invoiceId);
    const currentDraft = childDrafts[draftKey] ?? {};
    const payload: Row = { ...currentDraft, ...extra, shipmentId };
    if (entity === "invoiceItems") {
      const part = findById(contextRows.partNumbers ?? [], payload.partNumberId);
      if (!part) {
        setError("Part Number not found. Add it to Master Data before using it in a shipment.");
        return;
      }
      payload.description = String(part.description ?? "");
      payload.ncm = String(part.ncm ?? "");
      payload.unitOfMeasure = String(part.unitOfMeasure ?? "");
      payload.totalAmount = Number(payload.quantity ?? 0) * Number(payload.unitPrice ?? 0);
      payload.supplierId = payload.supplierId || draft.supplierId || part.supplierId || "";
    }
    const response = await fetch(`/api/records/${entity}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(String(data.error ?? `${moduleTitle(entity)} could not be saved. Your changes remain available for another attempt.`));
      return;
    }
    setChildDrafts((current) => ({ ...current, [draftKey]: {} }));
    setRowsByEntity((current) => ({ ...current, [entity]: [data.row, ...(current[entity] ?? [])] }));
    onMessage(`${singular(moduleTitle(entity))} added successfully.`);
  }

  async function removeChild(entity: EntityKey, item: Row) {
    if (!item.id) return;
    if (!window.confirm(`Remove ${displayRecord(item, entity, contextRows)}?`)) return;
    const response = await fetch(`/api/records/${entity}?id=${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setError(String(data.error ?? `Unable to remove ${moduleTitle(entity).toLowerCase()}.`));
      return;
    }
    setRowsByEntity((current) => ({ ...current, [entity]: (current[entity] ?? []).filter((rowItem) => rowItem.id !== item.id) }));
    onMessage(`${singular(moduleTitle(entity))} removed successfully.`);
  }

  return (
    <ModalShell
      title={shipmentId ? `${String(draft.shipmentNumber ?? draft.reference ?? "Shipment")}` : "New Shipment"}
      subtitle={`${formatCell(resolveShipmentStatus(draft))} · ${displayRelation("suppliers", draft.supplierId, contextRows) || "Supplier pending"} · ${formatCell(draft.modal)}`}
      size="shipment"
      dirty={dirty}
      onClose={requestClose}
    >
      <div className="shipment-toolbar">
        <div className="shipment-status-row">
          {dirty ? <span className="status-chip warning">Unsaved changes</span> : null}
          {lastSaved ? <span className="status-chip">Last saved {lastSaved}</span> : null}
        </div>
        <div className="shipment-actions">
          {!shipmentId ? <button onClick={() => saveShipment(false, true)} disabled={saving}>Create and Continue</button> : null}
          {shipmentId ? <button onClick={() => saveShipment(false)} disabled={saving}>Save Changes</button> : null}
          <button onClick={() => saveShipment(true)} disabled={saving}>Save and Close</button>
        </div>
      </div>
      {error ? <p className="status-message danger">{error}</p> : null}
      <div className="summary-grid">
        {summary.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="modal-tabs" role="tablist">
        {tabs.map(([tab, count]) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(String(tab))}>
            {tab}{Number(count) ? <span>{count}</span> : null}
          </button>
        ))}
      </div>
      <div className="shipment-tab-body">
        {activeTab === "Overview" ? (
          <ShipmentFieldGrid
            fields={shipmentOverviewFields}
            draft={draft}
            rowsByEntity={contextRows}
            onChange={(field, value) => patchDraft(withFieldSideEffects({ ...draft, [field.key]: value }, field, contextRows))}
          />
        ) : null}
        {activeTab === "Route & Dates" ? (
          <ShipmentFieldGrid
            fields={shipmentRouteFields}
            draft={draft}
            rowsByEntity={contextRows}
            onChange={(field, value) => patchDraft({ ...draft, [field.key]: value })}
          />
        ) : null}
        {activeTab === "Demands" ? (
          <ChildSection
            entity="shipmentDemands"
            disabled={!shipmentId}
            rows={children.shipmentDemands}
            rowsByEntity={contextRows}
            draft={childDrafts[childKey("shipmentDemands")] ?? {}}
            setDraft={(next) => setChildDrafts((current) => ({ ...current, [childKey("shipmentDemands")]: next }))}
            onSave={() => saveChild("shipmentDemands")}
            onDelete={(item) => removeChild("shipmentDemands", item)}
            actionLabel="Add Demand"
          />
        ) : null}
        {activeTab === "Invoices & Items" ? (
          <InvoicesSection
            disabled={!shipmentId}
            invoices={children.commercialInvoices}
            items={children.invoiceItems}
            rowsByEntity={contextRows}
            invoiceDraft={childDrafts[childKey("commercialInvoices")] ?? { supplierId: draft.supplierId || "" }}
            setInvoiceDraft={(next) => setChildDrafts((current) => ({ ...current, [childKey("commercialInvoices")]: next }))}
            itemDrafts={childDrafts}
            setItemDraft={(key, next) => setChildDrafts((current) => ({ ...current, [key]: next }))}
            onAddInvoice={() => saveChild("commercialInvoices", { supplierId: draft.supplierId || childDrafts[childKey("commercialInvoices")]?.supplierId || "" })}
            onAddItem={(invoiceId) => saveChild("invoiceItems", { invoiceId, supplierId: draft.supplierId || "" })}
            onDeleteInvoice={(item) => removeChild("commercialInvoices", item)}
            onDeleteItem={(item) => removeChild("invoiceItems", item)}
          />
        ) : null}
        {activeTab === "Packing" ? (
          <ChildSection entity="packages" disabled={!shipmentId} rows={children.packages} rowsByEntity={contextRows} draft={childDrafts[childKey("packages")] ?? { dimensionUnit: "CM" }} setDraft={(next) => setChildDrafts((current) => ({ ...current, [childKey("packages")]: next }))} onSave={() => saveChild("packages")} onDelete={(item) => removeChild("packages", item)} actionLabel="Add Packing Line" />
        ) : null}
        {activeTab === "Containers" ? (
          String(draft.modal ?? "") === "FCL" ? (
            <ChildSection entity="containers" disabled={!shipmentId} rows={children.containers} rowsByEntity={contextRows} draft={childDrafts[childKey("containers")] ?? {}} setDraft={(next) => setChildDrafts((current) => ({ ...current, [childKey("containers")]: next }))} onSave={() => saveChild("containers")} onDelete={(item) => removeChild("containers", item)} actionLabel="Add Container" />
          ) : (
            <div className="empty-state compact"><strong>Containers</strong><span>Not applicable to this shipment mode</span></div>
          )
        ) : null}
        {activeTab === "Costs" ? (
          <ChildSection entity="shipmentCosts" disabled={!shipmentId} rows={children.shipmentCosts} rowsByEntity={contextRows} draft={childDrafts[childKey("shipmentCosts")] ?? { costType: "Estimated Cost" }} setDraft={(next) => setChildDrafts((current) => ({ ...current, [childKey("shipmentCosts")]: next }))} onSave={() => saveChild("shipmentCosts")} onDelete={(item) => removeChild("shipmentCosts", item)} actionLabel="Add Cost" />
        ) : null}
        {activeTab === "Documents" ? (
          <ChildSection entity="shipmentDocuments" disabled={!shipmentId} rows={children.shipmentDocuments} rowsByEntity={contextRows} draft={childDrafts[childKey("shipmentDocuments")] ?? { documentType: "Commercial Invoice" }} setDraft={(next) => setChildDrafts((current) => ({ ...current, [childKey("shipmentDocuments")]: next }))} onSave={() => saveChild("shipmentDocuments")} onDelete={(item) => removeChild("shipmentDocuments", item)} actionLabel="Add Document" />
        ) : null}
        {activeTab === "History" ? <HistoryTable rows={children.timelineEvents} rowsByEntity={contextRows} /> : null}
      </div>
    </ModalShell>
  );
}

const shipmentOverviewFields: Field[] = [
  { key: "shipmentNumber", label: "Shipment Number" },
  { key: "reference", label: "Reference" },
  { key: "supplierId", label: "Supplier", type: "relation", relation: "suppliers", relationLabel: ["name", "country"], relationValue: "id" },
  { key: "agentId", label: "Freight Forwarder", type: "relation", relation: "agents", relationLabel: ["name", "paymentTerms"], relationValue: "id" },
  { key: "modal", label: "Mode", type: "select", options: modals },
  { key: "shipmentType", label: "Shipment Type", type: "select", options: materialTypes },
  { key: "incoterm", label: "Incoterm", type: "select", options: ["", ...incoterms] },
  { key: "clearanceType", label: "Customs Clearance", type: "select", options: ["", ...clearanceTypes] },
  { key: "tariffType", label: "Rate Type", type: "select", options: ["", ...tariffTypes] },
  { key: "contractId", label: "Freight Contract", type: "relation", relation: "freightContracts", relationLabel: ["contractNumber", "carrier"], relationValue: "id" },
  { key: "deadline", label: "Required at Modine", type: "date" },
  { key: "costCurrency", label: "Currency", type: "select", options: ["", ...currencies] },
  { key: "hblAwb", label: "HBL/AWB" },
  { key: "hblAwbDate", label: "HBL/AWB Date", type: "date" },
  { key: "status", label: "Status", readOnly: true },
  { key: "notes", label: "Notes", type: "textarea" },
];

const shipmentRouteFields: Field[] = [
  { key: "cfs", label: "CFS", type: "lookup", relation: "cfs", relationLabel: ["code", "name"], relationValue: "code" },
  { key: "pol", label: "POL", type: "lookup", relation: "pol", relationLabel: ["code", "name"], relationValue: "code" },
  { key: "pod", label: "POD / Airport", type: "select", options: routeOptions },
  { key: "bookingNumber", label: "Booking Number" },
  { key: "vessel", label: "Vessel" },
  { key: "quotationDate", label: "Quotation Date", type: "date" },
  { key: "greenLightDate", label: "Green Light Date", type: "date" },
  { key: "cargoReadyDate", label: "Cargo Ready Date", type: "date" },
  { key: "pickupScheduledDate", label: "Pickup Scheduled Date", type: "date" },
  { key: "pickupConfirmedDate", label: "Pickup Confirmed Date", type: "date" },
  { key: "bookingConfirmedDate", label: "Booking Confirmed Date", type: "date" },
  { key: "etd", label: "ETD", type: "date" },
  { key: "atd", label: "ATD", type: "date" },
  { key: "initialEta", label: "Initial ETA", type: "date" },
  { key: "eta", label: "Current ETA", type: "date" },
  { key: "ata", label: "ATA", type: "date" },
  { key: "pcd", label: "PCD", type: "date" },
  { key: "pcdIsSet", label: "This ETD is PCD", type: "checkbox" },
  { key: "deliveryDate", label: "Delivery Date", type: "date" },
  { key: "stockEntryDate", label: "Stock Entry Date", type: "date" },
  { key: "operationalDeviation", label: "Exclude Exceptional Event", type: "checkbox" },
];

function ShipmentFieldGrid({
  fields,
  draft,
  rowsByEntity,
  onChange,
}: {
  fields: Field[];
  draft: Row;
  rowsByEntity: RowsByEntity;
  onChange: (field: Field, value: string | number | boolean) => void;
}) {
  return (
    <div className="modal-grid">
      {fields.map((field) => (
        <FieldControl key={field.key} field={field} value={field.key === "status" ? resolveShipmentStatus(draft) : draft[field.key]} draft={draft} referenceRows={field.relation ? rowsByEntity[field.relation] ?? [] : []} onChange={(value) => onChange(field, value)} />
      ))}
    </div>
  );
}

function ChildSection({
  entity,
  rows,
  rowsByEntity,
  draft,
  setDraft,
  onSave,
  onDelete,
  actionLabel,
  disabled,
}: {
  entity: EntityKey;
  rows: Row[];
  rowsByEntity: RowsByEntity;
  draft: Row;
  setDraft: (row: Row) => void;
  onSave: () => void;
  onDelete: (row: Row) => void;
  actionLabel: string;
  disabled?: boolean;
}) {
  const config = moduleByKey(entity);
  return (
    <section className="child-section">
      {disabled ? <p className="status-message">Create the shipment first, then complete this section.</p> : null}
      <InlineForm config={config} draft={draft} rowsByEntity={rowsByEntity} disabled={disabled} onChange={setDraft} onSave={onSave} actionLabel={actionLabel} />
      <RecordTable module={{ ...config, readOnly: false }} rows={rows} rowsByEntity={rowsByEntity} onOpen={() => undefined} onDelete={onDelete} />
    </section>
  );
}

function InvoicesSection({
  disabled,
  invoices,
  items,
  rowsByEntity,
  invoiceDraft,
  setInvoiceDraft,
  itemDrafts,
  setItemDraft,
  onAddInvoice,
  onAddItem,
  onDeleteInvoice,
  onDeleteItem,
}: {
  disabled?: boolean;
  invoices: Row[];
  items: Row[];
  rowsByEntity: RowsByEntity;
  invoiceDraft: Row;
  setInvoiceDraft: (row: Row) => void;
  itemDrafts: Record<string, Row>;
  setItemDraft: (key: string, row: Row) => void;
  onAddInvoice: () => void;
  onAddItem: (invoiceId: number) => void;
  onDeleteInvoice: (row: Row) => void;
  onDeleteItem: (row: Row) => void;
}) {
  const invoiceTotals = invoices.reduce<Record<string, number>>((totals, invoice) => {
    const currency = String(invoice.currency || "USD");
    totals[currency] = (totals[currency] ?? 0) + Number(invoice.amount ?? 0);
    return totals;
  }, {});
  return (
    <section className="child-section">
      <div className="section-summary">
        <span>{pluralize(invoices.length, "invoice")}</span>
        <span>{pluralize(items.length, "item")}</span>
        <span>{Object.entries(invoiceTotals).map(([currency, value]) => `${currency} ${formatNumber(value)}`).join(" · ") || "0"}</span>
      </div>
      {disabled ? <p className="status-message">Create the shipment first, then complete invoices and items.</p> : null}
      <InlineForm config={moduleByKey("commercialInvoices")} draft={invoiceDraft} rowsByEntity={rowsByEntity} disabled={disabled} onChange={setInvoiceDraft} onSave={onAddInvoice} actionLabel="Add Invoice" />
      <div className="invoice-stack">
        {invoices.length ? invoices.map((invoice) => {
          const key = childKey("invoiceItems", invoice.id);
          const linkedItems = items.filter((item) => String(item.invoiceId) === String(invoice.id));
          return (
            <details key={String(invoice.id)} className="invoice-card" open>
              <summary>
                <strong>{String(invoice.invoiceNumber || "Invoice")}</strong>
                <span>{formatCell(invoice.currency)} {formatNumber(Number(invoice.amount ?? 0))}</span>
                <button onClick={(event) => { event.preventDefault(); onDeleteInvoice(invoice); }}>Delete</button>
              </summary>
              <InlineForm config={moduleByKey("invoiceItems")} draft={itemDrafts[key] ?? { currency: invoice.currency || "USD" }} rowsByEntity={rowsByEntity} disabled={disabled} onChange={(next) => setItemDraft(key, next)} onSave={() => onAddItem(Number(invoice.id))} actionLabel="Add Item" />
              <RecordTable module={moduleByKey("invoiceItems")} rows={linkedItems} rowsByEntity={rowsByEntity} onOpen={() => undefined} onDelete={onDeleteItem} />
            </details>
          );
        }) : <div className="empty-state compact"><strong>Invoices & Items</strong><span>Add the first invoice for this shipment.</span></div>}
      </div>
    </section>
  );
}

function InlineForm({
  config,
  draft,
  rowsByEntity,
  disabled,
  onChange,
  onSave,
  actionLabel,
}: {
  config: ModuleConfig;
  draft: Row;
  rowsByEntity: RowsByEntity;
  disabled?: boolean;
  onChange: (row: Row) => void;
  onSave: () => void;
  actionLabel: string;
}) {
  return (
    <div className="inline-editor">
      <div className="modal-grid compact-grid">
        {config.fields?.map((field) => (
          <FieldControl key={field.key} field={field} value={draft[field.key]} draft={draft} referenceRows={field.relation ? rowsByEntity[field.relation] ?? [] : []} onChange={(value) => onChange(withFieldSideEffects({ ...draft, [field.key]: value }, field, rowsByEntity))} />
        ))}
      </div>
      <div className="inline-actions">
        <button onClick={onSave} disabled={disabled}>{actionLabel}</button>
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  draft,
  referenceRows,
  onChange,
  inputRef,
}: {
  field: Field;
  value: Row[string];
  draft: Row;
  referenceRows: Row[];
  onChange: (value: string | number | boolean) => void;
  inputRef?: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>;
}) {
  const options = field.type === "relation" || field.type === "lookup" ? filterReferenceRows(field, referenceRows, draft) : [];
  const selected = findSelectedReference(field, options, value);
  const [searchValue, setSearchValue] = useState(() => (selected ? referenceLabel(field, selected) : String(value ?? "")));

  if (field.type === "relation" || field.type === "lookup") {
    const listId = `${field.key}-${field.relation}-options`;
    return (
      <label className="field">
        {field.label}
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          list={listId}
          value={searchValue}
          placeholder={options.length ? `Search ${field.label.toLowerCase()}...` : `${field.label} unavailable`}
          readOnly={field.readOnly}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSearchValue(nextValue);
            if (!nextValue) {
              onChange("");
              return;
            }
            const nextSelected = options.find((row) => referenceLabel(field, row) === nextValue);
            if (nextSelected) {
              const rawValue = nextSelected[field.relationValue ?? "id"];
              onChange(field.type === "relation" ? Number(rawValue) : String(rawValue ?? ""));
            }
          }}
        />
        <datalist id={listId}>
          {options.map((row) => (
            <option key={String(row.id ?? referenceLabel(field, row))} value={referenceLabel(field, row)} />
          ))}
        </datalist>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="field field-wide">
        {field.label}
        <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={String(value ?? "")} readOnly={field.readOnly} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="field">
        {field.label}
        <select ref={inputRef as React.RefObject<HTMLSelectElement>} value={String(value ?? "")} disabled={field.readOnly} onChange={(event) => onChange(event.target.value)}>
          {field.options?.map((option) => (
            <option key={option} value={option}>{option || "Choose an option"}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="field checkbox-field">
        <input type="checkbox" checked={Boolean(value)} disabled={field.readOnly} onChange={(event) => onChange(event.target.checked)} />
        {field.label}
      </label>
    );
  }

  return (
    <label className="field">
      {field.label}
      <input ref={inputRef as React.RefObject<HTMLInputElement>} type={field.type ?? "text"} value={String(value ?? "")} readOnly={field.readOnly} onChange={(event) => onChange(field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)} />
    </label>
  );
}

function ModalShell({
  title,
  subtitle,
  size,
  dirty,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  size: "simple" | "medium" | "shipment";
  dirty: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation">
      <div className={`record-modal ${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="modal-header-actions">
            {dirty ? <span className="status-chip warning">Unsaved</span> : null}
            <button onClick={onClose} aria-label="Close">Close</button>
          </div>
        </header>
        <div className="modal-scroll">{children}</div>
      </div>
    </div>
  );
}

function Dashboard({ rowsByEntity }: { rowsByEntity: RowsByEntity }) {
  const demands = rowsByEntity.demands ?? [];
  const shipments = rowsByEntity.shipments ?? [];
  const containers = rowsByEntity.containers ?? [];
  const alerts = buildOperationalAlerts(demands, shipments, containers);
  const stats = [
    ["Open Demands", demands.filter((demand) => demand.status === "Open" || demand.status === "Partially Fulfilled").length],
    ["Active Shipments", shipments.filter((shipment) => shipment.status !== "Delivered").length],
    ["Confirmed Arrivals", shipments.filter((shipment) => shipment.status === "Confirmed Arrival").length],
    ["Delivered", shipments.filter((shipment) => shipment.status === "Delivered").length],
    ["Free Time Alerts", alerts.filter((alert) => alert.kind === "Free Time").length],
    ["Savings", shipments.reduce((total, shipment) => total + Number(shipment.savingAmount ?? 0), 0)],
  ];
  return (
    <>
      <div className="dashboard-grid">
        {stats.map(([stat, value]) => (
          <article key={stat} className="metric">
            <span>{stat}</span>
            <strong>{String(value)}</strong>
          </article>
        ))}
      </div>
      <AlertList alerts={alerts.slice(0, 8)} />
    </>
  );
}

function SupplierFollowUp({ rowsByEntity }: { rowsByEntity: RowsByEntity }) {
  const suppliers = new Map((rowsByEntity.suppliers ?? []).map((supplier) => [String(supplier.id), supplier]));
  const alerts = buildDemandAlerts(rowsByEntity.demands ?? []).sort((left, right) => left.rank - right.rank);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Priority</th><th>Demand</th><th>Supplier</th><th>Readiness Date</th><th>Status</th><th>Outstanding Quantity</th></tr>
        </thead>
        <tbody>
          {alerts.length ? alerts.map((alert) => (
            <tr key={`${alert.label}-${alert.id}`}><td>{alert.label}</td><td>{alert.reference}</td><td>{suppliers.get(String(alert.supplierId))?.name ?? "-"}</td><td>{friendlyDate(alert.date)}</td><td>{alert.status}</td><td>{alert.balance}</td></tr>
          )) : (
            <tr><td colSpan={6}><div className="empty-state compact"><strong>Supplier Follow-up</strong><span>No active supplier follow-up alerts.</span></div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Reports({ rowsByEntity }: { rowsByEntity: RowsByEntity }) {
  const hasData = Boolean((rowsByEntity.shipments ?? []).length || (rowsByEntity.demands ?? []).length);
  return (
    <div className="report-grid">
      {[
        ["Confirmed Transit", "/api/records/shipments?export=confirmed"],
        ["Probable Transit", "/api/records/shipments?export=probable"],
        ["Estimated Transit", "/api/records/demands?export=estimated"],
        ["Savings", ""],
      ].map(([report, exportPath]) => (
        <article key={report}>
          <h3>{report}</h3>
          <p>{hasData ? "Uses filtered operational records from the current database." : "Performance indicators will appear after shipments are delivered."}</p>
          {exportPath ? <a className="export-link" href={exportPath}>Export to Excel</a> : null}
        </article>
      ))}
    </div>
  );
}

function Insights({ rowsByEntity }: { rowsByEntity: RowsByEntity }) {
  const alerts = buildOperationalAlerts(rowsByEntity.demands ?? [], rowsByEntity.shipments ?? [], rowsByEntity.containers ?? []);
  const suppliers = (rowsByEntity.suppliers ?? []).length;
  const shipments = (rowsByEntity.shipments ?? []).length;
  const savings = (rowsByEntity.shipments ?? []).reduce((total, shipment) => total + Number(shipment.savingAmount ?? 0), 0);
  const demands = (rowsByEntity.demands ?? []).length;
  return (
    <div className="report-grid">
      {[
        ["Executive Overview", alerts.length ? pluralize(alerts.length, "active alert") : "No active operational alerts"],
        ["Operational Performance", shipments ? pluralize(shipments, "shipment") : "Performance indicators will appear after shipments are delivered."],
        ["Suppliers and Freight Forwarders", pluralize(suppliers, "supplier registered")],
        ["Freight and Costs", savings ? `${formatNumber(savings)} saved by current shipment data` : "No savings recorded yet"],
        ["Demand Pipeline", demands ? pluralize(demands, "demand") : "No demands recorded yet"],
      ].map(([report, text]) => (
        <article key={report}><h3>{report}</h3><p>{text}</p></article>
      ))}
    </div>
  );
}

function Settings({ appearance, onAppearanceChange }: { appearance: string; onAppearanceChange: (value: string) => void }) {
  return (
    <section className="settings-panel">
      <h3>General</h3>
      <label className="field">Appearance
        <select value={appearance} onChange={(event) => onAppearanceChange(event.target.value)}>
          <option value="LIGHT">Light</option>
          <option value="DARK">Dark</option>
          <option value="SYSTEM">System Default</option>
        </select>
      </label>
      <p>Your appearance preference is saved on this device.</p>
    </section>
  );
}

function ShipmentFilters() {
  return (
    <div className="filter-bar" aria-label="Shipment filters">
      <select aria-label="Status filter"><option>Status</option></select>
      <select aria-label="Mode filter"><option>Mode</option></select>
      <select aria-label="Supplier filter"><option>Supplier</option></select>
      <select aria-label="Freight forwarder filter"><option>Freight Forwarder</option></select>
      <input aria-label="ETD from" type="date" />
      <input aria-label="ETA to" type="date" />
      <label className="inline-check"><input type="checkbox" /> With alerts</label>
    </div>
  );
}

function HistoryTable({ rows, rowsByEntity }: { rows: Row[]; rowsByEntity: RowsByEntity }) {
  return (
    <RecordTable
      module={{ ...moduleByKey("timelineEvents"), readOnly: true }}
      rows={rows}
      rowsByEntity={rowsByEntity}
      onOpen={() => undefined}
      onDelete={() => undefined}
    />
  );
}

function AlertList({ alerts }: { alerts: ReturnType<typeof buildOperationalAlerts> }) {
  if (!alerts.length) return null;
  return (
    <div className="alert-list">
      {alerts.map((alert) => (
        <article key={`${alert.kind}-${alert.id}-${alert.label}`}>
          <strong>{alert.kind}</strong>
          <span>{alert.label}: {alert.reference}</span>
        </article>
      ))}
    </div>
  );
}

function buildOperationalAlerts(demands: Row[], shipments: Row[], containers: Row[]) {
  return [
    ...buildDemandAlerts(demands).map((alert) => ({ ...alert, kind: "Supplier Follow-up" })),
    ...shipments
      .filter((shipment) => shipment.status === "Confirmed Arrival")
      .map((shipment) => ({ kind: "Stock Entry", id: shipment.id, label: "Confirmed arrival waiting stock entry", reference: String(shipment.shipmentNumber ?? shipment.reference ?? "Shipment") })),
    ...containers
      .filter((container) => isComingDue(container.freeTimeDeadline))
      .map((container) => ({ kind: "Free Time", id: container.id, label: "Free time near deadline", reference: String(container.containerNumber ?? "Container") })),
  ];
}

function buildDemandAlerts(demands: Row[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return demands
    .map((demand) => {
      const requested = Number(demand.requestedQuantity ?? 0);
      const fulfilled = Number(demand.fulfilledQuantity ?? demand.shippedQuantity ?? 0);
      const balance = Math.max(0, requested - fulfilled);
      if (!balance || demand.status === "Closed" || demand.status === "Fulfilled") return null;
      const date = String(demand.readinessDate || demand.requiredDate || "");
      const days = date ? Math.ceil((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000) : 9999;
      const label = days < 0 ? "Overdue" : days === 0 ? "Due today" : days <= 5 ? "Coming due" : "Future";
      return { id: demand.id, supplierId: demand.supplierId, reference: String(demand.demandNumber ?? demand.reference ?? "Demand"), date, status: String(demand.status ?? "Open"), balance, label, rank: label === "Overdue" ? 1 : label === "Due today" ? 2 : label === "Coming due" ? 3 : 4 };
    })
    .filter((alert): alert is NonNullable<typeof alert> => Boolean(alert))
    .filter((alert) => alert.label !== "Future");
}

function getShipmentChildren(shipmentId: number | null, rowsByEntity: RowsByEntity) {
  const shipmentIds = shipmentId ? new Set([String(shipmentId)]) : new Set<string>();
  const commercialInvoices = (rowsByEntity.commercialInvoices ?? []).filter((row) => shipmentIds.has(String(row.shipmentId)));
  const invoiceIds = new Set(commercialInvoices.map((invoice) => String(invoice.id)));
  return {
    shipmentDemands: (rowsByEntity.shipmentDemands ?? []).filter((row) => shipmentIds.has(String(row.shipmentId))),
    commercialInvoices,
    invoiceItems: (rowsByEntity.invoiceItems ?? []).filter((row) => shipmentIds.has(String(row.shipmentId)) || invoiceIds.has(String(row.invoiceId))),
    packages: (rowsByEntity.packages ?? []).filter((row) => shipmentIds.has(String(row.shipmentId))),
    containers: (rowsByEntity.containers ?? []).filter((row) => shipmentIds.has(String(row.shipmentId))),
    shipmentCosts: (rowsByEntity.shipmentCosts ?? []).filter((row) => shipmentIds.has(String(row.shipmentId))),
    shipmentDocuments: (rowsByEntity.shipmentDocuments ?? []).filter((row) => shipmentIds.has(String(row.shipmentId))),
    timelineEvents: (rowsByEntity.timelineEvents ?? []).filter((row) => row.entity === "shipments" || shipmentIds.has(String(row.entityId))),
  };
}

function shipmentSummary(shipment: Row, children: ReturnType<typeof getShipmentChildren>) {
  const invoiceValue = children.commercialInvoices.reduce((total, invoice) => total + Number(invoice.amount ?? 0), 0);
  const itemValue = children.invoiceItems.reduce((total, item) => total + Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0), 0);
  const packageQty = children.packages.reduce((total, item) => total + Number(item.quantity ?? 0), 0);
  const cbm = children.packages.reduce((total, item) => total + Number(item.cbm ?? 0), 0);
  const net = children.packages.reduce((total, item) => total + Number(item.netWeightKg ?? 0), 0);
  const gross = children.packages.reduce((total, item) => total + Number(item.grossWeightKg ?? 0), 0);
  return [
    ["Demands", String(children.shipmentDemands.length)],
    ["Invoices", String(children.commercialInvoices.length)],
    ["Invoice Value", formatNumber(invoiceValue || itemValue)],
    ["Items", String(children.invoiceItems.length)],
    ["Packages", String(packageQty)],
    ["CBM", formatNumber(cbm)],
    ["Net / Gross", `${formatNumber(net)} / ${formatNumber(gross)}`],
    ["Containers", String(children.containers.length)],
    ["Current ETA", friendlyDate(shipment.eta)],
    ["Status", resolveShipmentStatus(shipment)],
  ];
}

function isComingDue(dateValue: Row[string]) {
  if (!dateValue) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((new Date(`${dateValue}T00:00:00`).getTime() - today.getTime()) / 86400000);
  return days >= 0 && days <= 3;
}

async function fetchRows(entity: EntityKey) {
  const response = await fetch(`/api/records/${entity}`);
  const data = await response.json();
  if (!response.ok) throw new Error(String(data.error ?? `Unable to load ${entity}`));
  return (data.rows ?? []) as Row[];
}

function moduleByKey(key: EntityKey) {
  const config = modules.find((item) => item.key === key);
  if (!config) throw new Error(`Missing module ${key}`);
  return config;
}

function displayRelation(entity: EntityKey, value: Row[string], rowsByEntity: RowsByEntity) {
  if (!value) return "";
  const field: Field = relationFieldFor(entity);
  const row = findSelectedReference(field, rowsByEntity[entity] ?? [], value);
  return row ? referenceLabel(field, row) : "";
}

function relationFieldFor(entity: EntityKey): Field {
  if (entity === "suppliers") return { key: "supplierId", label: "Supplier", relation: entity, relationLabel: ["name", "country"], relationValue: "id" };
  if (entity === "agents") return { key: "agentId", label: "Freight Forwarder", relation: entity, relationLabel: ["name"], relationValue: "id" };
  if (entity === "partNumbers") return { key: "partNumberId", label: "Part Number", relation: entity, relationLabel: ["partNumber", "description"], relationValue: "id" };
  if (entity === "requesters") return { key: "requesterId", label: "Requester", relation: entity, relationLabel: ["name"], relationValue: "id" };
  if (entity === "shipments") return { key: "shipmentId", label: "Shipment", relation: entity, relationLabel: ["shipmentNumber", "reference"], relationValue: "id" };
  if (entity === "demands") return { key: "demandId", label: "Demand", relation: entity, relationLabel: ["demandNumber", "reference"], relationValue: "id" };
  if (entity === "commercialInvoices") return { key: "invoiceId", label: "Invoice", relation: entity, relationLabel: ["invoiceNumber", "currency"], relationValue: "id" };
  if (entity === "freightContracts") return { key: "contractId", label: "Freight Contract", relation: entity, relationLabel: ["contractNumber", "carrier"], relationValue: "id" };
  return { key: "id", label: "Record", relation: entity, relationLabel: ["name", "code"], relationValue: "id" };
}

function renderCell(row: Row, column: string, entity: EntityKey, rowsByEntity: RowsByEntity) {
  if (column === "alerts") {
    return row.status === "Confirmed Arrival" ? <span className="status-chip warning">Stock entry</span> : "-";
  }
  if (column === "record") return displayRecord(row, entity, rowsByEntity);
  if (column.endsWith("Id")) {
    const relation = relationForColumn(column);
    return relation ? displayRelation(relation, row[column], rowsByEntity) || "-" : "-";
  }
  if (column === "status") return <span className="status-chip">{formatCell(row[column])}</span>;
  if (column.toLowerCase().includes("date") || ["etd", "eta", "ata", "atd", "pcd", "createdAt"].includes(column)) return friendlyDate(row[column]);
  if (typeof row[column] === "number") return formatNumber(Number(row[column]));
  return formatCell(row[column]);
}

function relationForColumn(column: string): EntityKey | null {
  if (column === "supplierId") return "suppliers";
  if (column === "agentId") return "agents";
  if (column === "partNumberId") return "partNumbers";
  if (column === "requesterId") return "requesters";
  if (column === "shipmentId") return "shipments";
  if (column === "demandId") return "demands";
  if (column === "invoiceId") return "commercialInvoices";
  if (column === "consolidationId") return "consolidations";
  if (column === "contractId") return "freightContracts";
  return null;
}

function displayRecord(row: Row, entity: EntityKey, rowsByEntity: RowsByEntity) {
  void rowsByEntity;
  if (entity === "timelineEvents") return `${formatCell(row.entity)} change`;
  return String(row.shipmentNumber ?? row.demandNumber ?? row.invoiceNumber ?? row.containerNumber ?? row.partNumber ?? row.consolidationNumber ?? row.contractNumber ?? row.documentNumber ?? row.name ?? row.code ?? moduleTitle(entity));
}

function referenceLabel(field: Field, row: Row) {
  const parts = (field.relationLabel ?? ["name"]).map((key) => row[key]).filter((part) => part !== null && part !== undefined && part !== "");
  return parts.join(" / ") || displayRecord(row, field.relation ?? "suppliers", {});
}

function findSelectedReference(field: Field, rows: Row[], value: Row[string]) {
  const valueKey = field.relationValue ?? "id";
  return rows.find((row) => String(row[valueKey] ?? "") === String(value ?? ""));
}

function filterReferenceRows(field: Field, rows: Row[], draft: Row) {
  if (!field.dependsOn || !field.dependsValueKey) return rows;
  const expected = draft[field.dependsOn];
  if (!expected) return rows;
  return rows.filter((row) => String(row[field.dependsValueKey!] ?? "") === String(expected));
}

function withFieldSideEffects(next: Row, field: Field, rowsByEntity: RowsByEntity) {
  if (field.key === "partNumberId") {
    const part = findById(rowsByEntity.partNumbers ?? [], next.partNumberId);
    if (part) {
      next.description = String(part.description ?? "");
      next.ncm = String(part.ncm ?? "");
      next.unitOfMeasure = String(part.unitOfMeasure ?? "");
      next.netWeightKg = Number(part.netWeightKg ?? next.netWeightKg ?? 0);
      next.grossWeightKg = Number(part.grossWeightKg ?? next.grossWeightKg ?? 0);
      next.cbm = Number(part.cbm ?? next.cbm ?? 0);
      next.packageType = String(part.packageType ?? next.packageType ?? "");
    }
  }
  if (field.key === "quantity" || field.key === "unitPrice") {
    next.totalAmount = Number(next.quantity ?? 0) * Number(next.unitPrice ?? 0);
  }
  return next;
}

function searchableText(row: Row, module: ModuleConfig, rowsByEntity: RowsByEntity) {
  const rendered = (module.columns ?? []).map((column) => {
    const cell = renderCell(row, column, module.key as EntityKey, rowsByEntity);
    return typeof cell === "string" ? cell : formatCell(row[column]);
  });
  return `${Object.values(row).join(" ")} ${rendered.join(" ")}`.toLowerCase();
}

function updateRows(rows: Row[], row: Row) {
  return rows.some((item) => item.id === row.id) ? rows.map((item) => (item.id === row.id ? row : item)) : [row, ...rows];
}

function findById(rows: Row[], id: Row[string]) {
  return rows.find((row) => String(row.id) === String(id));
}

function childKey(entity: EntityKey, invoiceId?: Row[string]) {
  return `${entity}:${invoiceId ?? "main"}`;
}

function moduleTitle(entity: EntityKey) {
  return moduleByKey(entity).title;
}

function columnLabel(column: string) {
  const labels: Record<string, string> = {
    agentId: "Freight Forwarder",
    carrier: "Carrier / Provider",
    containerType: "Equipment",
    tin: "Tax ID",
    modal: "Mode",
    eta: "Current ETA",
    ddlDate: "Due Date",
    fieldName: "Field",
    actorEmail: "Changed By",
    createdAt: "Date and Time",
    totalAmount: "Total Amount",
  };
  return labels[column] ?? column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function formatCell(value: Row[string]) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function friendlyDate(value: Row[string]) {
  if (!value) return "-";
  const text = String(value);
  const date = new Date(text.includes("T") ? text : `${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat(undefined, text.includes("T") ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value || 0);
}

function pluralize(count: number, noun: string) {
  if (noun.endsWith("registered")) {
    const base = noun.replace(" registered", "");
    return `${count} ${base}${count === 1 ? "" : "s"} registered`;
  }
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function singular(title: string) {
  if (title === "Freight Forwarders") return "Freight Forwarder";
  if (title === "Ports of Loading") return "Port of Loading";
  if (title === "Consolidation Locations") return "Consolidation Location";
  if (title.endsWith("ies")) return `${title.slice(0, -3)}y`;
  if (title.endsWith("s")) return title.slice(0, -1);
  return title;
}

function emptyText(title: string) {
  return `${title} will appear here after you add matching operational data.`;
}
