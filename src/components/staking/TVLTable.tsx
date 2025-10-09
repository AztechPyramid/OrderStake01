import React, { useState } from 'react';
import { formatUSD, formatNumber, formatCompactNumber } from '@/utils/formatters';
import { useEnhancedTVLData } from '@/hooks/useEnhancedTVLData';
import { useTokenBalance } from '@/hooks/useTokenBalance';
// Token logo and name data (same as TokenBalancesDashboard)
const TOKENS = [
  {
    symbol: 'ORDER',
    name: 'Order Token',
    logo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
  },
  {
    symbol: 'WITCH',
    name: 'Witch Token',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F2b4039e7-40aa-43f4-5328-be3b27fb90371746910733471.jpeg&w=96&q=75',
  },
  {
    symbol: 'KOKSAL',
    name: 'Koksal Token',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2Fbfa8b7d1-a4d1-4fa1-e276-32e4a8505b1c1753997742607.jpeg&w=96&q=75',
  },
  {
    symbol: 'STANK',
    name: 'Stank Token',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2Fe6746c46-5124-de74-f0e2-4ce94df1a3a71746580775916.jpeg&w=96&q=75',
  },
  {
    symbol: 'xORDER',
    name: 'xOrder Token',
    logo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
  },
  {
    symbol: 'xARENA',
    name: 'xArena Token',
    logo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
  },
];

interface TVLTableProps {
  searchQuery?: string;
}


