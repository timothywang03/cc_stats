import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import SetupView from './views/SetupView';
import PlayView from './views/PlayView';

const SHOT_TYPES = [
  { id: 'miss', label: 'Miss', short: 'M', value: 0, color: 'bg-gray-200 text-gray-600' },
  { id: 'top', label: 'Top', short: 'T', value: 1, color: 'bg-green-100 text-green-700' },
  { id: 'top_island', label: 'Top Island', short: 'TI', value: 1, color: 'bg-green-200 text-green-800 border-green-400' },
  { id: 'bottom', label: 'Bottom', short: 'B', value: 1, color: 'bg-blue-100 text-blue-700' },
  { id: 'bottom_island', label: 'Bottom Island', short: 'BI', value: 1, color: 'bg-blue-200 text-blue-800 border-blue-400' },
];

const INITIAL_PLAYERS_RED = Array.from({ length: 6 }, (_, i) => `Red Player ${i + 1}`);
const INITIAL_PLAYERS_BLUE = Array.from({ length: 6 }, (_, i) => `Blue Player ${i + 1}`);
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const ACTIVE_GAME_STORAGE_KEY = 'cc_stats_active_game_v1';
const ACTIVE_GAME_STORAGE_VERSION = 1;
const TEAM_SIZE = 6;

const calculatePercentage = (makes, shots) => (shots === 0 ? 0 : Math.round((makes / shots) * 100));

const computeStats = (history, redTeam, blueTeam) => {
  const data = {};
  [...redTeam, ...blueTeam].forEach((name) => {
    data[name] = {
      name,
      shots: 0,
      makes: 0,
      misses: 0,
      types: {},
      history: [],
    };
    SHOT_TYPES.forEach((t) => {
      data[name].types[t.id] = 0;
    });
  });

  history.forEach((volley) => {
    const teamNames = volley.team === 'red' ? redTeam : blueTeam;
    Object.keys(volley.shots).forEach((pIdx) => {
      const shotId = volley.shots[pIdx];
      const name = teamNames[pIdx];
      const shotDef = SHOT_TYPES.find((s) => s.id === shotId);

      if (shotDef && data[name]) {
        data[name].shots++;
        data[name].types[shotId]++;
        data[name].history.push(shotId);
        if (shotDef.value > 0) {
          data[name].makes++;
        } else {
          data[name].misses++;
        }
      }
    });
  });

  return data;
};

const getEarlyLateStats = (playerData) => {
  const allShots = playerData.history;
  const earlyShots = allShots.slice(0, 60);
  const earlyMakes = earlyShots.filter((sid) => SHOT_TYPES.find((s) => s.id === sid)?.value > 0).length;
  const lateShots = allShots.slice(-30);
  const lateMakes = lateShots.filter((sid) => SHOT_TYPES.find((s) => s.id === sid)?.value > 0).length;

  return {
    earlyPct: calculatePercentage(earlyMakes, earlyShots.length),
    earlyCount: earlyShots.length,
    latePct: calculatePercentage(lateMakes, lateShots.length),
    lateCount: lateShots.length,
  };
};

const normalizeName = (value) => value.trim().replace(/\s+/g, ' ');
const round2 = (value) => Math.round(value * 100) / 100;
const toPercentageRate = (makes, shots) => (shots === 0 ? 0 : round2(makes / shots));

