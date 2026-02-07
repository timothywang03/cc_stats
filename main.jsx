import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Trophy, ChevronRight, Activity, Grid, RotateCcw, Save, Edit2, CheckCircle, XCircle } from 'lucide-react';

// --- Constants & Config ---

const SHOT_TYPES = [
  { id: 'miss', label: 'Miss', short: 'M', value: 0, color: 'bg-gray-200 text-gray-600' },
  { id: 'top', label: 'Top', short: 'T', value: 1, color: 'bg-green-100 text-green-700' },
  { id: 'top_island', label: 'Top Island', short: 'TI', value: 1, color: 'bg-green-200 text-green-800 border-green-400' },
  { id: 'bottom', label: 'Bottom', short: 'B', value: 1, color: 'bg-blue-100 text-blue-700' },
  { id: 'bottom_island', label: 'Bottom Island', short: 'BI', value: 1, color: 'bg-blue-200 text-blue-800 border-blue-400' },
];

const INITIAL_PLAYERS_RED = Array.from({ length: 6 }, (_, i) => `Red Player ${i + 1}`);
const INITIAL_PLAYERS_BLUE = Array.from({ length: 6 }, (_, i) => `Blue Player ${i + 1}`);

// --- Helpers ---
const calculatePercentage = (makes, shots) => (shots === 0 ? 0 : Math.round((makes / shots) * 100));

