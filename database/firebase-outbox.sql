-- Apply AFTER database/schema.sql, only to a configured Supabase project.
-- Server-side transactional outbox for Firestore mirror. Never expose this schema
-- to Supabase Data API or unauthenticated browser clients.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.schedule_mirror_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  revision bigint not null check (revision >= 0),
  document jsonb not null,
  created_at timestamptz not null default now(),
  mirrored_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  unique (user_id, revision)
);
revoke all on private.schedule_mirror_outbox from public, anon, authenticated;

-- Trigger is trusted server-owned code: fixed table, no user-supplied SQL,
-- narrow search_path, explicitly revoked direct execution.
create or replace function private.enqueue_schedule_mirror()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into private.schedule_mirror_outbox (user_id, revision, document)
  values (new.user_id, new.revision, new.document)
  on conflict (user_id, revision) do nothing;
  return new;
end;
$$;
revoke all on function private.enqueue_schedule_mirror() from public, anon, authenticated;

drop trigger if exists enqueue_schedule_mirror_on_write on public.user_schedules;
create trigger enqueue_schedule_mirror_on_write
after insert or update of revision, document on public.user_schedules
for each row execute function private.enqueue_schedule_mirror();

-- Backfill previously saved records so a new Firebase mirror starts complete.
insert into private.schedule_mirror_outbox (user_id, revision, document)
select user_id, revision, document from public.user_schedules
on conflict (user_id, revision) do nothing;

-- Requires a trusted server-side SQL role with access to "private" schema.
-- The application and anon roles MUST NOT receive that access.
