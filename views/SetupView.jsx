import React from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { Card, Button } from '../components/ui';

export default function SetupView({
  isLeague,
  setIsLeague,
  redTeamName,
  setRedTeamName,
  blueTeamName,
  setBlueTeamName,
  redTeam,
  setRedTeam,
  blueTeam,
  setBlueTeam,
  startGame,
}) {
  return (
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
              onChange={(e) => setIsLeague(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-gray-700">League Game</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
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
}
