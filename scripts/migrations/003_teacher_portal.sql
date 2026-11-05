-- Additive portal migration. Existing workspaces and recovery packets remain valid.
begin;
create table nt_private.portal_admins (
 user_id uuid primary key references auth.users(id), enabled boolean not null default true,
 require_mfa_after timestamptz not null default now()
);
create table nt_private.portal_invites (
 id uuid primary key default gen_random_uuid(), hash bytea not null unique,
 note text not null default '' check(length(note)<=120),
 expires_at timestamptz not null, max_uses integer not null check(max_uses between 1 and 10000),
 used integer not null default 0 check(used>=0), enabled boolean not null default true,
 created_at timestamptz not null default now(), created_by uuid not null references auth.users(id),
 check(used<=max_uses)
);
create table nt_private.portal_teachers (
 id uuid primary key default gen_random_uuid(), username text not null unique,
 workspace_id uuid not null unique references public.nt_cloud_workspaces(id),
 invite_id uuid references nt_private.portal_invites(id),
 initial_user uuid unique references auth.users(id),
 initial_hash bytea, enabled boolean not null default true,
 note text not null default '' check(length(note)<=120),
 created_at timestamptz not null default now(), last_login timestamptz,
 check(username ~ '^[a-z0-9]{3,32}$')
);
create table nt_private.portal_attempts (
 bucket text primary key, starts_at timestamptz not null, uses integer not null
);
create table nt_private.portal_audit (
 id bigint generated always as identity primary key, actor uuid, action text not null,
 subject uuid, created_at timestamptz not null default now()
);
create table nt_private.portal_health(singleton boolean primary key default true check(singleton));
insert into nt_private.portal_health values(true);
alter table nt_private.portal_admins enable row level security;
alter table nt_private.portal_invites enable row level security;
alter table nt_private.portal_teachers enable row level security;
alter table nt_private.portal_attempts enable row level security;
alter table nt_private.portal_audit enable row level security;
alter table nt_private.portal_health enable row level security;
revoke all on all tables in schema nt_private from public,anon,authenticated;

create function nt_private.portal_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from nt_private.portal_admins a where a.user_id=auth.uid() and a.enabled
 and (nullif(current_setting('request.jwt.claims',true),'')::jsonb)->>'aal'='aal2'
 and exists(select 1 from jsonb_array_elements(coalesce((nullif(current_setting('request.jwt.claims',true),'')::jsonb)->'amr','[]'::jsonb)) m
 where m->>'method'='totp' and to_timestamp((m->>'timestamp')::double precision)>=a.require_mfa_after))
