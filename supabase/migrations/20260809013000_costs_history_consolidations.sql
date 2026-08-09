alter table public.ii_shipments
  add column if not exists contract_id bigint references public.ii_freight_contracts(id),
  add column if not exists contract_cost numeric not null default 0,
  add column if not exists public_cost numeric not null default 0,
  add column if not exists saving_amount numeric not null default 0,
  add column if not exists cost_currency text not null default '';

create table if not exists public.ii_invoice_items (
  id bigserial primary key,
  invoice_id bigint not null references public.ii_commercial_invoices(id) on delete cascade,
  shipment_id bigint references public.ii_shipments(id),
  supplier_id bigint references public.ii_suppliers(id),
  part_number_id bigint references public.ii_part_numbers(id),
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  currency text not null default '',
  net_weight_kg numeric,
  gross_weight_kg numeric,
  cbm numeric,
  package_type text not null default '',
  value_kind text not null default 'Confirmed / Document Value',
  customs_value numeric not null default 0,
  payable_value numeric not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_supplier_part_history (
  id bigserial primary key,
  supplier_id bigint not null references public.ii_suppliers(id),
  part_number_id bigint not null references public.ii_part_numbers(id),
  shipment_id bigint references public.ii_shipments(id),
  invoice_id bigint references public.ii_commercial_invoices(id),
  invoice_item_id bigint references public.ii_invoice_items(id),
  source_date date,
  source_invoice text not null default '',
  unit_price numeric,
  currency text not null default '',
  net_weight_kg numeric,
  gross_weight_kg numeric,
  cbm numeric,
  package_type text not null default '',
  value_kind text not null default 'Confirmed / Document Value',
  created_at timestamptz not null default now()
);

create table if not exists public.ii_monthly_exchange_rates (
  id bigserial primary key,
  month text not null unique,
  usd_brl numeric not null default 0,
  eur_brl numeric not null default 0,
  gbp_brl numeric not null default 0,
  sek_brl numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_shipment_costs (
  id bigserial primary key,
  shipment_id bigint not null references public.ii_shipments(id) on delete cascade,
  cost_type text not null default 'Estimated Cost',
  description text not null default '',
  currency text not null default '',
  amount numeric not null default 0,
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_free_time_rules (
  id bigserial primary key,
  equipment text not null,
  free_time_days integer not null default 0,
  alert_days_before integer not null default 3,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipment)
);

create table if not exists public.ii_consolidation_shipments (
  id bigserial primary key,
  consolidation_id bigint not null references public.ii_consolidations(id) on delete cascade,
  shipment_id bigint not null references public.ii_shipments(id) on delete cascade,
  managed_fields text not null default 'cfs,pol,pod,eta,etd,atd,ata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consolidation_id, shipment_id)
);

create table if not exists public.ii_timeline_events (
  id bigserial primary key,
  entity text not null,
  entity_id bigint not null,
  field_name text not null default '',
  previous_value text not null default '',
  new_value text not null default '',
  actor_email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ii_invoice_items_supplier_pn_idx
  on public.ii_invoice_items (supplier_id, part_number_id);

create index if not exists ii_supplier_part_history_lookup_idx
  on public.ii_supplier_part_history (supplier_id, part_number_id, source_date desc);

create index if not exists ii_timeline_events_entity_idx
  on public.ii_timeline_events (entity, entity_id, created_at desc);
