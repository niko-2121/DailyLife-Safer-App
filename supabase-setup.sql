-- DailyLife Safer: einmal im Supabase "SQL Editor" einfügen und auf "Run" tippen.
-- Legt die Tabelle für alle Einträge an. Jede Person sieht und ändert nur ihre eigenen Zeilen.

create table if not exists public.docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  path       text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);

alter table public.docs enable row level security;

drop policy if exists "docs_select_own" on public.docs;
drop policy if exists "docs_insert_own" on public.docs;
drop policy if exists "docs_update_own" on public.docs;
drop policy if exists "docs_delete_own" on public.docs;

create policy "docs_select_own" on public.docs for select to authenticated using (auth.uid() = user_id);
create policy "docs_insert_own" on public.docs for insert to authenticated with check (auth.uid() = user_id);
create policy "docs_update_own" on public.docs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "docs_delete_own" on public.docs for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.docs to authenticated;
revoke all on public.docs from anon;
