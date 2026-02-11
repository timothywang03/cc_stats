import React, { useMemo } from 'react';
import { Card } from '../components/ui';

export default function AnalyticsView({
  stats,
  history,
  redTeam,
  blueTeam,
  redTeamName,
  blueTeamName,
  shotTypes,
  calculatePercentage,
}) {
  const playerDerivedStats = useMemo(() => {
    const STARTING_CUPS_IN_PLAY = 60;
    const perPlayer = {};
    let cupsInPlay = STARTING_CUPS_IN_PLAY;

    history.forEach((volley) => {
      const teamPlayers = volley.team === 'red' ? redTeam : blueTeam;
      Object.keys(volley.shots)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((playerIndex) => {
          const shotId = volley.shots[playerIndex];
          const shotDef = shotTypes.find((s) => s.id === shotId);
          const isMake = Boolean(shotDef && shotDef.value > 0);
          const key = `${volley.team}:${playerIndex}`;

          if (!perPlayer[key]) {
            perPlayer[key] = {
              turns: new Set(),
              earlyShots: 0,
              earlyMakes: 0,
              lateShots: 0,
              lateMakes: 0,
            };
          }

          perPlayer[key].turns.add(volley.turnNumber);
          if (cupsInPlay > 30) {
            perPlayer[key].earlyShots += 1;
            if (isMake) perPlayer[key].earlyMakes += 1;
          }
          if (cupsInPlay < 30) {
            perPlayer[key].lateShots += 1;
            if (isMake) perPlayer[key].lateMakes += 1;
          }

          if (isMake && cupsInPlay > 0) {
            cupsInPlay -= 1;
          }
        });
    });

    return Object.fromEntries(
      Object.entries(perPlayer).map(([key, value]) => [
        key,
        {
          turns: value.turns.size,
          earlyShots: value.earlyShots,
          earlyMakes: value.earlyMakes,
          lateShots: value.lateShots,
          lateMakes: value.lateMakes,
        },
      ])
    );
  }, [history, redTeam, blueTeam, shotTypes]);

  const formatAvg = (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');

  const renderTeamStats = (players, teamName, teamKey, colorClass) => (
    <Card className="mb-8 p-0 overflow-hidden">
      <div className={`px-6 py-2 border-b border-gray-200 ${colorClass} bg-opacity-10`}>
        <h3 className={`text-lg font-bold ${colorClass.replace('bg-', 'text-').replace('-500', '-700')}`}>{teamName} Stats</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-4 py-1.5 text-left">Player</th>
              <th className="px-4 py-1.5 text-center"># Shots</th>
              <th className="px-4 py-1.5 text-center"># Tops</th>
              <th className="px-4 py-1.5 text-center"># Bottoms</th>
              <th className="px-4 py-1.5 text-center"># Top Islands</th>
              <th className="px-4 py-1.5 text-center"># Bottom Islands</th>
              <th className="px-4 py-1.5 text-center bg-yellow-50">Total Cups</th>
              <th className="px-4 py-1.5 text-center">Total Misses</th>
              <th className="px-4 py-1.5 text-center">Shooting %</th>
              <th className="px-4 py-1.5 text-center">Avg Shots / Turn</th>
              <th className="px-4 py-1.5 text-center">Avg Misses / Turn</th>
              <th className="px-4 py-1.5 text-center">Early Game %</th>
              <th className="px-4 py-1.5 text-center">Late Game %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {players.map((name, playerIndex) => {
              const p = stats[name];
              if (!p) return null;
              const derived = playerDerivedStats[`${teamKey}:${playerIndex}`] || {
                turns: 0,
                earlyShots: 0,
                earlyMakes: 0,
                lateShots: 0,
                lateMakes: 0,
              };
              const pct = calculatePercentage(p.makes, p.shots);
              const earlyPct = calculatePercentage(derived.earlyMakes, derived.earlyShots);
              const latePct = calculatePercentage(derived.lateMakes, derived.lateShots);
              const avgShotsPerTurn = derived.turns === 0 ? 0 : p.shots / derived.turns;
              const avgMissesPerTurn = derived.turns === 0 ? 0 : p.misses / derived.turns;

              return (
                <tr key={name} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{name}</td>
                  <td className="px-4 py-1.5 text-center text-gray-600">{p.shots}</td>
                  <td className="px-4 py-1.5 text-center text-gray-600">{p.types.top || 0}</td>
                  <td className="px-4 py-1.5 text-center text-gray-600">{p.types.bottom || 0}</td>
                  <td className="px-4 py-1.5 text-center text-gray-600">{p.types.top_island || 0}</td>
                  <td className="px-4 py-1.5 text-center text-gray-600">{p.types.bottom_island || 0}</td>
                  <td className="px-4 py-1.5 text-center text-green-600 font-medium bg-yellow-50/50">{p.makes}</td>
                  <td className="px-4 py-1.5 text-center text-red-400">{p.misses}</td>
                  <td className="px-4 py-1.5 text-center">
                    <span className={`px-2 py-1 rounded font-bold ${pct >= 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {pct}%
                    </span>
                  </td>
                  <td className="px-4 py-1.5 text-center text-gray-600">{formatAvg(avgShotsPerTurn)}</td>
                  <td className="px-4 py-1.5 text-center text-gray-600">{formatAvg(avgMissesPerTurn)}</td>
                  <td className="px-4 py-1.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-yellow-700">{earlyPct}%</span>
                      <span className="text-[10px] text-gray-400">({derived.earlyShots} shots)</span>
                    </div>
                  </td>
                  <td className="px-4 py-1.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-indigo-700">{latePct}%</span>
                      <span className="text-[10px] text-gray-400">({derived.lateShots} shots)</span>
                    </div>
                  </td>
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
      {renderTeamStats(redTeam, redTeamName, 'red', 'bg-red-500')}
      {renderTeamStats(blueTeam, blueTeamName, 'blue', 'bg-blue-500')}
    </div>
  );
}
