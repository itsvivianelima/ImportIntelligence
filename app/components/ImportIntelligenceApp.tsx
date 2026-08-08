"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  materialTypes,
  resolveDemandStatus,
  resolveShipmentStatus,
  type EntityKey,
} from "../../lib/domain";

type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "checkbox";
  options?: readonly string[];
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
      { key: "supplierId", label: "SUPPLIER ID", type: "number" },
      { key: "partNumberId", label: "PART NUMBER ID", type: "number" },
      { key: "requesterId", label: "REQUESTER ID", type: "number" },
      { key: "requiredDate", label: "REQUIRED DATE", type: "date" },
      { key: "requestedQuantity", label: "REQUESTED QUANTITY", type: "number" },
      { key: "fulfilledQuantity", label: "FULFILLED QUANTITY", type: "number" },
      { key: "forecastModal", label: "FORECAST MODAL", type: "select", options: ["", "AIR", "LCL", "FCL"] },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "shipments",
    title: "SHIPMENTS",
    group: "OPERATIONS",
    description: "Shipment execution with booking, route, documents, costs, and DELIVERY DATE status logic.",
    fullPage: true,
    columns: ["shipmentNumber", "modal", "pol", "pod", "eta", "deliveryDate", "status"],
    fields: [
      { key: "shipmentNumber", label: "SHIPMENT NUMBER" },
      { key: "supplierId", label: "SUPPLIER ID", type: "number" },
      { key: "agentId", label: "AGENT ID", type: "number" },
      { key: "modal", label: "MODAL", type: "select", options: ["AIR", "LCL", "FCL"] },
      { key: "shipmentType", label: "SHIPMENT TYPE", type: "select", options: materialTypes },
      { key: "incoterm", label: "INCOTERM" },
      { key: "cfs", label: "CFS" },
      { key: "pol", label: "POL" },
      { key: "pod", label: "POD" },
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
      { key: "deliveryDate", label: "DELIVERY DATE", type: "date" },
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
      { key: "cfs", label: "CFS" },
      { key: "pol", label: "POL" },
      { key: "pod", label: "POD" },
      { key: "closingDate", label: "CLOSING DATE", type: "date" },
      { key: "eta", label: "ETA", type: "date" },
      { key: "totalCbm", label: "TOTAL CBM", type: "number" },
      { key: "status", label: "STATUS", type: "select", options: ["OPEN", "CLOSED", "SHIPPED"] },
      { key: "notes", label: "NOTES", type: "textarea" },
    ],
  },
  {
    key: "suppliers",
    title: "SUPPLIERS",
    group: "MASTER DATA",
    description: "Supplier and exporter master data with TIN, default POL, and default CFS.",
    fullPage: true,
    columns: ["code", "name", "country", "tin", "defaultPol", "defaultCfs"],
    fields: [
      { key: "code", label: "SUPPLIER CODE" },
      { key: "name", label: "SUPPLIER NAME" },
      { key: "country", label: "COUNTRY" },
      { key: "tin", label: "TIN" },
      { key: "defaultPol", label: "DEFAULT POL" },
      { key: "defaultCfs", label: "DEFAULT CFS" },
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
      { key: "supplierId", label: "SUPPLIER ID", type: "number" },
      { key: "description", label: "DESCRIPTION" },
      { key: "ncm", label: "NCM" },
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
    columns: ["name", "email", "phone"],
    fields: [
      { key: "name", label: "NAME" },
      { key: "email", label: "EMAIL" },
      { key: "phone", label: "PHONE" },
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
      { key: "carrier", label: "CARRIER" },
      { key: "modal", label: "MODAL", type: "select", options: ["AIR", "LCL", "FCL"] },
      { key: "pol", label: "POL" },
      { key: "pod", label: "POD" },
      { key: "equipment", label: "EQUIPMENT" },
      { key: "currency", label: "CURRENCY" },
      { key: "rate", label: "RATE", type: "number" },
      { key: "validFrom", label: "VALID FROM", type: "date" },
      { key: "validTo", label: "VALID TO", type: "date" },
    ],
  },
  {
    key: "publicRates",
    title: "PUBLIC RATES",
    group: "CONTRACTS & COSTS",
    description: "Public tariff baseline used for savings calculations.",
    columns: ["carrier", "modal", "pol", "pod", "currency", "rate", "chargingBasis"],
    fields: [
      { key: "carrier", label: "CARRIER" },
      { key: "modal", label: "MODAL", type: "select", options: ["AIR", "LCL", "FCL"] },
      { key: "pol", label: "POL" },
      { key: "pod", label: "POD" },
      { key: "currency", label: "CURRENCY" },
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
      { key: "modal", label: "MODAL", type: "select", options: ["AIR", "LCL", "FCL"] },
      { key: "currency", label: "CURRENCY" },
      { key: "amount", label: "AMOUNT", type: "number" },
      { key: "chargingBasis", label: "CHARGING BASIS" },
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
      { key: "fromCurrency", label: "FROM CURRENCY" },
      { key: "toCurrency", label: "TO CURRENCY" },
      { key: "rate", label: "RATE", type: "number" },
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
                  {active.fields.map((field) => (
                    <FieldControl
                      key={field.key}
                      field={field}
                      value={draft[field.key]}
                      onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
                    />
                  ))}
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
                <span>Supplier {"->"} Part Number {"->"} Demand {"->"} Shipment {"->"} Packing {"->"} Containers {"->"} Invoices {"->"} Reports {"->"} Insights</span>
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
  onChange,
}: {
  field: Field;
  value: Row[string];
  onChange: (value: string | number | boolean) => void;
}) {
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
          onChange(field.type === "number" ? Number(event.target.value) : event.target.value)
        }
      />
    </label>
  );
}

function Dashboard() {
  return (
    <div className="dashboard-grid">
      {quickStats.map((stat) => (
        <article key={stat} className="metric">
          <span>{stat}</span>
          <strong>0</strong>
          <small>NO RECORDS</small>
        </article>
      ))}
    </div>
  );
}

function Reports() {
  return (
    <div className="report-grid">
      {["CONFIRMED TRANSIT", "PROBABLE TRANSIT", "ESTIMATED TRANSIT", "SAVINGS"].map((report) => (
        <article key={report}>
          <h3>{report}</h3>
          <p>Waiting for operational history. No fake production data is loaded.</p>
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
