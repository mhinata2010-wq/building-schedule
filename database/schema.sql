-- Proposed schema, NOT applied to a live Supabase project.
-- Owner-only MVP; project-level sharing requires a separate authorization model.
create table if not exists public.user_schedules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  document jsonb not null default '{"tasks":[],"project":{},"ranks":[]}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint document_is_object check (jsonb_typeof(document) = 'object')
);
alter table public.user_schedules enable row level security;
revoke all on public.user_schedules from anon;
grant select, insert, update on public.user_schedules to authenticated;

create policy "Read own schedule"
on public.user_schedules for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Create own schedule"
on public.user_schedules for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Update own schedule"
on public.user_schedules for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Atomic, revision-checked update: the last tab does not silently overwrite another.
create or replace function public.save_my_schedule(
  expected_revision bigint,
  next_document jsonb
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare new_revision bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if jsonb_typeof(next_document) <> 'object'
     or jsonb_typeof(next_document->'tasks') <> 'array' then
    raise exception 'Invalid schedule document' using errcode = '22023';
  end if;
  update public.user_schedules as s
     set document = next_document,
         revision = s.revision + 1,
         updated_at = now()
   where s.user_id = (select auth.uid())
     and s.revision = expected_revision
   returning s.revision into new_revision;
  if new_revision is null then
    raise exception 'Schedule changed remotely. Reload and resolve conflicts.'
      using errcode = 'P0001';
  end if;
  return new_revision;
end
$$;
revoke all on function public.save_my_schedule(bigint,jsonb) from public, anon;
grant execute on function public.save_my_schedule(bigint,jsonb) to authenticated;