const computeGamePlayerAnalytics = (volleyHistory) => {
  const bySlot = {};

  ['red', 'blue'].forEach((team) => {
    for (let i = 0; i < TEAM_SIZE; i += 1) {
      bySlot[`${team}:${i}`] = {
        num_shots: 0,
        tops: 0,
        bottoms: 0,
        top_islands: 0,
        bottom_islands: 0,
        makes: 0,
        misses: 0,
        shotHistory: [],
        turns: new Set(),
      };
    }
  });

  volleyHistory.forEach((volley) => {
    Object.keys(volley.shots)
      .map(Number)
      .forEach((playerIndex) => {
        const key = `${volley.team}:${playerIndex}`;
        const player = bySlot[key];
        if (!player) return;

        const shotId = volley.shots[playerIndex];
        const shotDef = SHOT_TYPES.find((s) => s.id === shotId);
        const isMake = Boolean(shotDef && shotDef.value > 0);

        player.num_shots += 1;
        player.turns.add(volley.turnNumber);
        player.shotHistory.push(shotId);
        if (shotId === 'top') player.tops += 1;
        if (shotId === 'bottom') player.bottoms += 1;
        if (shotId === 'top_island') player.top_islands += 1;
        if (shotId === 'bottom_island') player.bottom_islands += 1;
        if (isMake) {
          player.makes += 1;
        } else {
          player.misses += 1;
        }
      });
  });

  const result = {};
  Object.entries(bySlot).forEach(([key, player]) => {
    const turns = player.turns.size;
    const earlyShots = player.shotHistory.slice(0, 60);
    const earlyMakes = earlyShots.filter((sid) => SHOT_TYPES.find((s) => s.id === sid)?.value > 0).length;
    const lateShots = player.shotHistory.slice(-30);
    const lateMakes = lateShots.filter((sid) => SHOT_TYPES.find((s) => s.id === sid)?.value > 0).length;

    result[key] = {
      num_shots: player.num_shots,
      tops: player.tops,
      bottoms: player.bottoms,
      top_islands: player.top_islands,
      bottom_islands: player.bottom_islands,
      makes: player.makes,
      misses: player.misses,
      shooting_percentage: toPercentageRate(player.makes, player.num_shots),
      spt: turns === 0 ? 0 : round2(player.num_shots / turns),
      mpt: turns === 0 ? 0 : round2(player.makes / turns),
      early_game_percentage: toPercentageRate(earlyMakes, earlyShots.length),
      late_game_percentage: toPercentageRate(lateMakes, lateShots.length),
    };
  });

  return result;
};

