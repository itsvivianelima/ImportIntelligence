create table if not exists public.ii_suppliers (
  id bigserial primary key,
  code text not null,
  name text not null,
  country text not null default '',
  tin text not null default '',
  default_pol text not null default '',
  default_cfs text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_requesters (
  id bigserial primary key,
  name text not null,
  email text not null default '',
  department text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_agents (
  id bigserial primary key,
  name text not null,
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_locations (
  id bigserial primary key,
  kind text not null,
  code text not null,
  name text not null,
  country text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_part_numbers (
  id bigserial primary key,
  supplier_id bigint references public.ii_suppliers(id),
  part_number text not null,
  description text not null default '',
  ncm text not null default '',
  material_type text not null default 'Matéria Prima',
  net_weight_kg numeric not null default 0,
  cbm numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_demands (
  id bigserial primary key,
  demand_number text not null,
  requester_id bigint references public.ii_requesters(id),
  supplier_id bigint references public.ii_suppliers(id),
  part_number_id bigint references public.ii_part_numbers(id),
  required_date date,
  requested_quantity numeric not null default 0,
  fulfilled_quantity numeric not null default 0,
  status text not null default 'OPEN',
  forecast_modal text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_shipments (
  id bigserial primary key,
  shipment_number text not null,
  supplier_id bigint references public.ii_suppliers(id),
  agent_id bigint references public.ii_agents(id),
  modal text not null default 'LCL',
  shipment_type text not null default 'Matéria Prima',
  incoterm text not null default '',
  cfs text not null default '',
  pol text not null default '',
  pod text not null default '',
  quotation_date date,
  green_light_date date,
  cargo_ready_date date,
  pickup_scheduled_date date,
  pickup_confirmed_date date,
  booking_confirmed_date date,
  etd date,
  atd date,
  initial_eta date,
  eta date,
  ata date,
  pcd date,
  delivery_date date,
  status text not null default 'PLANNED',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_commercial_invoices (
  id bigserial primary key,
  shipment_id bigint references public.ii_shipments(id),
  invoice_number text not null,
  currency text not null default 'USD',
  amount numeric not null default 0,
  payment_terms text not null default '',
  ddl_date date,
  risk text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_packages (
  id bigserial primary key,
  shipment_id bigint references public.ii_shipments(id),
  package_type text not null default '',
  quantity integer not null default 0,
  length_cm numeric not null default 0,
  width_cm numeric not null default 0,
  height_cm numeric not null default 0,
  cbm numeric not null default 0,
  gross_weight_kg numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_containers (
  id bigserial primary key,
  shipment_id bigint references public.ii_shipments(id),
  container_number text not null,
  equipment text not null default '',
  seal text not null default '',
  free_time_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_consolidations (
  id bigserial primary key,
  consolidation_number text not null,
  cfs text not null default '',
  pol text not null default '',
  pod text not null default '',
  closing_date date,
  eta date,
  status text not null default 'OPEN',
  total_cbm numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_freight_contracts (
  id bigserial primary key,
  contract_number text not null,
  carrier text not null,
  modal text not null default '',
  pol text not null default 'ALL',
  pod text not null default 'ALL',
  equipment text not null default '',
  currency text not null default 'USD',
  rate numeric not null default 0,
  valid_from date,
  valid_to date,
  used_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_public_rates (
  id bigserial primary key,
  carrier text not null,
  modal text not null default '',
  pol text not null default 'ALL',
  pod text not null default 'ALL',
  currency text not null default 'USD',
  rate numeric not null default 0,
  charging_basis text not null default 'W/M',
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_surcharges (
  id bigserial primary key,
  name text not null,
  modal text not null default '',
  currency text not null default 'USD',
  amount numeric not null default 0,
  charging_basis text not null default '',
  comparable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_exchange_rates (
  id bigserial primary key,
  rate_date date not null,
  from_currency text not null,
  to_currency text not null default 'BRL',
  rate numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ii_audit_events (
  id bigserial primary key,
  entity text not null,
  entity_id bigint not null,
  action text not null,
  actor_email text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ii_app_users (
  id bigserial primary key,
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  password_salt text not null,
  role text not null default 'ADMIN',
  created_at timestamptz not null default now()
);

create table if not exists public.ii_app_sessions (
  id bigserial primary key,
  user_id bigint not null references public.ii_app_users(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

insert into public.ii_app_users (email, display_name, password_hash, password_salt, role)
select
  'itsvivianelima@icloud.com',
  'Viviane Lima',
  'a2bc72f953d021fe49631e0b2d362a4eaa0772e1f7326f25f1bfa4f32ad94d38',
  '2d03c3fe07797921bdc90036a8ac2e2f',
  'ADMIN'
where not exists (select 1 from public.ii_app_users);
