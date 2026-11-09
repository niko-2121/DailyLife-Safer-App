-- DailyLife Safer: Kategorien als eingefrorenen Stand teilen
create table if not exists public.shares (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cat text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.shares enable row level security;
drop policy if exists "shares_insert_own" on public.shares;
drop policy if exists "shares_select_own" on public.shares;
drop policy if exists "shares_delete_own" on public.shares;
create policy "shares_insert_own" on public.shares for insert to authenticated with check (owner = auth.uid());
create policy "shares_select_own" on public.shares for select to authenticated using (owner = auth.uid());
create policy "shares_delete_own" on public.shares for delete to authenticated using (owner = auth.uid());

-- Wer den Link hat, bekommt genau diesen einen Stand, ohne Liste aller Freigaben
create or replace function public.get_share(sid text)
returns jsonb language sql stable security definer set search_path = public
as $$ select data from public.shares where id = sid $$;
revoke all on function public.get_share(text) from public;
grant execute on function public.get_share(text) to anon, authenticated;