export default function CCStatTaker() {
  const [gameState, setGameState] = useState('setup');
  const [isLeague, setIsLeague] = useState(false);
  const [gameName, setGameName] = useState('');

  const [redTeamName, setRedTeamName] = useState('Red Team');
  const [blueTeamName, setBlueTeamName] = useState('Blue Team');
  const [redTeam, setRedTeam] = useState(INITIAL_PLAYERS_RED);
  const [blueTeam, setBlueTeam] = useState(INITIAL_PLAYERS_BLUE);

  const [history, setHistory] = useState([]);
  const [turnNumber, setTurnNumber] = useState(1);
  const [currentTeam, setCurrentTeam] = useState('red');
  const [activeIndices, setActiveIndices] = useState([0, 1, 2, 3, 4, 5]);
  const [activeTab, setActiveTab] = useState('input');
  const [currentVolleyShots, setCurrentVolleyShots] = useState({});
  const [editCell, setEditCell] = useState(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [redPlayerIds, setRedPlayerIds] = useState(Array(TEAM_SIZE).fill(null));
  const [bluePlayerIds, setBluePlayerIds] = useState(Array(TEAM_SIZE).fill(null));
  const didHydrateRef = useRef(false);
  const isHydratingFromStorageRef = useRef(false);

  const stats = useMemo(() => computeStats(history, redTeam, blueTeam), [history, redTeam, blueTeam]);
  const getTeamName = (team) => (team === 'red' ? redTeamName : blueTeamName);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed?.version !== ACTIVE_GAME_STORAGE_VERSION || parsed?.gameState !== 'playing') return;

      isHydratingFromStorageRef.current = true;
      setGameState('playing');
      setIsLeague(Boolean(parsed.isLeague));
      setGameName(typeof parsed.gameName === 'string' ? parsed.gameName : '');
      setRedTeamName(typeof parsed.redTeamName === 'string' ? parsed.redTeamName : 'Red Team');
      setBlueTeamName(typeof parsed.blueTeamName === 'string' ? parsed.blueTeamName : 'Blue Team');
      if (Array.isArray(parsed.redTeam) && parsed.redTeam.length === 6) setRedTeam(parsed.redTeam);
      if (Array.isArray(parsed.blueTeam) && parsed.blueTeam.length === 6) setBlueTeam(parsed.blueTeam);
      if (Array.isArray(parsed.history)) setHistory(parsed.history);
      if (Number.isInteger(parsed.turnNumber) && parsed.turnNumber > 0) setTurnNumber(parsed.turnNumber);
      if (parsed.currentTeam === 'red' || parsed.currentTeam === 'blue') setCurrentTeam(parsed.currentTeam);
      if (Array.isArray(parsed.activeIndices)) setActiveIndices(parsed.activeIndices);
      if (parsed.activeTab === 'input' || parsed.activeTab === 'grid' || parsed.activeTab === 'analytics') {
        setActiveTab(parsed.activeTab);
      }
      if (parsed.currentVolleyShots && typeof parsed.currentVolleyShots === 'object') {
        setCurrentVolleyShots(parsed.currentVolleyShots);
      }
      if (parsed.editCell && typeof parsed.editCell === 'object') {
        setEditCell(parsed.editCell);
      }
      if (Number.isInteger(parsed.currentGameId)) {
        setCurrentGameId(parsed.currentGameId);
      }
      if (Array.isArray(parsed.redPlayerIds) && parsed.redPlayerIds.length === TEAM_SIZE) {
        setRedPlayerIds(parsed.redPlayerIds);
      }
      if (Array.isArray(parsed.bluePlayerIds) && parsed.bluePlayerIds.length === TEAM_SIZE) {
        setBluePlayerIds(parsed.bluePlayerIds);
      }
    } catch (error) {
      console.error('Failed to restore active game from local storage:', error);
    } finally {
      didHydrateRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    if (isHydratingFromStorageRef.current) {
      isHydratingFromStorageRef.current = false;
      return;
    }

    if (gameState !== 'playing') {
      localStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
      return;
    }

    const payload = {
      version: ACTIVE_GAME_STORAGE_VERSION,
      gameState,
      isLeague,
      gameName,
      redTeamName,
      blueTeamName,
      redTeam,
      blueTeam,
      history,
      turnNumber,
      currentTeam,
      activeIndices,
      activeTab,
      currentVolleyShots,
      editCell,
      currentGameId,
      redPlayerIds,
      bluePlayerIds,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to persist active game to local storage:', error);
    }
  }, [
    gameState,
    isLeague,
    gameName,
    redTeamName,
    blueTeamName,
    redTeam,
    blueTeam,
    history,
    turnNumber,
    currentTeam,
    activeIndices,
    activeTab,
    currentVolleyShots,
    editCell,
    currentGameId,
    redPlayerIds,
    bluePlayerIds,
  ]);

  const startGame = async () => {
    const normalizedRedTeam = redTeam.map(normalizeName);
    const normalizedBlueTeam = blueTeam.map(normalizeName);
    if ([...normalizedRedTeam, ...normalizedBlueTeam].some((name) => !name)) {
      alert('Please enter a name for all 12 players before starting the game.');
      return;
    }

    if (!HAS_SUPABASE_CONFIG) {
      alert('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your env file.');
      return;
    }

    setIsStartingGame(true);
    try {
      const baseHeaders = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };
      const parseJson = async (response) => {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      };

      const existingPlayersRes = await fetch(`${SUPABASE_URL}/rest/v1/players?select=player_id,player_name`, {
        headers: baseHeaders,
      });
      const existingPlayers = await parseJson(existingPlayersRes);
      if (!existingPlayersRes.ok) throw new Error('Failed to load existing players');

      const existingPlayerByName = new Map(
        existingPlayers.map((player) => [normalizeName(player.player_name).toLowerCase(), player])
      );

      const allSelectedPlayers = [
        ...normalizedRedTeam.map((name) => ({ name, teamName: redTeamName })),
        ...normalizedBlueTeam.map((name) => ({ name, teamName: blueTeamName })),
      ];
      const resolvedPlayerIdByName = new Map();

      for (const player of allSelectedPlayers) {
        const key = player.name.toLowerCase();
        if (resolvedPlayerIdByName.has(key)) continue;

        const existing = existingPlayerByName.get(key);
        if (existing) {
          resolvedPlayerIdByName.set(key, existing.player_id);
          continue;
        }

        const createPlayerRes = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
          method: 'POST',
          headers: { ...baseHeaders, Prefer: 'return=representation' },
          body: JSON.stringify({
            player_name: player.name,
            team_name: player.teamName || null,
          }),
        });
        const createdPlayer = await parseJson(createPlayerRes);
        const createdPlayerRow = Array.isArray(createdPlayer) ? createdPlayer[0] : createdPlayer;
        if (!createPlayerRes.ok || !createdPlayerRow?.player_id) {
          throw new Error(`Failed to create player: ${player.name}`);
        }

        const newPlayer = createdPlayerRow;
        existingPlayerByName.set(key, newPlayer);
        resolvedPlayerIdByName.set(key, newPlayer.player_id);
      }

      const redPlayerIds = normalizedRedTeam.map((name) => resolvedPlayerIdByName.get(name.toLowerCase()));
      const bluePlayerIds = normalizedBlueTeam.map((name) => resolvedPlayerIdByName.get(name.toLowerCase()));

      const gameInsertPayload = {
        game_name: normalizeName(gameName) || `Game ${new Date().toISOString().split('T')[0]}`,
        game_date: new Date().toISOString().split('T')[0],
        game_finished: false,
        total_turns: 0,
        annotations: null,
        game_data: {
          isLeague,
          redTeamName,
          blueTeamName,
          redPlayers: normalizedRedTeam,
          bluePlayers: normalizedBlueTeam,
          createdAt: new Date().toISOString(),
        },
      };

      const createGameRes = await fetch(`${SUPABASE_URL}/rest/v1/games`, {
        method: 'POST',
        headers: { ...baseHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(gameInsertPayload),
      });
      const createdGameRows = await parseJson(createGameRes);
      if (!createGameRes.ok || !createdGameRows?.[0]?.game_id) {
        throw new Error('Failed to create game row');
      }
      const gameId = createdGameRows[0].game_id;

      const defaultGamePlayerStats = {
        num_shots: 0,
        tops: 0,
        bottoms: 0,
        top_islands: 0,
        bottom_islands: 0,
        makes: 0,
        misses: 0,
        shooting_percentage: 0,
        spt: 0,
        mpt: 0,
        early_game_percentage: 0,
        late_game_percentage: 0,
      };
      const gamePlayersPayload = [
        ...redPlayerIds.map((playerId) => ({
          game_id: gameId,
          player_id: playerId,
          team: 'red',
          ...defaultGamePlayerStats,
        })),
        ...bluePlayerIds.map((playerId) => ({
          game_id: gameId,
          player_id: playerId,
          team: 'blue',
          ...defaultGamePlayerStats,
        })),
      ];

      const createGamePlayersRes = await fetch(`${SUPABASE_URL}/rest/v1/game_players`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(gamePlayersPayload),
      });
      if (!createGamePlayersRes.ok) {
        throw new Error('Failed to create game_players rows');
      }

      setCurrentGameId(gameId);
      setRedPlayerIds(redPlayerIds);
      setBluePlayerIds(bluePlayerIds);
      setRedTeam(normalizedRedTeam);
      setBlueTeam(normalizedBlueTeam);
      setGameState('playing');
      setActiveTab('input');
      setTurnNumber(1);
      setCurrentTeam('red');
      setActiveIndices([0, 1, 2, 3, 4, 5]);
      setHistory([]);
      setCurrentVolleyShots({});
    } catch (error) {
      console.error(error);
      alert('Could not start game in Supabase. Check your API keys, table names, and RLS policies.');
    } finally {
      setIsStartingGame(false);
    }
  };

  const syncVolleyToDatabase = async ({
    updatedHistory,
    nextTurnNumber,
    nextCurrentTeam,
    nextActiveIndices,
    didStartNewTurn,
  }) => {
    if (!HAS_SUPABASE_CONFIG || !Number.isInteger(currentGameId)) return;

    const baseHeaders = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
    const parseErrorResponse = async (response, fallbackMessage) => {
      try {
        const payload = await response.json();
        const details = payload?.message || payload?.error || payload?.details || payload?.hint;
        return details ? `${fallbackMessage}: ${details}` : fallbackMessage;
      } catch {
        return fallbackMessage;
      }
    };
    const playerAnalytics = computeGamePlayerAnalytics(updatedHistory);

    const gamePlayersLookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/game_players?select=game_players_id,player_id,team&game_id=eq.${currentGameId}`,
      { headers: baseHeaders }
    );
    if (!gamePlayersLookupRes.ok) {
      throw new Error(await parseErrorResponse(gamePlayersLookupRes, 'Failed to load game_players for update'));
    }
    const gamePlayersRows = await gamePlayersLookupRes.json();

    const findGamePlayerRow = (team, playerId) =>
      gamePlayersRows.find((row) => Number(row.player_id) === Number(playerId) && String(row.team).toLowerCase() === team) ||
      gamePlayersRows.find((row) => Number(row.player_id) === Number(playerId) && !row.team);

    const patchRequests = [];
    for (let i = 0; i < TEAM_SIZE; i += 1) {
      const redPlayerId = redPlayerIds[i];
      const bluePlayerId = bluePlayerIds[i];

      if (Number.isInteger(redPlayerId)) {
        const row = findGamePlayerRow('red', redPlayerId);
        if (!row) {
          throw new Error(`Missing game_players row for red player_id=${redPlayerId} in game_id=${currentGameId}`);
        }
        patchRequests.push(
          fetch(`${SUPABASE_URL}/rest/v1/game_players?game_players_id=eq.${row.game_players_id}`, {
            method: 'PATCH',
            headers: baseHeaders,
            body: JSON.stringify(playerAnalytics[`red:${i}`]),
          })
        );
      }
      if (Number.isInteger(bluePlayerId)) {
        const row = findGamePlayerRow('blue', bluePlayerId);
        if (!row) {
          throw new Error(`Missing game_players row for blue player_id=${bluePlayerId} in game_id=${currentGameId}`);
        }
        patchRequests.push(
          fetch(`${SUPABASE_URL}/rest/v1/game_players?game_players_id=eq.${row.game_players_id}`, {
            method: 'PATCH',
            headers: baseHeaders,
            body: JSON.stringify(playerAnalytics[`blue:${i}`]),
          })
        );
      }
    }

    const patchResponses = await Promise.all(patchRequests);
    const failedPlayerPatch = patchResponses.find((res) => !res.ok);
    if (failedPlayerPatch) {
      throw new Error(await parseErrorResponse(failedPlayerPatch, 'Failed to update one or more game_players analytics rows'));
    }

    const gameUpdatePayload = {
      game_data: {
        isLeague,
        gameName: normalizeName(gameName) || `Game ${new Date().toISOString().split('T')[0]}`,
        redTeamName,
        blueTeamName,
        redPlayers: redTeam,
        bluePlayers: blueTeam,
        history: updatedHistory,
        current_turn: nextTurnNumber,
        current_team: nextCurrentTeam,
        active_indices: nextActiveIndices,
        updated_at: new Date().toISOString(),
      },
    };
    if (didStartNewTurn) {
      gameUpdatePayload.total_turns = nextTurnNumber;
    }

    const gamePatchRes = await fetch(`${SUPABASE_URL}/rest/v1/games?game_id=eq.${currentGameId}`, {
      method: 'PATCH',
      headers: baseHeaders,
      body: JSON.stringify(gameUpdatePayload),
    });
    if (!gamePatchRes.ok) {
      throw new Error(await parseErrorResponse(gamePatchRes, 'Failed to update games row after volley submission'));
    }
  };

  const handleShotSelection = (playerIdx, shotType) => {
    setCurrentVolleyShots((prev) => ({
      ...prev,
      [playerIdx]: shotType,
    }));
  };

  const clearCurrentVolleySelections = () => {
    setCurrentVolleyShots({});
  };

  const submitVolley = async () => {
    const missingShots = activeIndices.some((idx) => !currentVolleyShots[idx]);
    if (missingShots) {
      alert('Please enter a shot result for all active players.');
      return;
    }

    let makeCount = 0;
    const successfulIndices = [];

    activeIndices.forEach((idx) => {
      const shotId = currentVolleyShots[idx];
      const shot = SHOT_TYPES.find((s) => s.id === shotId);
      if (shot && shot.value > 0) {
        makeCount++;
        successfulIndices.push(idx);
      }
    });

    const newVolley = {
      id: Date.now(),
      turnNumber,
      team: currentTeam,
      shots: { ...currentVolleyShots },
      activeIndices: [...activeIndices],
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...history, newVolley];
    const didStartNewTurn = makeCount < 2 && currentTeam === 'blue';
    const nextTurnNumber = didStartNewTurn ? turnNumber + 1 : turnNumber;
    const nextCurrentTeam = makeCount >= 2 ? currentTeam : currentTeam === 'blue' ? 'red' : 'blue';
    const nextActiveIndices = makeCount >= 2 ? successfulIndices : [0, 1, 2, 3, 4, 5];

    setHistory(updatedHistory);
    setTurnNumber(nextTurnNumber);
    setCurrentTeam(nextCurrentTeam);
    setActiveIndices(nextActiveIndices);
    setCurrentVolleyShots({});

    try {
      await syncVolleyToDatabase({
        updatedHistory,
        nextTurnNumber,
        nextCurrentTeam,
        nextActiveIndices,
        didStartNewTurn,
      });
    } catch (error) {
      console.error(error);
      alert(`Volley saved locally, but failed to update game analytics in Supabase.\n${error.message}`);
    }
  };

  const updateHistoryCell = (volleyIndex, playerIndex, newShotId) => {
    const newHistory = [...history];
    newHistory[volleyIndex].shots[playerIndex] = newShotId;
    setHistory(newHistory);
    setEditCell(null);
  };

  const downloadSpreadsheet = () => {
    const buildTeamAnalytics = (players, teamLabel) =>
      players.map((name) => {
        const p = stats[name];
        if (!p) {
          return {
            playerName: name,
            shots: 0,
            makes: 0,
            misses: 0,
            shootingPct: 0,
            earlyPct: 0,
            latePct: 0,
            shotBreakdown: {
              miss: 0,
              top: 0,
              top_island: 0,
              bottom: 0,
              bottom_island: 0,
            },
          };
        }

        const { earlyPct, latePct } = getEarlyLateStats(p);
        return {
          playerName: name,
          team: teamLabel,
          shots: p.shots,
          makes: p.makes,
          misses: p.misses,
          shootingPct: calculatePercentage(p.makes, p.shots),
          earlyPct,
          latePct,
          shotBreakdown: {
            miss: p.types.miss || 0,
            top: p.types.top || 0,
            top_island: p.types.top_island || 0,
            bottom: p.types.bottom || 0,
            bottom_island: p.types.bottom_island || 0,
          },
        };
      });

    const exportPayload = {
      game: {
        name: gameName?.trim() || 'Untitled Game',
        isLeague,
        turnNumber,
        currentTeam,
        teams: {
          red: {
            name: redTeamName,
            players: redTeam,
          },
          blue: {
            name: blueTeamName,
            players: blueTeam,
          },
        },
      },
      history,
      analytics: {
        redTeam: buildTeamAnalytics(redTeam, redTeamName),
        blueTeam: buildTeamAnalytics(blueTeam, blueTeamName),
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cc_game_stats_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {gameState === 'setup' ? (
        <SetupView
          isLeague={isLeague}
          setIsLeague={setIsLeague}
          gameName={gameName}
          setGameName={setGameName}
          redTeamName={redTeamName}
          setRedTeamName={setRedTeamName}
          blueTeamName={blueTeamName}
          setBlueTeamName={setBlueTeamName}
          redTeam={redTeam}
          setRedTeam={setRedTeam}
          blueTeam={blueTeam}
          setBlueTeam={setBlueTeam}
          isStartingGame={isStartingGame}
          startGame={startGame}
        />
      ) : (
        <PlayView
          gameName={gameName}
          isLeague={isLeague}
          turnNumber={turnNumber}
          currentTeam={currentTeam}
          redTeamName={redTeamName}
          blueTeamName={blueTeamName}
          history={history}
          downloadSpreadsheet={downloadSpreadsheet}
          setGameState={setGameState}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeIndices={activeIndices}
          currentVolleyShots={currentVolleyShots}
          handleShotSelection={handleShotSelection}
          clearCurrentVolleySelections={clearCurrentVolleySelections}
          submitVolley={submitVolley}
          redTeam={redTeam}
          blueTeam={blueTeam}
          getTeamName={getTeamName}
          editCell={editCell}
          setEditCell={setEditCell}
          updateHistoryCell={updateHistoryCell}
          shotTypes={SHOT_TYPES}
          initialPlayersRed={INITIAL_PLAYERS_RED}
          stats={stats}
          calculatePercentage={calculatePercentage}
          getEarlyLateStats={getEarlyLateStats}
        />
      )}
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<CCStatTaker />);
}
