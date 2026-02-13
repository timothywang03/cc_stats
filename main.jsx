import React, { useState, useMemo } from 'react';
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

  const stats = useMemo(() => computeStats(history, redTeam, blueTeam), [history, redTeam, blueTeam]);
  const getTeamName = (team) => (team === 'red' ? redTeamName : blueTeamName);

  const startGame = () => {
    setGameState('playing');
    setActiveTab('input');
    setTurnNumber(1);
    setCurrentTeam('red');
    setActiveIndices([0, 1, 2, 3, 4, 5]);
    setHistory([]);
    setCurrentVolleyShots({});
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

  const submitVolley = () => {
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

    setHistory([...history, newVolley]);

    if (makeCount >= 2) {
      setActiveIndices(successfulIndices);
    } else {
      if (currentTeam === 'blue') {
        setTurnNumber((prev) => prev + 1);
        setCurrentTeam('red');
      } else {
        setCurrentTeam('blue');
      }
      setActiveIndices([0, 1, 2, 3, 4, 5]);
    }

    setCurrentVolleyShots({});
  };

  const updateHistoryCell = (volleyIndex, playerIndex, newShotId) => {
    const newHistory = [...history];
    newHistory[volleyIndex].shots[playerIndex] = newShotId;
    setHistory(newHistory);
    setEditCell(null);
  };

  const downloadSpreadsheet = () => {
    const lines = [];

    lines.push('Shot History');
    lines.push('Turn,Team,Player #,Player Name,Shot,Result,Timestamp');
    history.forEach((volley) => {
      const players = volley.team === 'red' ? redTeam : blueTeam;
      Object.keys(volley.shots)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((pIdx) => {
          const shotId = volley.shots[pIdx];
          const shot = SHOT_TYPES.find((s) => s.id === shotId);
          const result = shot && shot.value > 0 ? 'Make' : 'Miss';
          lines.push(
            [
              volley.turnNumber,
              `"${getTeamName(volley.team)}"`,
              pIdx + 1,
              `"${players[pIdx] || ''}"`,
              shot ? `"${shot.label}"` : 'Unknown',
              result,
              volley.timestamp,
            ].join(',')
          );
        });
    });

    lines.push('');
    lines.push('Analytics');
    lines.push('Team,Player,Shooting %,Shots,Makes,Misses,Early %,Late %,Top,Top Island,Bottom,Bottom Island');

    const addTeamStats = (players, teamLabel) => {
      players.forEach((name) => {
        const p = stats[name];
        if (!p) return;
        const { earlyPct, latePct } = getEarlyLateStats(p);
        const pct = calculatePercentage(p.makes, p.shots);
        lines.push(
          [
            teamLabel,
            `"${name}"`,
            `${pct}%`,
            p.shots,
            p.makes,
            p.misses,
            `${earlyPct}%`,
            `${latePct}%`,
            p.types.top || 0,
            p.types.top_island || 0,
            p.types.bottom || 0,
            p.types.bottom_island || 0,
          ].join(',')
        );
      });
    };

    addTeamStats(redTeam, redTeamName);
    addTeamStats(blueTeam, blueTeamName);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cc_stats_${new Date().toISOString().split('T')[0]}.csv`;
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
