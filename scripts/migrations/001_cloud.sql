-- Additive migration. Does not read or alter nt_sync_events or existing local profiles.
-- Enrolment is closed until an administrator provisions a one-time bootstrap hash.
begin;
create schema if not exists nt_private;
revoke all on schema nt_private from public, anon, authenticated;
grant usage on schema nt_private to authenticated;

create table public.nt_cloud_workspaces (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now()
);
create table public.nt_cloud_students (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.nt_cloud_workspaces(id),
 local_id text not null check (length(local_id) between 1 and 120),
 code text not null check (code ~ '^[A-Za-z0-9_-]{1,40}$'),
 state jsonb not null default '{}'::jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 unique(workspace_id,local_id), unique(workspace_id,code), unique(workspace_id,id),
 check (jsonb_typeof(state)='object' and octet_length(state::text)<=524288 and not state ? 'events')
);
create table nt_private.codes (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.nt_cloud_workspaces(id),
 student_id uuid, role text not null check(role in ('teacher','learner','researcher')),
 hash bytea not null unique, revoked boolean not null default false,
 expires_at timestamptz not null, created_at timestamptz not null default now(),
 foreign key(workspace_id,student_id) references public.nt_cloud_students(workspace_id,id),
 check((role='learner')=(student_id is not null))
);
create table nt_private.members (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.nt_cloud_workspaces(id),
 user_id uuid not null references auth.users(id), role text not null check(role in ('teacher','learner','researcher')),
 student_id uuid, code_id uuid references nt_private.codes(id), revoked boolean not null default false,
 foreign key(workspace_id,student_id) references public.nt_cloud_students(workspace_id,id),
 unique nulls not distinct(workspace_id,user_id,role,student_id,code_id),
 check((role='learner')=(student_id is not null))
);
create index on nt_private.members(user_id,workspace_id);
create table nt_private.bootstrap (
 hash bytea primary key, expires_at timestamptz not null, workspace_id uuid references public.nt_cloud_workspaces(id)
);
create table nt_private.usage (
 student_id uuid not null references public.nt_cloud_students(id), day date not null, used integer not null,
 primary key(student_id,day), check(used between 0 and 20000)
);
create table public.nt_cloud_events (
 cursor bigint generated always as identity unique,
 student_id uuid not null references public.nt_cloud_students(id),
 event_id uuid not null, payload jsonb not null,
 received_at timestamptz not null default now(), primary key(student_id,event_id),
 check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=8192)
);
create index on public.nt_cloud_events(student_id,cursor);

create function nt_private.can(w uuid,s uuid default null,write_access boolean default false,teacher_only boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from nt_private.members m left join nt_private.codes c on c.id=m.code_id
 where m.user_id=(select auth.uid()) and m.workspace_id=w and not m.revoked
 and (m.code_id is null or (not c.revoked and c.expires_at>now()))
 and (m.role='teacher' or (not teacher_only and ((m.role='learner' and m.student_id=s) or (m.role='researcher' and not write_access)))))