const computeStats = (history, redTeam, blueTeam) => {
  const data = {};
  [...redTeam, ...blueTeam].forEach(name => {
    data[name] = {
      name,
      shots: 0,
      makes: 0,
      misses: 0,
      types: {},
      history: []
    };
    SHOT_TYPES.forEach(t => (data[name].types[t.id] = 0));
  });

  history.forEach(volley => {
    const teamNames = volley.team === 'red' ? redTeam : blueTeam;
    Object.keys(volley.shots).forEach(pIdx => {
      const shotId = volley.shots[pIdx];
      const name = teamNames[pIdx];
      const shotDef = SHOT_TYPES.find(s => s.id === shotId);

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
  const earlyMakes = earlyShots.filter(sid => SHOT_TYPES.find(s => s.id === sid)?.value > 0).length;
  const lateShots = allShots.slice(-30);
  const lateMakes = lateShots.filter(sid => SHOT_TYPES.find(s => s.id === sid)?.value > 0).length;

  return {
    earlyPct: calculatePercentage(earlyMakes, earlyShots.length),
    earlyCount: earlyShots.length,
    latePct: calculatePercentage(lateMakes, lateShots.length),
    lateCount: lateShots.length
  };
};

// --- Helper Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:bg-indigo-300",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    ghost: "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- Main Application Component ---

export default function CCStatTaker() {
  // --- State ---
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing'
  const [isLeague, setIsLeague] = useState(false);
  
  // Teams
  const [redTeamName, setRedTeamName] = useState('Red Team');
  const [blueTeamName, setBlueTeamName] = useState('Blue Team');
  const [redTeam, setRedTeam] = useState(INITIAL_PLAYERS_RED);
  const [blueTeam, setBlueTeam] = useState(INITIAL_PLAYERS_BLUE);

  // Gameplay State
  const [history, setHistory] = useState([]); // Array of volleys
  const [turnNumber, setTurnNumber] = useState(1);
  const [currentTeam, setCurrentTeam] = useState('red'); // 'red' or 'blue'
  const [activeIndices, setActiveIndices] = useState([0, 1, 2, 3, 4, 5]); // Indices of players shooting this volley
  const [activeTab, setActiveTab] = useState('input'); // 'input', 'grid', 'analytics'
  
  // Current Volley Input State (Map of playerIndex -> shotTypeID)
  const [currentVolleyShots, setCurrentVolleyShots] = useState({});

  // Editing State
  const [editCell, setEditCell] = useState(null); // { volleyIndex, playerIndex }

  // Aggregated stats for analytics/download
  const stats = useMemo(() => computeStats(history, redTeam, blueTeam), [history, redTeam, blueTeam]);
  const getTeamName = (team) => (team === 'red' ? redTeamName : blueTeamName);

  // --- Actions ---

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
    setCurrentVolleyShots(prev => ({
      ...prev,
      [playerIdx]: shotType
    }));
  };

  const submitVolley = () => {
    // 1. Validate input
    const missingShots = activeIndices.some(idx => !currentVolleyShots[idx]);
    if (missingShots) {
      alert("Please enter a shot result for all active players.");
      return;
    }

    // 2. Calculate Stats for Logic
    let makeCount = 0;
    const successfulIndices = [];
    
    activeIndices.forEach(idx => {
      const shotId = currentVolleyShots[idx];
      const shot = SHOT_TYPES.find(s => s.id === shotId);
      if (shot && shot.value > 0) {
        makeCount++;
        successfulIndices.push(idx);
      }
    });

    // 3. Record History
    const newVolley = {
      id: Date.now(),
      turnNumber: turnNumber,
      team: currentTeam,
      shots: { ...currentVolleyShots }, // Snapshot of shots
      activeIndices: [...activeIndices],
      timestamp: new Date().toISOString()
    };
    
    setHistory([...history, newVolley]);
    
    if (makeCount >= 2) {
      // STAY on current team, increment volley logic implied (turn number stays same), filter players
      setActiveIndices(successfulIndices);
    } else {
      // SWITCH teams
      if (currentTeam === 'blue') {
        // If Blue is finishing, increment turn number for next Red turn
        setTurnNumber(prev => prev + 1);
        setCurrentTeam('red');
      } else {
        // Red finished, switch to Blue (same turn number)
        setCurrentTeam('blue');
      }
      // Reset to all 6 players
      setActiveIndices([0, 1, 2, 3, 4, 5]);
    }

    // 5. Reset Input
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

    // Shot history section
    lines.push('Shot History');
    lines.push('Turn,Team,Player #,Player Name,Shot,Result,Timestamp');
    history.forEach(volley => {
      const players = volley.team === 'red' ? redTeam : blueTeam;
      Object.keys(volley.shots)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(pIdx => {
          const shotId = volley.shots[pIdx];
          const shot = SHOT_TYPES.find(s => s.id === shotId);
          const result = shot && shot.value > 0 ? 'Make' : 'Miss';
          lines.push([
            volley.turnNumber,
            `"${getTeamName(volley.team)}"`,
            pIdx + 1,
            `"${players[pIdx] || ''}"`,
            shot ? `"${shot.label}"` : 'Unknown',
            result,
            volley.timestamp
          ].join(','));
        });
    });

    lines.push('');
    lines.push('Analytics');
    lines.push('Team,Player,Shooting %,Shots,Makes,Misses,Early %,Late %,Top,Top Island,Bottom,Bottom Island');

    const addTeamStats = (players, teamLabel) => {
      players.forEach(name => {
        const p = stats[name];
        if (!p) return;
        const { earlyPct, latePct } = getEarlyLateStats(p);
        const pct = calculatePercentage(p.makes, p.shots);
        lines.push([
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
          p.types.bottom_island || 0
        ].join(','));
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

  // --- Views ---

  const SetupView = () => (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">CC Stat Taker</h1>
        <p className="text-gray-500">Configure your match settings</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-500" />
            Match Settings
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isLeague} 
              onChange={e => setIsLeague(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" 
            />
            <span className="font-medium text-gray-700">League Game</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Red Team Inputs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600 font-bold border-b border-red-100 pb-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              {redTeamName} (First)
            </div>
            <input
              value={redTeamName}
              onChange={(e) => setRedTeamName(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all mb-2"
              placeholder="Red Team"
            />
            {redTeam.map((player, i) => (
              <div key={`red-${i}`} className="flex items-center gap-3">
                <span className="w-6 text-sm font-mono text-gray-400">#{i + 1}</span>
                <input
                  value={player}
                  onChange={(e) => {
                    const newTeam = [...redTeam];
                    newTeam[i] = e.target.value;
                    setRedTeam(newTeam);
                  }}
                  className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder={`Red Player ${i + 1}`}
                />
              </div>
            ))}
          </div>

          {/* Blue Team Inputs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-bold border-b border-blue-100 pb-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              {blueTeamName} (Second)
            </div>
            <input
              value={blueTeamName}
              onChange={(e) => setBlueTeamName(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-2"
              placeholder="Blue Team"
            />
            {blueTeam.map((player, i) => (
              <div key={`blue-${i}`} className="flex items-center gap-3">
                <span className="w-6 text-sm font-mono text-gray-400">#{i + 1}</span>
                <input
                  value={player}
                  onChange={(e) => {
                    const newTeam = [...blueTeam];
                    newTeam[i] = e.target.value;
                    setBlueTeam(newTeam);
                  }}
                  className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder={`Blue Player ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
          <Button onClick={startGame} className="w-full md:w-auto px-8">
            Start Game <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  const PlayView = () => {
    // Derived current players
    const currentTeamName = currentTeam === 'red' ? redTeamName : blueTeamName;
    const currentTeamPlayers = currentTeam === 'red' ? redTeam : blueTeam;
    const teamColor = currentTeam === 'red' ? 'bg-red-500' : 'bg-blue-500';
    const teamColorText = currentTeam === 'red' ? 'text-red-600' : 'text-blue-600';
    const teamBg = currentTeam === 'red' ? 'bg-red-50' : 'bg-blue-50';
    const teamScores = history.reduce(
      (acc, volley) => {
        const volleyHits = Object.values(volley.shots).reduce((sum, shotId) => {
          const shot = SHOT_TYPES.find(s => s.id === shotId);
          return sum + (shot?.value || 0);
        }, 0);

        if (volley.team === 'red') acc.red += volleyHits;
        if (volley.team === 'blue') acc.blue += volleyHits;
        return acc;
      },
      { red: 0, blue: 0 }
    );

    return (
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header / Status Bar */}
        <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-900 text-white border-none">
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10`}>
              {isLeague ? 'League Match' : 'Exhibition'}
            </div>
            <div className="h-6 w-px bg-white/20"></div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Current:</span>
              <span className="text-xl font-bold">Turn {turnNumber}</span>
            </div>
            <div className="h-6 w-px bg-white/20"></div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Score:</span>
              <span className="text-xl font-bold text-red-400"> {teamScores.red} </span>
              <span className="text-xl font-bold text-blue-400"> {teamScores.blue} </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Active Team:</span>
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold ${currentTeam === 'red' ? 'bg-red-600' : 'bg-blue-600'}`}>
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              {currentTeamName}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              className="bg-white/90 text-gray-900 border-white/30 hover:bg-white"
              onClick={downloadSpreadsheet}
            >
              <Save className="w-4 h-4" /> Download CSV
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setGameState('setup')}>
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          </div>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-6 px-2">
          {[
            { id: 'input', label: 'Enter Stats', icon: Edit2 },
            { id: 'grid', label: 'History Grid', icon: Grid },
            { id: 'analytics', label: 'Analytics', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
          {activeTab === 'input' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-xl border ${currentTeam === 'red' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${teamColorText}`}>
                  Shooters for this Volley
                  {activeIndices.length < 6 && <span className="text-xs bg-white px-2 py-0.5 rounded border shadow-sm">Balls Back Active</span>}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeIndices.map(playerIdx => {
                    const playerName = currentTeamPlayers[playerIdx];
                    const currentShot = currentVolleyShots[playerIdx];

                    return (
                      <div key={playerIdx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-gray-800 truncate">{playerName}</span>
                          <span className="text-xs font-mono text-gray-400">#{playerIdx + 1}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          {SHOT_TYPES.map(type => (
                            <button
                              key={type.id}
                              onClick={() => handleShotSelection(playerIdx, type.id)}
                              className={`
                                text-xs py-2 px-1 rounded border transition-all
                                ${currentShot === type.id 
                                  ? `${type.color} ring-2 ring-offset-1 ring-indigo-500 font-bold border-transparent` 
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                }
                              `}
                            >
                              {type.short}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 text-center h-5">
                          {currentShot && (
                            <span className="text-xs font-medium text-indigo-600">
                              Selected: {SHOT_TYPES.find(s => s.id === currentShot)?.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end p-4 bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 md:relative md:bg-transparent md:border-none">
                <Button onClick={submitVolley} className="w-full md:w-auto px-12 py-3 text-lg shadow-xl">
                  Submit Volley <CheckCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'grid' && (
            <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 sticky left-0 bg-gray-50 z-10">Turn Info</th>
                    {INITIAL_PLAYERS_RED.map((_, i) => (
                      <th key={i} className="px-6 py-3 whitespace-nowrap">Player {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        No shots recorded yet.
                      </td>
                    </tr>
                  )}
                  {history.map((volley, vIndex) => {
                    const isRed = volley.team === 'red';
                    const players = isRed ? redTeam : blueTeam;
                    
                    return (
                      <tr key={volley.id} className={`hover:bg-gray-50 ${isRed ? 'bg-red-50/30' : 'bg-blue-50/30'}`}>
                        <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-gray-100">
                          <div className="font-bold text-gray-900">Turn {volley.turnNumber}</div>
                          <div className={`text-xs uppercase font-bold tracking-wider ${isRed ? 'text-red-600' : 'text-blue-600'}`}>
                            {getTeamName(volley.team)}
                          </div>
                        </td>
                        {players.map((pName, pIndex) => {
                          const shotId = volley.shots[pIndex];
                          const shot = SHOT_TYPES.find(s => s.id === shotId);
                          const isEditing = editCell?.volleyIndex === vIndex && editCell?.playerIndex === pIndex;

                          if (isEditing) {
                            return (
                              <td key={pIndex} className="px-2 py-2 bg-white border border-indigo-300">
                                <select 
                                  className="w-full text-xs p-1 border rounded"
                                  autoFocus
                                  value={shotId || 'miss'}
                                  onChange={(e) => updateHistoryCell(vIndex, pIndex, e.target.value)}
                                  onBlur={() => setEditCell(null)}
                                >
                                  {SHOT_TYPES.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                  ))}
                                </select>
                              </td>
                            )
                          }

                          return (
                            <td 
                              key={pIndex} 
                              className="px-6 py-4 cursor-pointer hover:bg-gray-100"
                              onClick={() => setEditCell({ volleyIndex: vIndex, playerIndex: pIndex })}
                              title={`Click to edit ${pName}'s shot`}
                            >
                              {shot ? (
                                <span className={`px-2 py-1 rounded text-xs font-bold ${shot.color}`}>
                                  {shot.label}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              stats={stats}
              redTeam={redTeam}
              blueTeam={blueTeam}
              redTeamName={redTeamName}
              blueTeamName={blueTeamName}
            />
          )}
        </div>
      </div>
    );
  };

  const AnalyticsView = ({ stats, redTeam, blueTeam, redTeamName, blueTeamName }) => {
    const renderTeamStats = (players, teamName, colorClass) => (
      <Card className="mb-8 p-0 overflow-hidden">
        <div className={`px-6 py-4 border-b border-gray-200 ${colorClass} bg-opacity-10`}>
          <h3 className={`text-lg font-bold ${colorClass.replace('bg-', 'text-').replace('-500', '-700')}`}>{teamName} Stats</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-center">Shooting %</th>
                <th className="px-4 py-3 text-center">Shots</th>
                <th className="px-4 py-3 text-center">Makes</th>
                <th className="px-4 py-3 text-center">Misses</th>
                <th className="px-4 py-3 text-center bg-yellow-50">Early Game %</th>
                <th className="px-4 py-3 text-center bg-indigo-50">Late Game %</th>
                {SHOT_TYPES.filter(t => t.id !== 'miss').map(t => (
                  <th key={t.id} className="px-2 py-3 text-center text-xs text-gray-400">{t.short}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {players.map(name => {
                const p = stats[name];
                if (!p) return null;
                const pct = calculatePercentage(p.makes, p.shots);
                const { earlyPct, latePct, earlyCount, lateCount } = getEarlyLateStats(p);

                return (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded font-bold ${pct >= 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.shots}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{p.makes}</td>
                    <td className="px-4 py-3 text-center text-red-400">{p.misses}</td>
                    <td className="px-4 py-3 text-center bg-yellow-50/50">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-yellow-700">{earlyPct}%</span>
                        <span className="text-[10px] text-gray-400">({earlyCount} shots)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center bg-indigo-50/50">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-indigo-700">{latePct}%</span>
                        <span className="text-[10px] text-gray-400">({lateCount} shots)</span>
                      </div>
                    </td>
                    {SHOT_TYPES.filter(t => t.id !== 'miss').map(t => (
                      <td key={t.id} className="px-2 py-3 text-center text-xs text-gray-500 border-l border-gray-50">
                        {p.types[t.id]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );

    return (
      <div className="space-y-6 animate-in fade-in">
         {renderTeamStats(redTeam, redTeamName, "bg-red-500")}
         {renderTeamStats(blueTeam, blueTeamName, "bg-blue-500")}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {gameState === 'setup' ? SetupView() : PlayView()}
    </div>
  );
}

// Mount the app when included via a bundler entry (e.g., Vite)
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<CCStatTaker />);
}
