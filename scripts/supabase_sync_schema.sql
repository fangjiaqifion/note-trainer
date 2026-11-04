-- Synthetic test project only. Apply after review; this is not a production deployment.
-- Each authenticated installation can access only its own append-only records.
create table public.nt_sync_events (
  owner_id uuid not null default auth.uid(),
  event_id text not null check (length(event_id) between 1 and 200),
  participant_id text not null check (length(participant_id) between 1 and 120),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 8192),
  received_at timestamptz not null default now(),
  primary key (owner_id, event_id)
);
alter table public.nt_sync_events enable row level security;
revoke all on public.nt_sync_events from public, anon, authenticated;
grant select, insert on public.nt_sync_events to authenticated;
create policy nt_sync_read_own on public.nt_sync_events for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy nt_sync_insert_own on public.nt_sync_events for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create function public.nt_sync_batch(items jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare item jsonb; existing public.nt_sync_events%rowtype; ids jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 50 then
    raise exception 'invalid batch';
  end if;
  for item in select value from jsonb_array_elements(items) loop
    insert into public.nt_sync_events(event_id, participant_id, payload)
    values (item->>'id', item->>'participant_id', item->'payload')
    on conflict (owner_id, event_id) do nothing;
    select * into existing from public.nt_sync_events
      where owner_id = auth.uid() and event_id = item->>'id';
    if existing.participant_id is distinct from item->>'participant_id'
       or existing.payload is distinct from item->'payload' then
      raise exception 'event id conflict';
    end if;
    ids := ids || jsonb_build_array(item->>'id');
  end loop;
  return ids;
end $$;
revoke all on function public.nt_sync_batch(jsonb) from public, anon;
grant execute on function public.nt_sync_batch(jsonb) to authenticated;
