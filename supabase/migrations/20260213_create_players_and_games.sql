-- CC Stat Taker schema for Supabase
-- Creates:
--   1) players: profile + cumulative player stats
--   2) games: per-player game records, linked back to players

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text,
  email text unique,
  team_name text,
  jersey_number smallint check (jersey_number between 0 and 99),
  bio text,
  avatar_url text,

  -- Cumulative stats across all games for this player
  shots_total integer not null default 0 check (shots_total >= 0),
  makes_total integer not null default 0 check (makes_total >= 0),
  misses_total integer not null default 0 check (misses_total >= 0),
  top_total integer not null default 0 check (top_total >= 0),
  top_island_total integer not null default 0 check (top_island_total >= 0),
  bottom_total integer not null default 0 check (bottom_total >= 0),
  bottom_island_total integer not null default 0 check (bottom_island_total >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_players_set_updated_at on public.players;
create trigger trg_players_set_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),

  -- FK link to player profile/stats table
  player_id uuid not null
    references public.players(id)
    on delete cascade,

  game_date date not null default current_date,
  opponent_team text,
  team_name text,
  team_side text check (team_side in ('red', 'blue')),
  is_league boolean not null default false,
  result text check (result in ('win', 'loss', 'draw')),
  turns_played integer not null default 0 check (turns_played >= 0),

  -- Per-game stat line for this player
  shots integer not null default 0 check (shots >= 0),
  makes integer not null default 0 check (makes >= 0),
  misses integer not null default 0 check (misses >= 0),
  top_makes integer not null default 0 check (top_makes >= 0),
  top_island_makes integer not null default 0 check (top_island_makes >= 0),
  bottom_makes integer not null default 0 check (bottom_makes >= 0),
  bottom_island_makes integer not null default 0 check (bottom_island_makes >= 0),
  early_shots integer not null default 0 check (early_shots >= 0),
  early_makes integer not null default 0 check (early_makes >= 0),
  late_shots integer not null default 0 check (late_shots >= 0),
  late_makes integer not null default 0 check (late_makes >= 0),

  -- Computed field for convenience in analytics queries
  shooting_pct numeric(5,2)
  generated always as (
    case
      when shots = 0 then 0
      else round((makes::numeric / shots::numeric) * 100, 2)
    end
  ) stored,

  -- Stores volley-by-volley details, e.g. [{"turnNumber": 1, "shots": {...}}, ...]
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint games_history_is_array
    check (jsonb_typeof(history) = 'array')
);

drop trigger if exists trg_games_set_updated_at on public.games;
create trigger trg_games_set_updated_at
before update on public.games
for each row
execute function public.set_updated_at();

create index if not exists idx_games_player_id on public.games(player_id);
create index if not exists idx_games_game_date on public.games(game_date);
create index if not exists idx_games_history_gin on public.games using gin(history);
