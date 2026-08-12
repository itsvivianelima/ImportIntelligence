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
  seaDestinations,
  tariffTypes,
  type EntityKey,
} from "./domain";

export const excelTemplateVersion = "1.0";
export const maxImportRowsPerSheet = 2000;
export const maxImportFileBytes = 8 * 1024 * 1024;

export type ExcelColumn = {
  header: string;
  key: string;
  required?: boolean;
  type: "text" | "number" | "date" | "month" | "boolean";
  format?: string;
  allowed?: readonly string[];
  match?: boolean;
  updatable?: boolean;
  readOnly?: boolean;
  descriptionPt: string;
  notes?: string;
  example?: string | number;
};

export type ExcelSheetConfig = {
  sheet: string;
  entity: EntityKey;
  columns: ExcelColumn[];
  order: number;
};

const yesNo = ["Yes", "No"] as const;
const routeOptions = ["", ...seaDestinations, ...airDestinations] as const;
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
const chargingBasis = ["W/M", "CBM", "Container", "AWB", "Shipment", "BL", "Ton", "Percentage", "Minimum", "Manual"] as const;

export const excelSheets: ExcelSheetConfig[] = [
  {
    sheet: "Suppliers",
    entity: "suppliers",
    order: 10,
    columns: [
      col("Supplier Code", "code", "text", "Codigo operacional do fornecedor.", { required: true, match: true, example: "SUP-001" }),
      col("Company Name", "name", "text", "Razao social ou nome do fornecedor.", { required: true, updatable: true, example: "Example Supplier Ltd" }),
      col("Full Address", "address", "text", "Endereco completo do fornecedor.", { updatable: true }),
      col("City", "city", "text", "Cidade do fornecedor.", { updatable: true, example: "Chicago" }),
      col("State / Province", "stateProvince", "text", "Estado ou provincia.", { updatable: true }),
      col("Postal Code", "postalCode", "text", "Codigo postal preservado como texto.", { updatable: true }),
      col("Country", "country", "text", "Pais do fornecedor.", { updatable: true, example: "USA" }),
      col("Continent", "continent", "text", "Continente do fornecedor.", { updatable: true }),
      col("Default Currency", "defaultCurrency", "text", "Moeda padrao do fornecedor.", { allowed: currencies, updatable: true, example: "USD" }),
      col("Tax Identification Number", "tin", "text", "Identificacao fiscal.", { updatable: true }),
      col("Default Air Incoterm", "defaultIncotermAir", "text", "Incoterm padrao para embarques aereos.", { allowed: incoterms, updatable: true }),
      col("Default LCL Incoterm", "defaultIncotermLcl", "text", "Incoterm padrao para LCL.", { allowed: incoterms, updatable: true }),
      col("Default FCL Incoterm", "defaultIncotermFcl", "text", "Incoterm padrao para FCL.", { allowed: incoterms, updatable: true }),
      col("Default POL", "defaultPol", "text", "Codigo do porto de embarque padrao.", { updatable: true }),
      col("Default CFS", "defaultCfs", "text", "Codigo do local de consolidacao padrao.", { updatable: true }),
      col("Contact Name", "contactName", "text", "Contato principal.", { updatable: true }),
      col("Contact Email", "contactEmail", "text", "E-mail do contato principal.", { updatable: true }),
      col("Contact Phone", "contactPhone", "text", "Telefone do contato principal.", { updatable: true }),
      col("Notes", "notes", "text", "Observacoes internas.", { updatable: true }),
    ],
  },
  {
    sheet: "Part Numbers",
    entity: "partNumbers",
    order: 20,
    columns: [
      col("Part Number", "partNumber", "text", "Codigo do PN no cadastro mestre.", { required: true, match: true, example: "000123" }),
      col("Supplier Code", "supplierCode", "text", "Codigo do fornecedor relacionado ao PN.", { required: true, match: true, example: "SUP-001" }),
      col("Description", "description", "text", "Descricao mestre do item.", { required: true, updatable: true }),
      col("NCM", "ncm", "text", "Classificacao fiscal NCM.", { updatable: true }),
      col("NCM Last Review", "ncmReviewedAt", "date", "Data da ultima revisao do NCM.", { format: "YYYY-MM-DD", updatable: true }),
      col("Unit of Measure", "unitOfMeasure", "text", "Unidade de medida.", { updatable: true, example: "PC" }),
      col("Material Type", "materialType", "text", "Tipo de material.", { allowed: materialTypes, updatable: true, example: "Raw Material" }),
      col("Net Weight per Unit (kg)", "netWeightKg", "number", "Peso liquido por unidade em kg.", { updatable: true, example: 1.2 }),
      col("Gross Weight per Unit (kg)", "grossWeightKg", "number", "Peso bruto por unidade em kg.", { updatable: true, example: 1.5 }),
      col("CBM per Unit", "cbm", "number", "CBM por unidade.", { updatable: true, example: 0.01 }),
      col("Package Type", "packageType", "text", "Tipo de embalagem padrao.", { allowed: packageTypes, updatable: true }),
    ],
  },
  {
    sheet: "Requesters",
    entity: "requesters",
    order: 30,
    columns: [
      col("Requester", "name", "text", "Nome do solicitante.", { required: true, match: true, example: "Maria Souza" }),
      col("Email", "email", "text", "E-mail do solicitante.", { updatable: true }),
      col("Department", "department", "text", "Area ou departamento.", { updatable: true }),
    ],
  },
  {
    sheet: "Freight Forwarders",
    entity: "agents",
    order: 40,
    columns: [
      col("Company Name", "name", "text", "Nome do agente de carga.", { required: true, match: true, example: "Example Forwarder" }),
      col("Contact Name", "contactName", "text", "Contato principal.", { updatable: true }),
      col("Email", "email", "text", "E-mail do contato.", { updatable: true }),
      col("Phone", "phone", "text", "Telefone.", { updatable: true }),
      col("Payment Days", "paymentDays", "number", "Prazo de pagamento em dias.", { updatable: true }),
      col("Payment Terms", "paymentTerms", "text", "Condição de pagamento.", { allowed: paymentTerms, updatable: true }),
      col("Air Service", "serviceAir", "boolean", "Indica se presta serviço aereo.", { allowed: yesNo, updatable: true, example: "Yes" }),
      col("LCL Service", "serviceLcl", "boolean", "Indica se presta serviço LCL.", { allowed: yesNo, updatable: true }),
      col("FCL Service", "serviceFcl", "boolean", "Indica se presta serviço FCL.", { allowed: yesNo, updatable: true }),
      col("Courier Service", "serviceCourier", "boolean", "Indica se presta serviço courier.", { allowed: yesNo, updatable: true }),
      col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
    ],
  },
  simpleLocation("Ports of Loading", "pol", 50),
  simpleLocation("Consolidation Locations", "cfs", 60),
  {
    sheet: "Freight Contracts",
    entity: "freightContracts",
    order: 70,
    columns: [
      col("Contract Number", "contractNumber", "text", "Numero do contrato.", { required: true, match: true }),
      col("Carrier / Provider", "carrier", "text", "Fornecedor do frete.", { required: true, updatable: true }),
      col("Mode", "modal", "text", "Modal do contrato.", { allowed: modals, updatable: true }),
      col("POL", "pol", "text", "Porto de origem.", { updatable: true }),
      col("POD", "pod", "text", "Destino.", { allowed: routeOptions, updatable: true }),
      col("Equipment", "equipment", "text", "Equipamento contratado.", { allowed: containerTypes, updatable: true }),
      col("Currency", "currency", "text", "Moeda da tarifa.", { allowed: currencies, updatable: true }),
      col("Rate", "rate", "number", "Tarifa contratual.", { updatable: true }),
      col("Valid From", "validFrom", "date", "Inicio da validade.", { format: "YYYY-MM-DD", updatable: true }),
      col("Valid To", "validTo", "date", "Fim da validade.", { format: "YYYY-MM-DD", updatable: true }),
      col("Total Equipment", "totalEquipment", "number", "Quantidade total contratada.", { updatable: true }),
      col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
    ],
  },
  {
    sheet: "Reference Rates",
    entity: "publicRates",
    order: 80,
    columns: [
      col("Carrier / Provider", "carrier", "text", "Fornecedor da tarifa de referencia.", { required: true, match: true }),
      col("Mode", "modal", "text", "Modal.", { allowed: modals, match: true, updatable: true }),
      col("Equipment", "containerType", "text", "Equipamento ou All Equipment.", { allowed: ["All Equipment", ...containerTypes], match: true, updatable: true }),
      col("POL", "pol", "text", "Origem.", { match: true, updatable: true }),
      col("POD", "pod", "text", "Destino.", { match: true, updatable: true }),
      col("Currency", "currency", "text", "Moeda.", { allowed: currencies, updatable: true }),
      col("Rate", "rate", "number", "Valor da tarifa.", { updatable: true }),
      col("Charging Basis", "chargingBasis", "text", "Base de cobranca.", { allowed: chargingBasis, updatable: true }),
      col("Valid From", "validFrom", "date", "Inicio da validade.", { format: "YYYY-MM-DD", updatable: true }),
      col("Valid To", "validTo", "date", "Fim da validade.", { format: "YYYY-MM-DD", updatable: true }),
    ],
  },
  {
    sheet: "Surcharges",
    entity: "surcharges",
    order: 90,
    columns: [
      col("Name", "name", "text", "Nome da sobretaxa.", { required: true, match: true }),
      col("Mode", "modal", "text", "Modal.", { allowed: modals, updatable: true }),
      col("Currency", "currency", "text", "Moeda.", { allowed: currencies, updatable: true }),
      col("Amount", "amount", "number", "Valor.", { updatable: true }),
      col("Charging Basis", "chargingBasis", "text", "Base de cobranca.", { allowed: chargingBasis, updatable: true }),
      col("Include in reference cost comparison", "comparable", "boolean", "Usar na comparacao com tarifa de referencia.", { allowed: yesNo, updatable: true }),
    ],
  },
  {
    sheet: "Daily Exchange Rates",
    entity: "exchangeRates",
    order: 100,
    columns: [
      col("Rate Date", "rateDate", "date", "Data da taxa.", { required: true, match: true, format: "YYYY-MM-DD" }),
      col("From Currency", "fromCurrency", "text", "Moeda de origem.", { required: true, match: true, allowed: currencies }),
      col("To Currency", "toCurrency", "text", "Moeda de destino.", { required: true, match: true, allowed: currencies }),
      col("Exchange Rate", "rate", "number", "Taxa de conversao.", { required: true, updatable: true }),
    ],
  },
  {
    sheet: "Monthly Modine Rates",
    entity: "monthlyExchangeRates",
    order: 110,
    columns: [
      col("Month", "month", "month", "Mes de referencia.", { required: true, match: true, format: "YYYY-MM" }),
      col("USD to BRL", "usdBrl", "number", "Taxa USD para BRL.", { updatable: true }),
      col("EUR to BRL", "eurBrl", "number", "Taxa EUR para BRL.", { updatable: true }),
      col("GBP to BRL", "gbpBrl", "number", "Taxa GBP para BRL.", { updatable: true }),
      col("SEK to BRL", "sekBrl", "number", "Taxa SEK para BRL.", { updatable: true }),
    ],
  },
  {
    sheet: "Free Time Rules",
    entity: "freeTimeRules",
    order: 120,
    columns: [
      col("Equipment", "equipment", "text", "Tipo de equipamento.", { required: true, match: true, allowed: containerTypes }),
      col("Free Time Days", "freeTimeDays", "number", "Dias de free time.", { required: true, updatable: true }),
      col("Alert Days Before", "alertDaysBefore", "number", "Antecedencia do alerta.", { updatable: true }),
      col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
    ],
  },
  {
    sheet: "Demands",
    entity: "demands",
    order: 130,
    columns: [
      col("Demand Number", "demandNumber", "text", "Numero operacional da demanda.", { required: true, match: true }),
      col("Reference", "reference", "text", "Referencia operacional.", { updatable: true }),
      col("Supplier Code", "supplierCode", "text", "Codigo do fornecedor.", { required: true }),
      col("Part Number", "partNumber", "text", "Codigo do PN.", { required: true }),
      col("Requester", "requesterName", "text", "Nome do solicitante.", { updatable: true }),
      col("Quantity", "requestedQuantity", "number", "Quantidade solicitada.", { required: true, updatable: true }),
      col("Unit", "unitOfMeasure", "text", "Unidade.", { updatable: true }),
      col("Cargo Ready Date", "readinessDate", "date", "Data de prontidao da carga.", { format: "YYYY-MM-DD", updatable: true }),
      col("Required at Modine", "modineDeadline", "date", "Data requerida na Modine.", { format: "YYYY-MM-DD", updatable: true }),
      col("Fulfilled Quantity", "fulfilledQuantity", "number", "Quantidade atendida.", { updatable: true }),
      col("Allocated Quantity", "linkedQuantity", "number", "Quantidade alocada.", { readOnly: true }),
      col("Shipped Quantity", "shippedQuantity", "number", "Quantidade embarcada.", { readOnly: true }),
      col("Excess Quantity", "excessQuantity", "number", "Excesso calculado.", { readOnly: true }),
      col("Mark as Fulfilled", "manuallyClosed", "boolean", "Fechar manualmente como atendida.", { allowed: yesNo, updatable: true }),
      col("Recommended Mode", "forecastModal", "text", "Modal recomendado.", { allowed: modals, updatable: true }),
      col("Material Type", "demandType", "text", "Tipo de material.", { allowed: materialTypes, updatable: true }),
      col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
    ],
  },
  {
    sheet: "Shipments",
    entity: "shipments",
    order: 140,
    columns: [
      col("Shipment Number", "shipmentNumber", "text", "Numero operacional do embarque.", { required: true, match: true, example: "IMP-2026-001" }),
      col("Reference", "reference", "text", "Referencia operacional.", { updatable: true }),
      col("Supplier Code", "supplierCode", "text", "Codigo do fornecedor.", { required: true }),
      col("Freight Forwarder", "freightForwarder", "text", "Nome unico do agente de carga.", { updatable: true }),
      col("Mode", "modal", "text", "Modal.", { allowed: modals, updatable: true }),
      col("Shipment Type", "shipmentType", "text", "Tipo de embarque.", { allowed: materialTypes, updatable: true }),
      col("Incoterm", "incoterm", "text", "Incoterm.", { allowed: incoterms, updatable: true }),
      col("Customs Clearance", "clearanceType", "text", "Tipo de desembaraco.", { allowed: clearanceTypes, updatable: true }),
      col("Rate Type", "tariffType", "text", "Tipo de tarifa.", { allowed: tariffTypes, updatable: true }),
      col("Freight Contract", "freightContract", "text", "Numero do contrato de frete.", { updatable: true }),
      col("CFS", "cfs", "text", "Codigo do local de consolidacao.", { updatable: true }),
      col("POL", "pol", "text", "Codigo do porto de embarque.", { updatable: true }),
      col("POD / Airport", "pod", "text", "Destino.", { allowed: routeOptions, updatable: true }),
      col("Required at Modine", "deadline", "date", "Data requerida.", { format: "YYYY-MM-DD", updatable: true }),
      col("Booking Number", "bookingNumber", "text", "Numero de booking.", { updatable: true }),
      col("Vessel", "vessel", "text", "Navio.", { updatable: true }),
      col("Quotation Date", "quotationDate", "date", "Data da cotacao.", { format: "YYYY-MM-DD", updatable: true }),
      col("Green Light Date", "greenLightDate", "date", "Data de green light.", { format: "YYYY-MM-DD", updatable: true }),
      col("Cargo Ready Date", "cargoReadyDate", "date", "Data de prontidao.", { format: "YYYY-MM-DD", updatable: true }),
      col("Scheduled Pickup", "pickupScheduledDate", "date", "Coleta programada.", { format: "YYYY-MM-DD", updatable: true }),
      col("Confirmed Pickup", "pickupConfirmedDate", "date", "Coleta confirmada.", { format: "YYYY-MM-DD", updatable: true }),
      col("Booking Confirmation Date", "bookingConfirmedDate", "date", "Data de confirmacao do booking.", { format: "YYYY-MM-DD", updatable: true }),
      col("ETD", "etd", "date", "ETD.", { format: "YYYY-MM-DD", updatable: true }),
      col("ATD", "atd", "date", "ATD.", { format: "YYYY-MM-DD", updatable: true }),
      col("Initial ETA", "initialEta", "date", "ETA inicial.", { format: "YYYY-MM-DD", updatable: true }),
      col("Current ETA", "eta", "date", "ETA vigente.", { format: "YYYY-MM-DD", updatable: true }),
      col("ATA", "ata", "date", "ATA.", { format: "YYYY-MM-DD", updatable: true }),
      col("PCD", "pcd", "date", "PCD.", { format: "YYYY-MM-DD", updatable: true }),
      col("Use ETD as PCD", "pcdIsSet", "boolean", "Usar ETD como PCD.", { allowed: yesNo, updatable: true }),
      col("Delivery Date", "deliveryDate", "date", "Data de entrega.", { format: "YYYY-MM-DD", updatable: true }),
      col("Stock Entry Date", "stockEntryDate", "date", "Entrada em estoque.", { format: "YYYY-MM-DD", updatable: true }),
      col("Exclude from Forecast", "operationalDeviation", "boolean", "Excluir de previsoes por evento excepcional.", { allowed: yesNo, updatable: true }),
      col("HBL / AWB", "hblAwb", "text", "Numero HBL/AWB.", { updatable: true }),
      col("HBL / AWB Date", "hblAwbDate", "date", "Data HBL/AWB.", { format: "YYYY-MM-DD", updatable: true }),
      col("Currency", "costCurrency", "text", "Moeda dos custos.", { allowed: currencies, updatable: true }),
      col("Status", "status", "text", "Status calculado pelo sistema.", { readOnly: true }),
      col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
    ],
  },
  childSheet("Demand Allocation", "shipmentDemands", 150, [
    col("Shipment Number", "shipmentNumber", "text", "Numero do embarque.", { required: true, match: true }),
    col("Demand Number", "demandNumber", "text", "Numero da demanda.", { required: true, match: true }),
    col("Quantity Allocated", "quantity", "number", "Quantidade alocada.", { required: true, updatable: true }),
    col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
  ]),
  childSheet("Commercial Invoices", "commercialInvoices", 160, [
    col("Shipment Number", "shipmentNumber", "text", "Numero do embarque.", { required: true, match: true }),
    col("Invoice Number", "invoiceNumber", "text", "Numero da invoice.", { required: true, match: true }),
    col("Supplier Code", "supplierCode", "text", "Codigo do fornecedor.", { updatable: true }),
    col("Invoice Date", "invoiceDate", "date", "Data da invoice.", { format: "YYYY-MM-DD", updatable: true }),
    col("Currency", "currency", "text", "Moeda.", { allowed: currencies, updatable: true }),
    col("Declared Total", "amount", "number", "Valor declarado.", { updatable: true }),
    col("Payment Terms", "paymentTerms", "text", "Condicao de pagamento.", { allowed: paymentTerms, updatable: true }),
    col("Due Date", "ddlDate", "date", "Data de vencimento.", { format: "YYYY-MM-DD", updatable: true }),
    col("Payment Risk", "risk", "text", "Risco de pagamento.", { updatable: true }),
    col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
  ]),
  childSheet("Invoice Items", "invoiceItems", 170, [
    col("Shipment Number", "shipmentNumber", "text", "Numero do embarque.", { required: true, match: true }),
    col("Invoice Number", "invoiceNumber", "text", "Numero da invoice.", { required: true, match: true }),
    col("Part Number", "partNumber", "text", "Codigo do PN existente.", { required: true, match: true }),
    col("Quantity", "quantity", "number", "Quantidade.", { required: true, updatable: true }),
    col("Unit Price", "unitPrice", "number", "Preco unitario.", { updatable: true }),
    col("Currency", "currency", "text", "Moeda.", { allowed: currencies, updatable: true }),
    col("Net Weight per Unit (kg)", "netWeightKg", "number", "Peso liquido unitario.", { updatable: true }),
    col("Gross Weight per Unit (kg)", "grossWeightKg", "number", "Peso bruto unitario.", { updatable: true }),
    col("CBM per Unit", "cbm", "number", "CBM unitario.", { updatable: true }),
    col("Package Type", "packageType", "text", "Tipo de embalagem.", { allowed: packageTypes, updatable: true }),
    col("Value Source", "valueKind", "text", "Origem do valor.", { allowed: ["Confirmed from Document", "Estimated from History"], updatable: true }),
    col("Sample", "isSample", "boolean", "Indica amostra.", { allowed: yesNo, updatable: true }),
    col("Customs Value", "customsValue", "number", "Valor aduaneiro.", { updatable: true }),
    col("Payable Value", "payableValue", "number", "Valor pagavel.", { updatable: true }),
  ]),
  childSheet("Packing", "packages", 180, [
    col("Shipment Number", "shipmentNumber", "text", "Numero do embarque.", { required: true, match: true }),
    col("Packing Line", "packingLine", "text", "Identificador da linha de packing.", { match: true }),
    col("Package Identification", "packageIdentification", "text", "Identificacao do volume.", { updatable: true }),
    col("Package Type", "packageType", "text", "Tipo de embalagem.", { allowed: packageTypes, updatable: true }),
    col("Quantity", "quantity", "number", "Quantidade de volumes.", { required: true, updatable: true }),
    col("Length", "lengthCm", "number", "Comprimento.", { updatable: true }),
    col("Width", "widthCm", "number", "Largura.", { updatable: true }),
    col("Height", "heightCm", "number", "Altura.", { updatable: true }),
    col("Dimension Unit", "dimensionUnit", "text", "Unidade da dimensao.", { allowed: dimensionUnits, updatable: true }),
    col("CBM", "cbm", "number", "CBM da linha; pode ser recalculado.", { updatable: true }),
    col("Net Weight (kg)", "netWeightKg", "number", "Peso liquido.", { updatable: true }),
    col("Gross Weight (kg)", "grossWeightKg", "number", "Peso bruto.", { updatable: true }),
    col("Stackable", "stackable", "boolean", "Empilhavel.", { allowed: yesNo, updatable: true }),
    col("Stacking Levels", "stackingLevels", "number", "Niveis de empilhamento.", { updatable: true }),
    col("Linked Invoice Number", "linkedInvoice", "text", "Invoice vinculada.", { updatable: true }),
    col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
  ]),
  childSheet("Containers", "containers", 190, [
    col("Shipment Number", "shipmentNumber", "text", "Numero do embarque.", { required: true, match: true }),
    col("Container Number", "containerNumber", "text", "Numero do container.", { required: true, match: true }),
    col("Equipment", "equipment", "text", "Tipo de equipamento.", { required: true, allowed: containerTypes, updatable: true }),
    col("Seal Number", "seal", "text", "Numero do lacre.", { updatable: true }),
    col("Package Quantity", "packageQuantity", "number", "Quantidade de volumes.", { updatable: true }),
    col("CBM", "cbm", "number", "CBM no container.", { updatable: true }),
    col("Gross Weight (kg)", "grossWeightKg", "number", "Peso bruto.", { updatable: true }),
    col("Free Time Days", "freeTimeDays", "number", "Dias de free time.", { updatable: true }),
    col("Free Time Deadline", "freeTimeDeadline", "date", "Prazo final de free time.", { format: "YYYY-MM-DD", readOnly: true }),
    col("Linked Packing Line", "linkedPacking", "text", "Packing vinculado.", { updatable: true }),
    col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
  ]),
  childSheet("Shipment Costs", "shipmentCosts", 200, [
    col("Shipment Number", "shipmentNumber", "text", "Numero do embarque.", { required: true, match: true }),
    col("Cost Type", "costType", "text", "Tipo do custo.", { required: true, allowed: ["Estimated Cost", "Actual Cost"], match: true, updatable: true }),
    col("Description", "description", "text", "Descricao do custo.", { required: true, match: true, updatable: true }),
    col("Currency", "currency", "text", "Moeda.", { allowed: currencies, updatable: true }),
    col("Amount", "amount", "number", "Valor.", { updatable: true }),
    col("Source", "source", "text", "Origem do custo.", { updatable: true }),
    col("Charging Basis", "chargingBasis", "text", "Base de cobranca.", { allowed: chargingBasis, updatable: true }),
    col("Comparable", "comparable", "boolean", "Inclui na comparacao.", { allowed: yesNo, updatable: true }),
    col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
  ]),
  {
    sheet: "Consolidations",
    entity: "consolidations",
    order: 210,
    columns: [
      col("Consolidation Number", "consolidationNumber", "text", "Numero da consolidacao.", { required: true, match: true }),
      col("CFS", "cfs", "text", "Local de consolidacao.", { updatable: true }),
      col("POL", "pol", "text", "Porto de embarque.", { updatable: true }),
      col("POD", "pod", "text", "Destino.", { allowed: routeOptions, updatable: true }),
      col("Closing Date", "closingDate", "date", "Data de fechamento.", { format: "YYYY-MM-DD", updatable: true }),
      col("ETA", "eta", "date", "ETA.", { format: "YYYY-MM-DD", updatable: true }),
      col("Total CBM", "totalCbm", "number", "CBM total.", { updatable: true }),
      col("Status", "status", "text", "Status.", { allowed: ["Open", "Closed", "Shipped"], updatable: true }),
      col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
    ],
  },
  childSheet("Consolidation Loads", "consolidationShipments", 220, [
    col("Consolidation Number", "consolidationNumber", "text", "Numero da consolidacao.", { required: true, match: true }),
    col("Shipment Number", "shipmentNumber", "text", "Numero do embarque.", { required: true, match: true }),
    col("Managed Fields", "managedFields", "text", "Campos gerenciados pela consolidacao.", { updatable: true }),
  ]),
  childSheet("Document Metadata", "shipmentDocuments", 230, [
    col("Shipment Number", "shipmentNumber", "text", "Numero do embarque.", { required: true, match: true }),
    col("Document Type", "documentType", "text", "Tipo de documento.", { required: true, allowed: documentTypes, match: true, updatable: true }),
    col("Document Number", "documentNumber", "text", "Numero do documento.", { match: true, updatable: true }),
    col("Document Date", "documentDate", "date", "Data do documento.", { format: "YYYY-MM-DD", updatable: true }),
    col("File Name", "fileName", "text", "Nome do arquivo ja armazenado; nao representa upload.", { updatable: true }),
    col("Notes", "notes", "text", "Observacoes.", { updatable: true }),
  ]),
].sort((left, right) => left.order - right.order);

