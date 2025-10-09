import React from 'react';
import { usePairSearch, TradingPair } from '@/hooks/ordersignal/usePairSearch';

interface SearchBarProps {
  onSelectPair: (pairAddress: string, tokenSymbol: string) => void;
  defaultValue?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelectPair, defaultValue }) => {
  const {
    searchQuery,
    searchResults,
    loading,
    showDropdown,
    setShowDropdown,
    handleSearchChange,
    clearSearch
  } = usePairSearch();

  const handlePairSelect = (pair: TradingPair) => {
    const pairAddress = pair.pairAddress;
    const tokenSymbol = pair.baseToken.symbol;
    
    onSelectPair(pairAddress, tokenSymbol);
    setShowDropdown(false);
  };

  const formatLiquidity = (liquidity?: number) => {
    if (!liquidity) return 'N/A';
    if (liquidity >= 1000000) {
      return `$${(liquidity / 1000000).toFixed(2)}M`;
    } else if (liquidity >= 1000) {
      return `$${(liquidity / 1000).toFixed(2)}K`;
    }
    return `$${liquidity.toFixed(0)}`;
  };

  // Get fallback logo from public/assets
  const getFallbackLogo = (tokenSymbol: string): string | null => {
    const symbol = tokenSymbol.toUpperCase();
    const logoMap: Record<string, string> = {
      'WAVAX': '/assets/avax-logo-showdetails.png',
      'AVAX': '/assets/avax-logo-showdetails.png',
      'BTC.B': '/assets/btc.png',
      'WBTC.E': '/assets/btc.png',
      'USDC': '/assets/usdc.png',
      'USDC.E': '/assets/usdc.png',
    };
    return logoMap[symbol] || null;
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          placeholder={defaultValue ? `Currently showing: ${defaultValue}` : "Search token pairs on Avalanche (e.g., ORDER, AVAX, JOE)..."}
          className="w-full pl-12 pr-12 py-4 bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />

        {loading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
          </div>
        )}

        {searchQuery && !loading && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl max-h-96 overflow-y-auto">
          <div className="p-2">
            {searchResults.map((pair, index) => (
              <button
                key={`${pair.pairAddress}-${index}`}
                onClick={() => handlePairSelect(pair)}
                className="w-full p-4 rounded-xl hover:bg-gray-700/50 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Token Logo with fallback priority: API > Local Assets > Gradient */}
                    <img 
                      src={pair.info?.imageUrl || getFallbackLogo(pair.baseToken.symbol) || ''} 
                      alt={pair.baseToken.symbol}
                      className={`w-10 h-10 rounded-full object-cover border-2 border-purple-500/30 ${
                        !pair.info?.imageUrl && !getFallbackLogo(pair.baseToken.symbol) ? 'hidden' : ''
                      }`}
                      onError={(e) => {
                        // Fallback to gradient if all images fail
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div 
                      className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold ${
                        (pair.info?.imageUrl || getFallbackLogo(pair.baseToken.symbol)) ? 'hidden' : ''
                      }`}
                    >
                      {pair.baseToken.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold group-hover:text-purple-400 transition-colors">
                          {pair.baseToken.symbol}
                        </span>
                        <span className="text-gray-500">/</span>
                        <span className="text-gray-400 text-sm">{pair.quoteToken.symbol}</span>
                      </div>
                      <p className="text-xs text-gray-500">{pair.baseToken.name}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {pair.priceUsd && (
                      <p className="text-white font-medium">
                        ${parseFloat(pair.priceUsd) < 0.01 
                          ? parseFloat(pair.priceUsd).toFixed(6) 
                          : parseFloat(pair.priceUsd).toFixed(4)}
                      </p>
                    )}
                    {pair.liquidity && (
                      <p className="text-xs text-gray-400">
                        Liq: {formatLiquidity(pair.liquidity.usd)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    {pair.dexId}
                  </span>
                  {pair.fdv && (
                    <span className="text-gray-500">
                      FDV: ${(pair.fdv / 1000000).toFixed(2)}M
                    </span>
                  )}
                  {pair.marketCap && (
                    <span className="text-gray-500">
                      MC: ${(pair.marketCap / 1000000).toFixed(2)}M
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Close Dropdown Hint */}
          <div className="p-3 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-500">
              Click a pair to analyze • Press ESC to close
            </p>
          </div>
        </div>
      )}

      {/* No Results */}
      {showDropdown && !loading && searchQuery && searchResults.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-6 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No pairs found for "{searchQuery}"</p>
            <p className="text-xs mt-2 text-gray-500">Try searching with token symbol (e.g., ORDER, AVAX)</p>
          </div>
        </div>
      )}
    </div>
  );
};
