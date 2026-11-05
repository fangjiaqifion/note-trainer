-- Teacher-owned display labels stay separate from deidentified research records.
begin;
create table nt_private.student_labels (
 student_id uuid primary key references public.nt_cloud_students(id),
 display_name text not null check(length(display_name) between 1 and 12),
 color text not null check(color ~ '^#[a-fA-F0-9]{6}$')
);
alter table nt_private.student_labels enable row level security;
revoke all on nt_private.student_labels from public,anon,authenticated;
create function public.nt_cloud_label(s uuid,display_name text,color text) returns void
language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.nt_cloud_students where id=s;
 if w is null or not nt_private.can(w,null,true,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 if display_name is null or length(display_name) not between 1 and 12 or color is null or color !~ '^#[a-fA-F0-9]{6}$' then raise exception 'invalid student label'; end if;
 insert into nt_private.student_labels values(s,display_name,color)
 on conflict(student_id) do update set display_name=excluded.display_name,color=excluded.color
 where nt_private.student_labels.display_name is distinct from excluded.display_name or nt_private.student_labels.color is distinct from excluded.color;
end $$;
create function public.nt_cloud_labels(w uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from nt_private.student_labels l
 join public.nt_cloud_students s on s.id=l.student_id where s.workspace_id=w
 and (nt_private.can(w,null,true,true) or
 (nt_private.can(w,s.id) and exists(select 1 from nt_private.members m where m.user_id=auth.uid() and m.workspace_id=w and m.student_id=s.id and m.role='learner' and not m.revoked)))
$$;
revoke all on function public.nt_cloud_label(uuid,text,text),public.nt_cloud_labels(uuid) from public,anon,authenticated;
grant execute on function public.nt_cloud_label(uuid,text,text),public.nt_cloud_labels(uuid) to authenticated;
create or replace function public.nt_cloud_backup(w uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare n bigint; bytes bigint;
begin
 if not nt_private.can(w,null,true,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 if not exists(select 1 from nt_private.codes where workspace_id=w and role='teacher' and not revoked and expires_at>now()) then raise exception 'create teacher recovery code before backup'; end if;
 select count(*),coalesce(sum(octet_length(e.payload::text)),0) into n,bytes from public.nt_cloud_events e join public.nt_cloud_students s on s.id=e.student_id where s.workspace_id=w;
 if n>50000 or bytes>26214400 then raise exception 'backup exceeds browser limit; administrator database dump required' using errcode='54000'; end if;
 -- STABLE uses the calling statement's single MVCC snapshot across all these reads.
 return jsonb_build_object('app','note-trainer-cloud','version',1,'exportedAt',now(),
  'workspace',(select to_jsonb(x) from public.nt_cloud_workspaces x where x.id=w),
  'students',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.nt_cloud_students s where s.workspace_id=w),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.cursor) from public.nt_cloud_events e join public.nt_cloud_students s on s.id=e.student_id where s.workspace_id=w),'[]'::jsonb),
  'student_labels',coalesce((select jsonb_agg(to_jsonb(l)) from nt_private.student_labels l join public.nt_cloud_students s on s.id=l.student_id where s.workspace_id=w),'[]'::jsonb),
  'portal_teacher',(select to_jsonb(t)-'initial_user'-'initial_hash'-'invite_id'-'note' from nt_private.portal_teachers t where t.workspace_id=w),
  'codes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'workspace_id',c.workspace_id,'student_id',c.student_id,'role',c.role,'hash',encode(c.hash,'hex'),'revoked',c.revoked,'expires_at',c.expires_at,'created_at',c.created_at)) from nt_private.codes c where c.workspace_id=w),'[]'::jsonb));
end $$;
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
 if data->'portal_teacher' is not null and data->'portal_teacher'<>'null'::jsonb then
  row:=data->'portal_teacher';
  if row->>'workspace_id' is distinct from w::text then raise exception 'teacher workspace mismatch'; end if;
  insert into nt_private.portal_teachers(id,username,workspace_id,enabled,note,created_at,last_login)
  values((row->>'id')::uuid,row->>'username',w,(row->>'enabled')::boolean,coalesce(row->>'note',''),(row->>'created_at')::timestamptz,(row->>'last_login')::timestamptz);
 end if;
 if data ? 'student_labels' then
  if jsonb_typeof(data->'student_labels')<>'array' then raise exception 'invalid student labels'; end if;
  for row in select value from jsonb_array_elements(data->'student_labels') loop
   if not exists(select 1 from public.nt_cloud_students where id=(row->>'student_id')::uuid and workspace_id=w) then raise exception 'student label workspace mismatch'; end if;
   insert into nt_private.student_labels(student_id,display_name,color) values((row->>'student_id')::uuid,row->>'display_name',row->>'color');
  end loop;
 end if;
 return w;
end $$;


commit;
