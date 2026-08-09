alter table public.ii_audit_events
  add column if not exists field_name text not null default '',
  add column if not exists previous_value text not null default '',
  add column if not exists new_value text not null default '',
  add column if not exists notes text not null default '';

alter table public.ii_shipment_demands
  add column if not exists notes text not null default '';

create index if not exists ii_shipment_demands_demand_id_idx
  on public.ii_shipment_demands (demand_id);

create index if not exists ii_shipment_demands_shipment_id_idx
  on public.ii_shipment_demands (shipment_id);

create index if not exists ii_audit_events_entity_idx
  on public.ii_audit_events (entity, entity_id, created_at desc);