export const allowedValueGroups: Record<string, readonly string[]> = {
  Mode: [...modals, "COURIER"],
  "Rate Type": tariffTypes,
  "Customs Clearance": clearanceTypes,
  "Material Type": materialTypes,
  Equipment: containerTypes,
  "Package Type": packageTypes,
  "Cost Type": ["Estimated Cost", "Actual Cost"],
  "Value Source": ["Confirmed from Document", "Estimated from History"],
  Incoterms: incoterms,
  Currencies: currencies,
  "Dimension Units": dimensionUnits,
  "Payment Terms": paymentTerms,
  "Document Types": documentTypes,
  "Charging Bases": chargingBasis,
  Boolean: yesNo,
  Destinations: routeOptions.filter(Boolean),
};

function col(
  header: string,
  key: string,
  type: ExcelColumn["type"],
  descriptionPt: string,
  options: Partial<ExcelColumn> = {},
): ExcelColumn {
  return {
    header,
    key,
    type,
    descriptionPt,
    format: options.format ?? defaultFormat(type),
    updatable: options.updatable ?? !options.readOnly,
    ...options,
  };
}

function simpleLocation(sheet: string, entity: "pol" | "cfs", order: number): ExcelSheetConfig {
  return {
    sheet,
    entity,
    order,
    columns: [
      col("Code", "code", "text", "Codigo operacional.", { required: true, match: true }),
      col("Name", "name", "text", "Nome do local.", { required: true, updatable: true }),
      col("Country", "country", "text", "Pais.", { updatable: true }),
    ],
  };
}

function childSheet(sheet: string, entity: EntityKey, order: number, columns: ExcelColumn[]): ExcelSheetConfig {
  return { sheet, entity, order, columns };
}

function defaultFormat(type: ExcelColumn["type"]) {
  if (type === "date") return "YYYY-MM-DD";
  if (type === "month") return "YYYY-MM";
  if (type === "number") return "Decimal";
  if (type === "boolean") return "Yes/No";
  return "Text";
}
