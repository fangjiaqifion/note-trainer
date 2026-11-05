-- Administrator-only archival repair. Restoring data never reactivates expired capabilities.
begin;
create or replace function nt_private.restore_snapshot(data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare w uuid; row jsonb;
begin
 if data->>'app' is distinct from 'note-trainer-cloud' or data->>'version' is distinct from '1'
 or jsonb_typeof(data->'students') is distinct from 'array' or jsonb_typeof(data->'events') is distinct from 'array' or jsonb_typeof(data->'codes') is distinct from 'array' then raise exception 'invalid archive'; end if;
 w:=(data->'workspace'->>'id')::uuid;
 if w is null or exists(select 1 from public.nt_cloud_workspaces where id=w) then raise exception 'restore requires an absent workspace; never overwrites live data'; end if;
 insert into public.nt_cloud_workspaces(id,created_at) values(w,(data->'workspace'->>'created_at')::timestamptz);
 for row in select value from jsonb_array_elements(data->'students') loop
  if row->>'workspace_id' is distinct from w::text then raise exception 'workspace mismatch'; end if;
  insert into public.nt_cloud_students(id,workspace_id,local_id,code,state,revision,updated_at)
  values((row->>'id')::uuid,w,row->>'local_id',row->>'code',row->'state',(row->>'revision')::bigint,(row->>'updated_at')::timestamptz);
 end loop;
 for row in select value from jsonb_array_elements(data->'events') loop
  if not exists(select 1 from public.nt_cloud_students where id=(row->>'student_id')::uuid and workspace_id=w) then raise exception 'student mismatch'; end if;
  insert into public.nt_cloud_events(student_id,event_id,payload,received_at) values((row->>'student_id')::uuid,(row->>'event_id')::uuid,row->'payload',(row->>'received_at')::timestamptz);
 end loop;
 for row in select value from jsonb_array_elements(data->'codes') loop
  if row->>'workspace_id' is distinct from w::text then raise exception 'workspace mismatch'; end if;
  insert into nt_private.codes(id,workspace_id,student_id,role,hash,revoked,expires_at,created_at)
  values((row->>'id')::uuid,w,(row->>'student_id')::uuid,row->>'role',decode(row->>'hash','hex'),(row->>'revoked')::boolean,(row->>'expires_at')::timestamptz,(row->>'created_at')::timestamptz);
 end loop;
 return w;
end $$;
revoke all on function nt_private.restore_snapshot(jsonb) from public,anon,authenticated;
commit;