export const TVLTable = ({ searchQuery = '' }: TVLTableProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { 
    pools, 
    totalTVLUsd, 
    arenaTVLUsd,
    ecosystemTVLUsd, 
    orderPrice,
    totalArenaPoolsCount,
    totalEcosystemPoolsCount 
  } = useEnhancedTVLData();
  
  // Calculate total staked ORDER amount (sum of tvlOrderAmount from arena pools only)
  const totalOrderStaked = pools
    .filter(pool => !pool.isEcosystemPool)
    .reduce((sum, pool) => sum + (pool.tvlOrderAmount || 0), 0);

  // Filter pools based on search query
  const filteredPools = pools.filter(pool => 
    pool.pool?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.stakingToken?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.rewardToken?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Arena Pools Card - Clickable - Reduced Height */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-gradient-to-br from-gray-800 via-gray-800 to-orange-900/20 border-2 border-orange-600/30 rounded-xl p-3 shadow-lg shadow-orange-600/10 cursor-pointer hover:scale-105 transition-transform duration-200 hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent flex items-center">
            🏛️ Arena Pools
          </h2>
          <div className="text-right">
            <p className="text-xs text-orange-200/80">Total TVL</p>
            <p className="text-lg font-bold text-orange-400">{formatUSD(totalTVLUsd)}</p>
            <p className="text-xs text-orange-200/60">Arena: {formatUSD(arenaTVLUsd)} | Ecosystem: {formatUSD(ecosystemTVLUsd)}</p>
            <p className="text-xs text-orange-200/60">ORDER: ${formatNumber(orderPrice, 9)}</p>
            <p className="text-xs text-orange-200/80 mt-1">
              <span className="font-bold">Total ORDER Staked:</span> {formatCompactNumber(totalOrderStaked)} ORDER
            </p>
            <p className="text-xs text-orange-200/60 mt-1">
              Arena: {totalArenaPoolsCount} | Ecosystem: {totalEcosystemPoolsCount} pools
            </p>
            {searchQuery && (
              <p className="text-xs text-orange-400 mt-1">
                ⚔️ Showing {filteredPools.length} pool(s)
              </p>
            )}
          </div>
        </div>

        <div className="text-center text-orange-300/70 text-xs">
          Click to view detailed TVL breakdown →
        </div>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-orange-900/20 border-2 border-orange-600/50 rounded-xl p-6 shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent flex items-center">
                🏛️ Enhanced TVL - Arena + Ecosystem Pools
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-orange-400 hover:text-white text-2xl font-bold bg-gray-700/50 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* TVL Summary */}
            <div className="bg-gray-900/50 border border-orange-600/30 rounded-lg p-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-orange-200/80 mb-2">Combined TVL (Arena + Ecosystem)</p>
                <p className="text-3xl font-bold text-orange-400 mb-2">{formatUSD(totalTVLUsd)}</p>
                <div className="flex justify-center space-x-6 text-sm text-orange-200/60">
                  <span>Arena: {formatUSD(arenaTVLUsd)}</span>
                  <span>Ecosystem: {formatUSD(ecosystemTVLUsd)}</span>
                </div>
                <p className="text-sm text-orange-200/60 mt-2">ORDER Price: ${formatNumber(orderPrice, 4)}</p>
                <div className="flex justify-center space-x-6 text-sm text-orange-200/80 mt-2">
                  <span>Arena Pools: {totalArenaPoolsCount}</span>
                  <span>Ecosystem Pools: {totalEcosystemPoolsCount}</span>
                </div>
                {searchQuery && (
                  <p className="text-sm text-orange-400 mt-2">
                    🔍 Showing {filteredPools.length} pool(s) matching "{searchQuery}"
                  </p>
                )}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-orange-600/30">
                    <th className="text-left py-3 text-orange-200/80 font-medium">Arena Pool</th>
                    <th className="text-right py-3 text-orange-200/80 font-medium">TVL (USD)</th>
                    <th className="text-right py-3 text-orange-200/80 font-medium">Token Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPools.map((row) => {
                    // Find logo for reward token
                    const rewardToken = TOKENS.find(t => t.symbol === row.rewardToken);
                    return (
                      <tr key={`${row.pool}-${row.rewardToken}`} className="border-b border-orange-600/20 hover:bg-orange-900/20 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            {rewardToken && (
                              <img
                                src={rewardToken.logo}
                                alt={rewardToken.symbol}
                                className="w-10 h-10 rounded-full border-2 border-orange-500/50 bg-white shadow-lg shadow-orange-500/20"
                              />
                            )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-medium">{row.pool}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  row.isEcosystemPool 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                }`}>
                                  {row.isEcosystemPool ? 'Ecosystem' : 'Arena'}
                                </span>
                              </div>
                              <div className="text-xs text-orange-200/60">{row.stakingToken} → {row.rewardToken}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-4">
                          <div className="text-white font-semibold text-lg">{formatUSD(row.tvlUsd)}</div>
                        </td>
                        <td className="text-right py-4">
                          <div className="text-orange-200 font-medium">
                            {row.isEcosystemPool 
                              ? `${formatCompactNumber((row as any).tvlTokenAmount || 0)} ${row.stakingToken}`
                              : `${formatCompactNumber(row.tvlOrderAmount || 0)} ORDER`
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Simple wallet modal component
function WalletModal({ onClose }: Readonly<{ onClose: () => void }>) {
  // Get balances for all tokens
  const order = useTokenBalance('ORDER');
  const witch = useTokenBalance('WITCH');
  const koksal = useTokenBalance('KOKSAL');
  const stank = useTokenBalance('STANK');
  const xorder = useTokenBalance('xORDER');
  const xarena = useTokenBalance('xARENA');
  const balances = [order, witch, koksal, stank, xorder, xarena];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative bg-gray-900 border border-orange-700 rounded-xl shadow-2xl p-6 w-full max-w-md z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-orange-400">Wallet Balances</h3>
          <button onClick={onClose} className="text-orange-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-4">
          {TOKENS.map((token, i) => (
            <div key={token.symbol} className="flex items-center space-x-4 p-3 bg-gray-800 rounded-lg border border-orange-700/30">
              <img src={token.logo} alt={token.symbol} className="w-10 h-10 rounded-full border-2 border-orange-500/50 bg-white shadow-lg shadow-orange-500/20" />
              <div className="flex-1">
                <div className="text-white font-semibold">{token.name}</div>
                <div className="text-orange-200 text-xs">{token.symbol}</div>
              </div>
              <div className="text-right">
                {balances[i].isLoading ? (
                  <span className="text-gray-400 animate-pulse">Loading...</span>
                ) : (
                  <span className="text-orange-400 font-bold text-lg">{balances[i].balance}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
