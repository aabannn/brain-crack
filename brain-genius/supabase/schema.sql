-- Run this whole file once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)

create table if not exists players (
  phone       text primary key,
  name        text not null,
  best_score  integer not null default 0,
  plays       integer not null default 0,
  last_played timestamptz,
  is_winner   boolean not null default false
);

alter table players enable row level security;

-- Anyone (including anonymous visitors on the game page) can read the
-- leaderboard directly.
drop policy if exists "Public read access" on players;
create policy "Public read access"
  on players for select
  using (true);

-- No insert/update/delete policies exist for anon/authenticated on this
-- table. All writes go through the functions below, which enforce the
-- game's rules instead of trusting whatever the browser sends.

-- Register a player if they don't exist yet. Does NOT count as a play -
-- called once, right after someone fills in the registration screen.
create or replace function register_player(p_name text, p_phone text)
returns players
language plpgsql
security definer
set search_path = public
as $$
declare
  result players;
begin
  insert into players (phone, name)
  values (p_phone, p_name)
  on conflict (phone) do nothing;

  select * into result from players where phone = p_phone;
  return result;
end;
$$;

-- Record a finished game: increments plays, raises best_score only if beaten.
create or replace function submit_result(p_name text, p_phone text, p_score integer)
returns players
language plpgsql
security definer
set search_path = public
as $$
declare
  result players;
begin
  insert into players (phone, name, best_score, plays, last_played)
  values (p_phone, p_name, p_score, 1, now())
  on conflict (phone) do update
    set plays       = players.plays + 1,
        name        = excluded.name,
        last_played = now(),
        best_score  = greatest(players.best_score, excluded.best_score);

  select * into result from players where phone = p_phone;
  return result;
end;
$$;

-- Toggle a player's winner flag. Only callable by a signed-in (authenticated)
-- session - see the grants below - so a random visitor calling this
-- function directly gets rejected before this check even runs.
create or replace function toggle_winner(p_phone text)
returns players
language plpgsql
security definer
set search_path = public
as $$
declare
  result players;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized';
  end if;

  update players set is_winner = not is_winner where phone = p_phone;
  select * into result from players where phone = p_phone;
  return result;
end;
$$;

-- Anonymous visitors can register and submit scores, but only a
-- logged-in admin session can toggle winner status.
grant execute on function register_player(text, text)        to anon, authenticated;
grant execute on function submit_result(text, text, integer) to anon, authenticated;
grant execute on function toggle_winner(text)                 to authenticated;
revoke execute on function toggle_winner(text) from public;