$$;
-- Return errors instead of raising after this counter, so rejected attempts are committed.
create function nt_private.portal_budget(subject text, ceiling integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into nt_private.portal_attempts(bucket,starts_at,uses) values(subject,date_trunc('hour',now()),1)
 on conflict(bucket) do update set starts_at=date_trunc('hour',now()),uses=case when nt_private.portal_attempts.starts_at<date_trunc('hour',now()) then 1 else nt_private.portal_attempts.uses+1 end
 returning uses into n;
 return n<=ceiling;
end $$;

create function public.nt_portal_register(invitation text, username text, secret_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i nt_private.portal_invites%rowtype; t nt_private.portal_teachers%rowtype; w uuid; h bytea; name text:=lower(username);
begin
 if auth.uid() is null then return jsonb_build_object('error','unauthorized'); end if;
 if not nt_private.portal_budget('register:'||auth.uid()::text,20) or not nt_private.portal_budget('register-global',500) then return jsonb_build_object('error','rate_limit'); end if;
 if name is null or name !~ '^[a-z0-9]{3,32}$' or secret_hash is null or secret_hash !~ '^[a-f0-9]{64}$' or invitation is null or invitation !~ '^[a-f0-9]{48}$' then return jsonb_build_object('error','invalid_registration'); end if;
 -- Serialize retries from one browser before consuming an invitation slot.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into t from nt_private.portal_teachers where initial_user=auth.uid();
 if found then
  if t.username<>name or t.initial_hash<>decode(secret_hash,'hex') or not t.enabled or not exists(select 1 from nt_private.codes c where c.workspace_id=t.workspace_id and c.hash=decode(secret_hash,'hex') and not c.revoked and c.expires_at>now()) then return jsonb_build_object('error','registration_exists'); end if;
  return jsonb_build_object('workspace',t.workspace_id,'role','teacher','student',null,'username',t.username);
 end if;
 select * into i from nt_private.portal_invites where hash=sha256(convert_to(invitation,'UTF8')) for update;
 if not found or not i.enabled or i.expires_at<=now() or i.used>=i.max_uses then return jsonb_build_object('error','invitation_unavailable'); end if;
 -- Serialize a requested username even across different invitations.
 perform pg_advisory_xact_lock(hashtextextended(name,1));
 if exists(select 1 from nt_private.portal_teachers p where p.username=name) then return jsonb_build_object('error','username_unavailable'); end if;
 h:=decode(secret_hash,'hex');
 if exists(select 1 from nt_private.codes where hash=h) then return jsonb_build_object('error','invalid_registration'); end if;
 insert into public.nt_cloud_workspaces default values returning id into w;
 insert into nt_private.portal_teachers(username,workspace_id,invite_id,initial_user,initial_hash,last_login) values(name,w,i.id,auth.uid(),h,now()) returning * into t;
 insert into nt_private.codes(workspace_id,role,hash,expires_at) values(w,'teacher',h,'infinity');
 -- Access is bound to a revocable credential from the first device onward.
 insert into nt_private.members(workspace_id,user_id,role,code_id) select w,auth.uid(),'teacher',id from nt_private.codes where hash=h;
 update nt_private.portal_invites set used=used+1 where id=i.id;
 insert into nt_private.portal_audit(actor,action,subject) values(auth.uid(),'teacher.register',t.id);
 return jsonb_build_object('workspace',w,'role','teacher','student',null,'username',name);
end $$;

create function public.nt_portal_login(username text,recovery_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t nt_private.portal_teachers%rowtype; a jsonb;
begin
 if auth.uid() is null then return jsonb_build_object('error','unauthorized'); end if;
 if not nt_private.portal_budget('login:'||auth.uid()::text,60) or not nt_private.portal_budget('login-global',3000) then return jsonb_build_object('error','rate_limit'); end if;
 if username is null or lower(username) !~ '^[a-z0-9]{3,32}$' or recovery_code is null or recovery_code !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid_login'); end if;
 select * into t from nt_private.portal_teachers p where p.username=lower(nt_portal_login.username) and p.enabled;
 if not found or not exists(select 1 from nt_private.codes c where c.workspace_id=t.workspace_id and c.role='teacher' and c.hash=sha256(convert_to(recovery_code,'UTF8')) and not c.revoked and c.expires_at>now()) then return jsonb_build_object('error','invalid_login'); end if;
 a:=public.nt_cloud_claim(recovery_code);
 update nt_private.portal_teachers set last_login=now() where id=t.id;
 return a||jsonb_build_object('username',t.username);
end $$;

-- Enforce suspension on every teacher operation, including already-issued JWTs.
create or replace function nt_private.can(w uuid,s uuid default null,write_access boolean default false,teacher_only boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from nt_private.members m left join nt_private.codes c on c.id=m.code_id
 where m.user_id=auth.uid() and m.workspace_id=w and not m.revoked
 and (m.code_id is null or (not c.revoked and c.expires_at>now()))
 and (m.role<>'teacher' or not exists(select 1 from nt_private.portal_teachers t where t.workspace_id=w and not t.enabled))
 and (m.role='teacher' or (not teacher_only and ((m.role='learner' and m.student_id=s) or (m.role='researcher' and not write_access)))))
$$;

create function public.nt_portal_admin_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not nt_private.portal_admin() then raise exception 'administrator authentication required' using errcode='42501'; end if;
 return jsonb_build_object(
 'invites',coalesce((select jsonb_agg(to_jsonb(i)-'hash' order by i.created_at desc) from nt_private.portal_invites i),'[]'::jsonb),
 'teachers',coalesce((select jsonb_agg(to_jsonb(t)-'initial_hash'-'initial_user' order by t.created_at desc) from nt_private.portal_teachers t),'[]'::jsonb));
end $$;
create function public.nt_portal_admin_setup() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from nt_private.portal_admins a where a.user_id=auth.uid() and a.enabled)
$$;
create function public.nt_portal_access(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select nt_private.can(w,null,true,true)
$$;
create function public.nt_portal_admin_invite(invite_hash text, note text, expires_at timestamptz, max_uses integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not nt_private.portal_admin() then raise exception 'administrator authentication required' using errcode='42501'; end if;
 if invite_hash is null or invite_hash !~ '^[a-f0-9]{64}$' or expires_at is null or expires_at<=now() or max_uses is null or max_uses not between 1 and 10000 or note is null or length(note)>120 then raise exception 'invalid invitation'; end if;
 -- Idempotent issue retry, without retaining plaintext invitations.
 insert into nt_private.portal_invites(hash,note,expires_at,max_uses,created_by) values(decode(invite_hash,'hex'),note,expires_at,max_uses,auth.uid()) on conflict(hash) do nothing;
 select id into result from nt_private.portal_invites i where hash=decode(invite_hash,'hex') and created_by=auth.uid();
 if result is null then raise exception 'invitation conflict'; end if;
 insert into nt_private.portal_audit(actor,action,subject) values(auth.uid(),'invite.issue',result);
 return result;
end $$;
create function public.nt_portal_admin_update_invite(invite_id uuid, enabled boolean, expires_at timestamptz, max_uses integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not nt_private.portal_admin() then raise exception 'administrator authentication required' using errcode='42501'; end if;
 if enabled is null or expires_at is null or max_uses is null or max_uses not between 1 and 10000 then raise exception 'invalid invitation'; end if;
 update nt_private.portal_invites i set enabled=nt_portal_admin_update_invite.enabled,expires_at=nt_portal_admin_update_invite.expires_at,max_uses=nt_portal_admin_update_invite.max_uses where i.id=invite_id and used<=nt_portal_admin_update_invite.max_uses;
 if not found then raise exception 'invitation missing or limit below usage'; end if;
 insert into nt_private.portal_audit(actor,action,subject) values(auth.uid(),'invite.update',invite_id);
end $$;
create function public.nt_portal_admin_teacher(teacher_id uuid,enabled boolean,note text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not nt_private.portal_admin() then raise exception 'administrator authentication required' using errcode='42501'; end if;
 if enabled is null or note is null or length(note)>120 then raise exception 'invalid teacher'; end if;
 update nt_private.portal_teachers t set enabled=nt_portal_admin_teacher.enabled,note=nt_portal_admin_teacher.note where id=teacher_id;
 if not found then raise exception 'teacher missing'; end if;
 insert into nt_private.portal_audit(actor,action,subject) values(auth.uid(),'teacher.update',teacher_id);
end $$;
create function public.nt_portal_admin_devices(teacher_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not nt_private.portal_admin() then raise exception 'administrator authentication required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'revoked',m.revoked)) from nt_private.members m join nt_private.portal_teachers t on t.workspace_id=m.workspace_id where t.id=teacher_id),'[]'::jsonb);
end $$;
create function public.nt_portal_admin_note(teacher_id uuid,note text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not nt_private.portal_admin() then raise exception 'administrator authentication required' using errcode='42501'; end if;
 if note is null or length(note)>120 then raise exception 'invalid note'; end if;
 update nt_private.portal_teachers t set note=nt_portal_admin_note.note where id=teacher_id;
 if not found then raise exception 'teacher missing'; end if;
 insert into nt_private.portal_audit(actor,action,subject) values(auth.uid(),'teacher.note',teacher_id);
end $$;
create function public.nt_portal_admin_revoke_device(member_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not nt_private.portal_admin() then raise exception 'administrator authentication required' using errcode='42501'; end if;
 update nt_private.members set revoked=true where id=member_id;
 if not found then raise exception 'device missing'; end if;
 insert into nt_private.portal_audit(actor,action,subject) values(auth.uid(),'device.revoke',member_id);
end $$;
create or replace function public.nt_cloud_issue(w uuid,s uuid,access_role text,code_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not nt_private.can(w,null,true,true) or access_role not in ('teacher','learner','researcher')
 or code_hash is null or code_hash !~ '^[a-f0-9]{64}$' or ((access_role='learner')<>(s is not null)) then
  raise exception 'unauthorized' using errcode='42501'; end if;
 -- Idempotent retries return the same grant; plaintext codes are never stored.
 insert into nt_private.codes(workspace_id,student_id,role,hash,expires_at)
 values(w,s,access_role,decode(code_hash,'hex'),case when access_role='teacher' and exists(select 1 from nt_private.portal_teachers t where t.workspace_id=w) then 'infinity'::timestamptz else now()+interval '1 year' end) on conflict(hash) do nothing;
 select id into result from nt_private.codes where hash=decode(code_hash,'hex') and workspace_id=w and student_id is not distinct from s and role=access_role and not revoked;
 if result is null then raise exception 'code conflict'; end if;
 return result;
end $$;
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
 return w;
end $$;

-- Owner-only maintenance: never exposed as a browser RPC.
create function nt_private.portal_reset_teacher(teacher_id uuid,new_hash text) returns void
language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 if new_hash is null or new_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid hash'; end if;
 select workspace_id into w from nt_private.portal_teachers where id=teacher_id for update;
 if not found then raise exception 'teacher missing'; end if;
 update nt_private.codes set revoked=true where workspace_id=w and role='teacher';
 update nt_private.members set revoked=true where workspace_id=w and role='teacher';
 insert into nt_private.codes(workspace_id,role,hash,expires_at) values(w,'teacher',decode(new_hash,'hex'),'infinity');
 insert into nt_private.portal_audit(action,subject) values('teacher.owner-reset',teacher_id);
end $$;
create function public.nt_portal_health() returns boolean language sql stable security definer set search_path='' as $$
 select singleton from nt_private.portal_health limit 1
$$;
revoke all on function nt_private.portal_admin(),nt_private.portal_budget(text,integer),nt_private.portal_reset_teacher(uuid,text) from public,anon,authenticated;
revoke all on function public.nt_portal_register(text,text,text),public.nt_portal_login(text,text),public.nt_portal_admin_list(),public.nt_portal_admin_invite(text,text,timestamptz,integer),public.nt_portal_admin_update_invite(uuid,boolean,timestamptz,integer),public.nt_portal_admin_teacher(uuid,boolean,text),public.nt_portal_admin_devices(uuid),public.nt_portal_admin_revoke_device(uuid),public.nt_portal_health() from public,anon,authenticated;
grant execute on function public.nt_portal_register(text,text,text),public.nt_portal_login(text,text),public.nt_portal_admin_list(),public.nt_portal_admin_invite(text,text,timestamptz,integer),public.nt_portal_admin_update_invite(uuid,boolean,timestamptz,integer),public.nt_portal_admin_teacher(uuid,boolean,text),public.nt_portal_admin_devices(uuid),public.nt_portal_admin_revoke_device(uuid) to authenticated;
grant execute on function public.nt_portal_health() to anon,authenticated;
revoke all on function public.nt_portal_admin_setup() from public,anon,authenticated;
grant execute on function public.nt_portal_admin_setup() to authenticated;
revoke all on function public.nt_portal_access(uuid) from public,anon,authenticated;
grant execute on function public.nt_portal_access(uuid) to authenticated;
revoke all on function public.nt_portal_admin_note(uuid,text) from public,anon,authenticated;
grant execute on function public.nt_portal_admin_note(uuid,text) to authenticated;
commit;