$$;
revoke all on function nt_private.can(uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function nt_private.can(uuid,uuid,boolean,boolean) to authenticated;

alter table public.nt_cloud_workspaces enable row level security;
alter table public.nt_cloud_students enable row level security;
alter table public.nt_cloud_events enable row level security;
alter table nt_private.codes enable row level security;
alter table nt_private.members enable row level security;
alter table nt_private.bootstrap enable row level security;
alter table nt_private.usage enable row level security;
revoke all on all tables in schema nt_private from public,anon,authenticated;
revoke all on public.nt_cloud_workspaces,public.nt_cloud_students,public.nt_cloud_events from public,anon,authenticated;
grant select on public.nt_cloud_workspaces,public.nt_cloud_students,public.nt_cloud_events to authenticated;
create policy cloud_workspaces_read on public.nt_cloud_workspaces for select to authenticated using(nt_private.can(id));
create policy cloud_students_read on public.nt_cloud_students for select to authenticated using(nt_private.can(workspace_id,id));
create policy cloud_events_read on public.nt_cloud_events for select to authenticated using(exists(
 select 1 from public.nt_cloud_students s where s.id=student_id and nt_private.can(s.workspace_id,s.id)));

create function public.nt_cloud_create(bootstrap_code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare b nt_private.bootstrap%rowtype; w uuid;
begin
 if auth.uid() is null or bootstrap_code is null or length(bootstrap_code)<>64 then raise exception 'unauthorized' using errcode='42501'; end if;
 select * into b from nt_private.bootstrap where hash=sha256(convert_to(bootstrap_code,'UTF8')) for update;
 if not found or b.expires_at<=now() then raise exception 'invalid enrolment' using errcode='42501'; end if;
 -- Lost response retries only work for the identity that originally consumed this code.
 if b.workspace_id is not null then
  if not nt_private.can(b.workspace_id,null,true,true) then raise exception 'enrolment consumed' using errcode='42501'; end if;
  return b.workspace_id;
 end if;
 insert into public.nt_cloud_workspaces default values returning id into w;
 insert into nt_private.members(workspace_id,user_id,role) values(w,auth.uid(),'teacher');
 update nt_private.bootstrap set workspace_id=w where hash=b.hash;
 return w;
end $$;

create function public.nt_cloud_claim(recovery_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c nt_private.codes%rowtype;
begin
 if auth.uid() is null or recovery_code is null or length(recovery_code)<>64 then raise exception 'unauthorized' using errcode='42501'; end if;
 select * into c from nt_private.codes where hash=sha256(convert_to(recovery_code,'UTF8')) for update;
 if not found or c.revoked or c.expires_at<=now() then raise exception 'invalid recovery code' using errcode='42501'; end if;
 if (select count(*) from nt_private.members where code_id=c.id and not revoked)>=10 and not exists(select 1 from nt_private.members where code_id=c.id and user_id=auth.uid() and not revoked) then
  raise exception 'device limit reached' using errcode='42501';
 end if;
 insert into nt_private.members(workspace_id,user_id,role,student_id,code_id)
 values(c.workspace_id,auth.uid(),c.role,c.student_id,c.id)
 on conflict(workspace_id,user_id,role,student_id,code_id) do update set revoked=false;
 return jsonb_build_object('workspace',c.workspace_id,'role',c.role,'student',c.student_id);
end $$;

create function public.nt_cloud_issue(w uuid,s uuid,access_role text,code_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not nt_private.can(w,null,true,true) or access_role not in ('teacher','learner','researcher')
 or code_hash is null or code_hash !~ '^[a-f0-9]{64}$' or ((access_role='learner')<>(s is not null)) then
  raise exception 'unauthorized' using errcode='42501'; end if;
 -- Idempotent retries return the same grant; plaintext codes are never stored.
 insert into nt_private.codes(workspace_id,student_id,role,hash,expires_at)
 values(w,s,access_role,decode(code_hash,'hex'),now()+interval '1 year') on conflict(hash) do nothing;
 select id into result from nt_private.codes where hash=decode(code_hash,'hex') and workspace_id=w and student_id is not distinct from s and role=access_role and not revoked;
 if result is null then raise exception 'code conflict'; end if;
 return result;
end $$;
create function public.nt_cloud_codes(w uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not nt_private.can(w,null,true,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'role',c.role,'student',c.student_id,'revoked',c.revoked,'expires',c.expires_at)) from nt_private.codes c where c.workspace_id=w),'[]'::jsonb);
end $$;
create function public.nt_cloud_revoke(code_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from nt_private.codes where id=code_id;
 if w is null or not nt_private.can(w,null,true,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 update nt_private.codes set revoked=true where id=code_id;
end $$;

create function public.nt_cloud_add_student(w uuid,local_key text,participant_code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not nt_private.can(w,null,true,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 perform 1 from public.nt_cloud_workspaces where id=w for update;
 if (select count(*) from public.nt_cloud_students where workspace_id=w)>=500 and not exists(select 1 from public.nt_cloud_students s where s.workspace_id=w and s.local_id=local_key) then raise exception 'roster limit'; end if;
 insert into public.nt_cloud_students(workspace_id,local_id,code) values(w,local_key,participant_code)
 on conflict(workspace_id,local_id) do nothing;
 select s.id into result from public.nt_cloud_students s where s.workspace_id=w and s.local_id=local_key;
 return result;
end $$;

create function public.nt_cloud_save(s uuid,expected_revision bigint,new_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare student public.nt_cloud_students%rowtype;
begin
 select * into student from public.nt_cloud_students where id=s for update;
 if not found or not nt_private.can(student.workspace_id,s,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 if (new_state->>'v') is distinct from '3' or
 jsonb_typeof(new_state->'progress') is distinct from 'object' or jsonb_typeof(new_state->'stars') is distinct from 'object' or
 jsonb_typeof(new_state->'selected') is distinct from 'array' or jsonb_typeof(new_state->'autoHistory') is distinct from 'array' or
 (new_state->'battery' is distinct from 'null'::jsonb and (jsonb_typeof(new_state->'battery') is distinct from 'object' or jsonb_typeof(new_state->'battery'->'items') is distinct from 'array')) or
 jsonb_typeof(new_state) is distinct from 'object' or octet_length(new_state::text)>524288 or
 exists(select 1 from jsonb_object_keys(new_state) k where k not in ('v','layout','stars','progress','selected','spot','focus','lastSeen','eventSeq','practiceSeq','autoHistory','battery','level7','legacyE4','createdAt','updatedAt','sound','speech','labels','decor','difficulty','autoLevel')) then raise exception 'invalid state'; end if;
 -- A lost successful response can be retried without manufacturing a conflict.
 if student.state=new_state then return jsonb_build_object('revision',student.revision,'state',student.state,'conflict',false); end if;
 if student.revision<>expected_revision then return jsonb_build_object('revision',student.revision,'state',student.state,'conflict',true); end if;
 update public.nt_cloud_students set state=new_state,revision=revision+1,updated_at=now() where id=s returning * into student;
 return jsonb_build_object('revision',student.revision,'state',student.state,'conflict',false);
end $$;

create function public.nt_cloud_batch(s uuid,items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare student public.nt_cloud_students%rowtype; item jsonb; prior jsonb; ids jsonb:='[]'; added integer:=0;
begin
 select * into student from public.nt_cloud_students where id=s for update;
 if not found or not nt_private.can(student.workspace_id,s,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>50 then raise exception 'invalid batch'; end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item->'payload') is distinct from 'object' or
   exists(select 1 from jsonb_object_keys(item->'payload') k where k not in ('id','seq','pseq','t','sid','mode','phase','battery','skill','kind','note','letter','value','clef','spot','relation','staffY1','staffY2','higher','ask','target','pair','chosen','diff','first','wrong','ms')) then raise exception 'invalid payload'; end if;
  insert into public.nt_cloud_events(student_id,event_id,payload) values(s,(item->>'id')::uuid,item->'payload') on conflict do nothing;
  if found then added:=added+1; end if;
  select payload into prior from public.nt_cloud_events where student_id=s and event_id=(item->>'id')::uuid;
  if prior is distinct from item->'payload' then raise exception 'event conflict'; end if;
  ids:=ids||jsonb_build_array(item->>'id');
 end loop;
 if added>0 then
  insert into nt_private.usage(student_id,day,used) values(s,current_date,added)
  on conflict(student_id,day) do update set used=nt_private.usage.used+excluded.used;
 end if;
 return ids;
end $$;

create function public.nt_cloud_devices(w uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not nt_private.can(w,null,true,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'student',m.student_id,'revoked',m.revoked,'current',m.user_id=auth.uid())) from nt_private.members m where m.workspace_id=w),'[]'::jsonb);
end $$;
create function public.nt_cloud_revoke_device(member_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from nt_private.members where id=member_id;
 if w is null or not nt_private.can(w,null,true,true) then raise exception 'unauthorized' using errcode='42501'; end if;
 update nt_private.members set revoked=true where id=member_id;
end $$;
create function public.nt_cloud_backup(w uuid) returns jsonb
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
  'codes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'workspace_id',c.workspace_id,'student_id',c.student_id,'role',c.role,'hash',encode(c.hash,'hex'),'revoked',c.revoked,'expires_at',c.expires_at,'created_at',c.created_at)) from nt_private.codes c where c.workspace_id=w),'[]'::jsonb));
end $$;
-- Restore is an administrator operation only. Never executable through the public API.
create function nt_private.restore_snapshot(data jsonb) returns uuid
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
 if not exists(select 1 from nt_private.codes where workspace_id=w and role='teacher' and not revoked and expires_at>now()) then raise exception 'no usable teacher recovery code'; end if;
 return w;
end $$;
revoke all on function nt_private.restore_snapshot(jsonb) from public,anon,authenticated;
revoke all on function public.nt_cloud_devices(uuid),public.nt_cloud_revoke_device(uuid),public.nt_cloud_backup(uuid) from public,anon,authenticated;
grant execute on function public.nt_cloud_devices(uuid),public.nt_cloud_revoke_device(uuid),public.nt_cloud_backup(uuid) to authenticated;

-- Only the reviewed RPC signatures are exposed. Direct table mutation remains forbidden.
revoke all on function public.nt_cloud_create(text),public.nt_cloud_claim(text),public.nt_cloud_issue(uuid,uuid,text,text),public.nt_cloud_codes(uuid),public.nt_cloud_revoke(uuid),public.nt_cloud_add_student(uuid,text,text),public.nt_cloud_save(uuid,bigint,jsonb),public.nt_cloud_batch(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.nt_cloud_create(text),public.nt_cloud_claim(text),public.nt_cloud_issue(uuid,uuid,text,text),public.nt_cloud_codes(uuid),public.nt_cloud_revoke(uuid),public.nt_cloud_add_student(uuid,text,text),public.nt_cloud_save(uuid,bigint,jsonb),public.nt_cloud_batch(uuid,jsonb) to authenticated;
commit;
