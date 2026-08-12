create table if not exists public.shipment_documents (
  id bigserial primary key,
  shipment_id bigint not null references public.ii_shipments(id) on delete cascade,
  document_type text not null default 'Other',
  document_number text not null default '',
  document_date date,
  file_name text not null default '',
  storage_path text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipment_documents_shipment_idx
  on public.shipment_documents (shipment_id, document_type, created_at desc);
