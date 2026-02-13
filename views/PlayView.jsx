import React from 'react';
import { Activity, Grid, RotateCcw, Save, Edit2, CheckCircle } from 'lucide-react';
import { Card, Button } from '../components/ui';
import AnalyticsView from './AnalyticsView';

export default function PlayView({
  gameName,
  isLeague,
  turnNumber,
  currentTeam,
  redTeamName,
  blueTeamName,
  history,
  downloadSpreadsheet,
  setGameState,
  activeTab,
  setActiveTab,
  activeIndices,
  currentVolleyShots,
  handleShotSelection,
  clearCurrentVolleySelections,
  submitVolley,
  redTeam,
  blueTeam,
  getTeamName,
  editCell,
  setEditCell,
  updateHistoryCell,
  shotTypes,
  stats,
  calculatePercentage,
  getEarlyLateStats,
}) {
  const currentTeamName = currentTeam === 'red' ? redTeamName : blueTeamName;
  const currentTeamPlayers = currentTeam === 'red' ? redTeam : blueTeam;
  const teamColorText = currentTeam === 'red' ? 'text-red-600' : 'text-blue-600';
  const displayGameName = gameName?.trim() || 'Untitled Game';
  const playerRows = [
    ...redTeam.map((name, index) => ({ team: 'red', name, index })),
    ...blueTeam.map((name, index) => ({ team: 'blue', name, index })),
  ];
  const teamScores = history.reduce(
    (acc, volley) => {
      const volleyHits = Object.values(volley.shots).reduce((sum, shotId) => {
        const shot = shotTypes.find((s) => s.id === shotId);
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
      <Card className="p-4 !bg-gray-900 !text-white !border-0 space-y-4">
        <div className="w-full text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{displayGameName}</h2>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10">
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
            <Button variant="secondary" className="bg-white/90 text-gray-900 border-white/30 hover:bg-white" onClick={downloadSpreadsheet}>
              <Save className="w-4 h-4" /> Download Game Stats
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => {
                if (window.confirm('Are you sure you want to completely reset this game? This action cannot be undone.')) {
                  setGameState('setup');
                }
              }}
            >
              <RotateCcw className="w-4 h-4" /> Reset Game
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex border-b border-gray-200 gap-6 px-2">
        {[
          { id: 'input', label: 'Enter Stats', icon: Edit2 },
          { id: 'grid', label: 'History Grid', icon: Grid },
          { id: 'analytics', label: 'Analytics', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'input' && (
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border ${currentTeam === 'red' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className={`text-lg font-bold flex items-center gap-2 ${teamColorText}`}>
                  Shooters for this Volley
                  {activeIndices.length < 6 && <span className="text-xs bg-white px-2 py-0.5 rounded border shadow-sm">Balls Back Active</span>}
                </h3>
                <Button
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  onClick={clearCurrentVolleySelections}
                  disabled={Object.keys(currentVolleyShots).length === 0}
                >
                  Unselect All
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeIndices.map((playerIdx) => {
                  const playerName = currentTeamPlayers[playerIdx];
                  const currentShot = currentVolleyShots[playerIdx];

                  return (
                    <div key={playerIdx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-gray-800 truncate">{playerName}</span>
                        <span className="text-xs font-mono text-gray-400">#{playerIdx + 1}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {shotTypes.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => handleShotSelection(playerIdx, type.id)}
                            className={`
                              text-xs py-2 px-1 rounded border transition-all
                              ${
                                currentShot === type.id
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
                        {currentShot && <span className="text-xs font-medium text-indigo-600">Selected: {shotTypes.find((s) => s.id === currentShot)?.label}</span>}
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
                  <th className="px-1.5 py-1.5 sticky left-0 bg-gray-50 z-10">Player</th>
                  {history.map((volley) => (
                    <th key={volley.id} className="px-1.5 py-1.5 whitespace-nowrap text-center">
                      <div className="font-bold">Turn {volley.turnNumber}</div>
                      <div className={volley.team === 'red' ? 'text-red-600' : 'text-blue-600'}>{getTeamName(volley.team)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-1.5 py-6 text-center text-gray-400">
                      No shots recorded yet.
                    </td>
                  </tr>
                )}
                {playerRows.map((player, rowIndex) => {
                  const isTeamDivider = rowIndex > 0 && player.team !== playerRows[rowIndex - 1].team;
                  const dividerClass = isTeamDivider ? 'border-t-2 border-gray-300' : '';

                  return (
                  <tr key={`${player.team}-${player.index}`} className="hover:bg-gray-50">
                    <td className={`px-1.5 py-2 sticky left-0 bg-white z-10 border-r border-gray-100 ${dividerClass}`}>
                      <div className="font-bold text-gray-900">{player.name}</div>
                      <div className={`text-xs uppercase font-bold tracking-wider ${player.team === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
                        {getTeamName(player.team)}
                      </div>
                    </td>
                    {history.map((volley, vIndex) => {
                      const isPlayableCell = volley.team === player.team;
                      const shotId = isPlayableCell ? volley.shots[player.index] : undefined;
                      const shot = shotTypes.find((s) => s.id === shotId);
                      const isEditing =
                        isPlayableCell && editCell?.volleyIndex === vIndex && editCell?.playerIndex === player.index;

                      if (isEditing) {
                        return (
                          <td key={volley.id} className={`px-0.5 py-1 bg-white border border-indigo-300 ${dividerClass}`}>
                            <select
                              className="w-full text-xs p-1 border rounded"
                              autoFocus
                              value={shotId || 'miss'}
                              onChange={(e) => updateHistoryCell(vIndex, player.index, e.target.value)}
                              onBlur={() => setEditCell(null)}
                            >
                              {shotTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                            </select>
                          </td>
                        );
                      }

                      if (!isPlayableCell) {
                        return (
                          <td key={volley.id} className={`px-1.5 py-2 text-center bg-gray-50/50 ${dividerClass}`}>
                            <span className="text-gray-200">-</span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={volley.id}
                          className={`px-1.5 py-2 cursor-pointer hover:bg-gray-100 text-center ${dividerClass}`}
                          onClick={() => setEditCell({ volleyIndex: vIndex, playerIndex: player.index })}
                          title={`Click to edit ${player.name}'s shot`}
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
                )})}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            stats={stats}
            history={history}
            redTeam={redTeam}
            blueTeam={blueTeam}
            redTeamName={redTeamName}
            blueTeamName={blueTeamName}
            shotTypes={shotTypes}
            calculatePercentage={calculatePercentage}
          />
        )}
      </div>
    </div>
  );
}
