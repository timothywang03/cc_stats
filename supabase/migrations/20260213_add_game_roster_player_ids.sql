-- Store the full roster player IDs for each game row.
-- This complements `player_id` (single-player stat row) with all players in the game.

alter table public.games
  add column if not exists red_player_ids uuid[] not null default '{}',
  add column if not exists blue_player_ids uuid[] not null default '{}';

create index if not exists idx_games_red_player_ids_gin on public.games using gin(red_player_ids);
create index if not exists idx_games_blue_player_ids_gin on public.games using gin(blue_player_ids);
