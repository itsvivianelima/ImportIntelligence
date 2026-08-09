alter table public.ii_suppliers
  add column if not exists address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state_province text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists continent text not null default '',
  add column if not exists default_currency text not null default '',
  add column if not exists default_incoterm_air text not null default '',
  add column if not exists default_incoterm_lcl text not null default '',
  add column if not exists default_incoterm_fcl text not null default '',
  add column if not exists contact_name text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists contact_phone text not null default '';

alter table public.ii_agents
  add column if not exists contact_name text not null default '',
  add column if not exists payment_days integer not null default 0,
  add column if not exists payment_terms text not null default '',
  add column if not exists service_air boolean not null default false,
  add column if not exists service_lcl boolean not null default false,
  add column if not exists service_fcl boolean not null default false,
  add column if not exists service_courier boolean not null default false;

alter table public.ii_part_numbers
  add column if not exists ncm_reviewed_at date,
  add column if not exists unit_of_measure text not null default '';

alter table public.ii_demands
  add column if not exists reference text not null default '',
  add column if not exists unit_of_measure text not null default '',
  add column if not exists readiness_date date,
  add column if not exists modine_deadline date,
  add column if not exists demand_type text not null default 'Matéria Prima',
  add column if not exists linked_quantity numeric not null default 0,
  add column if not exists shipped_quantity numeric not null default 0,
  add column if not exists excess_quantity numeric not null default 0,
  add column if not exists manually_closed boolean not null default false;

alter table public.ii_shipments
  add column if not exists reference text not null default '',
  add column if not exists clearance_type text not null default '',
  add column if not exists tariff_type text not null default '',
  add column if not exists deadline date,
  add column if not exists booking_number text not null default '',
  add column if not exists vessel text not null default '',
  add column if not exists pcd_is_set boolean not null default false,
  add column if not exists operational_deviation boolean not null default false,
  add column if not exists stock_entry_date date,
  add column if not exists hbl_awb text not null default '',
  add column if not exists hbl_awb_date date;

alter table public.ii_freight_contracts
  add column if not exists total_equipment integer not null default 0,
  add column if not exists notes text not null default '';

alter table public.ii_public_rates
  add column if not exists container_type text not null default 'Todos',
  add column if not exists agent_id bigint references public.ii_agents(id);

alter table public.ii_surcharges
  add column if not exists agent_id bigint references public.ii_agents(id),
  add column if not exists valid_from date,
  add column if not exists valid_to date,
  add column if not exists container_type text not null default '',
  add column if not exists pol text not null default '',
  add column if not exists pod text not null default '';

alter table public.ii_packages
  add column if not exists package_identification text not null default '',
  add column if not exists dimension_unit text not null default 'CM',
  add column if not exists stackable boolean not null default false,
  add column if not exists stacking_levels integer not null default 0;

alter table public.ii_containers
  add column if not exists package_quantity integer not null default 0,
  add column if not exists cbm numeric not null default 0,
  add column if not exists gross_weight_kg numeric not null default 0,
  add column if not exists free_time_deadline date;

create table if not exists public.ii_supplier_part_numbers (
  id bigserial primary key,
  supplier_id bigint not null references public.ii_suppliers(id),
  part_number_id bigint not null references public.ii_part_numbers(id),
  last_real_unit_price numeric,
  currency text not null default '',
  last_real_net_weight_kg numeric,
  last_real_gross_weight_kg numeric,
  last_real_cbm numeric,
  package_type text not null default '',
  source_invoice text not null default '',
  source_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, part_number_id)
);

create table if not exists public.ii_shipment_demands (
  id bigserial primary key,
  shipment_id bigint not null references public.ii_shipments(id) on delete cascade,
  demand_id bigint not null references public.ii_demands(id),
  quantity numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shipment_id, demand_id)
);

create unique index if not exists ii_suppliers_name_key
  on public.ii_suppliers (lower(btrim(name)));

create unique index if not exists ii_locations_kind_code_key
  on public.ii_locations (kind, lower(btrim(code)));
