import React, { useState, useEffect } from 'react';
import { useTetrisGame } from '../../hooks/useTetrisGame';
import { useArenaSDK } from '../../hooks/useArenaSDK';

interface LeaderboardEntry {
  level: number;
  address: string;
  profile: any;
  highScore: number;
  gamesPlayed: number;
}

const TetrisLeaderboard: React.FC = () => {
  const { getTetrisGameContract } = useTetrisGame();
  const { sdk } = useArenaSDK();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async () => {
    if (!getTetrisGameContract) return;
    
    setLoading(true);
    try {
      const contract = await getTetrisGameContract();
      const leaderboardData: LeaderboardEntry[] = [];

      // Check leaderboard for different levels
      const levelsToCheck = [50, 25, 10, 5, 1];
      
      for (const level of levelsToCheck) {
        try {
          const address = await contract.getLeaderboard(level);
          
          if (address && address !== '0x0000000000000000000000000000000000000000') {
            // Get player info
            const playerInfo = await contract.getPlayerInfo(address);
            
            // Try to get Arena profile
            let profile = null;
            if (sdk) {
              try {
                profile = await sdk.getUserProfile(address);
              } catch (err) {
                console.log('Could not fetch profile for:', address);
              }
            }
            
            leaderboardData.push({
              level,
              address,
              profile,
              highScore: Number(playerInfo.highScore),
              gamesPlayed: Number(playerInfo.gamesPlayed)
            });
          }
        } catch (err) {
          console.error(`Error fetching leaderboard for level ${level}:`, err);
        }
      }
      
      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [getTetrisGameContract, sdk]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getLevelIcon = (level: number) => {
    if (level >= 50) return '🏆';
    if (level >= 25) return '🥈';
    if (level >= 10) return '🥉';
    if (level >= 5) return '🎖️';
    return '🎮';
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'text-yellow-400';
    if (level >= 25) return 'text-gray-300';
    if (level >= 10) return 'text-orange-400';
    if (level >= 5) return 'text-blue-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-4">🏆 Leaderboard</h3>
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">🏆 Leaderboard</h3>
        <button
          onClick={fetchLeaderboard}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
        >
          Refresh
        </button>
      </div>
      
      {leaderboard.length === 0 ? (
        <p className="text-gray-400 text-center">No leaderboard data yet</p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={`${entry.level}-${entry.address}`}
              className="bg-gray-700 p-3 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getLevelIcon(entry.level)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      {entry.profile?.username ? (
                        <span className="font-semibold text-white">
                          @{entry.profile.username}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-gray-300">
                          {formatAddress(entry.address)}
                        </span>
                      )}
                      <span className={`text-sm ${getLevelColor(entry.level)}`}>
                        Level {entry.level}+
                      </span>
                    </div>
                    {entry.profile?.bio && (
                      <p className="text-xs text-gray-400 mt-1">
                        {entry.profile.bio.slice(0, 50)}
                        {entry.profile.bio.length > 50 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{entry.highScore.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{entry.gamesPlayed} games</div>
                </div>
              </div>
              
              {entry.profile?.avatar && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={entry.profile.avatar}
                    alt={entry.profile.username || 'Profile'}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        Leaderboard shows the highest scorer for each level tier
      </div>
    </div>
  );
};

export default TetrisLeaderboard;