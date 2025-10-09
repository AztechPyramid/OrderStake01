import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { NewsPanel } from './NewsPanel';
import { DexScreenerChart } from './DexScreenerChart';
import { KeyLevelsCard } from './KeyLevelsCard';
import { ProfessionalDexAnalysis } from './ProfessionalDexAnalysis';
import { usePairData } from '@/hooks/ordersignal/usePairData';
import { useFibonacci } from '@/hooks/ordersignal/useFibonacci';
import { useSignals, Timeframe } from '@/hooks/ordersignal/useSignals';
import { useHistoricalPrices } from '@/hooks/ordersignal/useHistoricalPrices';
import { formatPrice, formatPercentage, formatNumber, formatCompact } from '@/utils/formatNumber';

// Default pair: ORDER/WAVAX
const DEFAULT_PAIR = '0x5147fff4794FD96c1B0E64dCcA921CA0EE1cdA8d';
const DEFAULT_SYMBOL = 'ORDER';

export const SignalDashboard: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState(DEFAULT_PAIR);
  const [tokenSymbol, setTokenSymbol] = useState(DEFAULT_SYMBOL);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1H');

  // Local logo fallback mapping
  const getFallbackLogo = (symbol: string): string | null => {
    const logoMap: Record<string, string> = {
      'WAVAX': '/assets/avax-logo-showdetails.png',
      'AVAX': '/assets/avax-logo-showdetails.png',
      'BTC.B': '/assets/btc.png',
      'WBTC.E': '/assets/btc.png',
      'USDC': '/assets/usdc.png',
      'USDT': '/assets/usdc.png', // Use USDC logo as fallback
    };
    return logoMap[symbol.toUpperCase()] || null;
  };
  
  const { pairData, loading, error, fetchPairData } = usePairData();

  // Calculate current price
  const currentPrice = pairData ? parseFloat(pairData.priceUsd) : 0;
  
  // Get historical prices for accurate Fibonacci calculations (based on selected timeframe)
  const { ranges: historicalRanges, loading: historicalLoading } = useHistoricalPrices(currentPrice, selectedTimeframe);
  
  // Map timeframe to range key
  const getRangeKey = (tf: Timeframe): '15m' | '1h' | '4h' | '1d' | '1w' => {
    const mapping: Record<Timeframe, '15m' | '1h' | '4h' | '1d' | '1w'> = {
      '15m': '15m',
      '1H': '1h',
      '4H': '4h',
      '1D': '1d',
      '1W': '1w'
    };
    return mapping[tf];
  };
  
  const rangeKey = getRangeKey(selectedTimeframe);
  const highForTimeframe = historicalRanges[rangeKey].high;
  const lowForTimeframe = historicalRanges[rangeKey].low;

  // Use Fibonacci hook with timeframe-specific historical data
  const { supports, resistances } = useFibonacci(currentPrice, highForTimeframe, lowForTimeframe);

  // Use Signals hook
  const signal = useSignals({
    pairData,
    timeframe: selectedTimeframe,
    currentPrice,
    supports,
    resistances
  });

  // Fetch initial data
  useEffect(() => {
    fetchPairData(selectedPair);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair]);

  // Handle pair selection from search
  const handleSelectPair = (pairAddress: string, symbol: string) => {
    setSelectedPair(pairAddress);
    setTokenSymbol(symbol);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            OrderPremium
          </h1>
          <p className="text-gray-400 text-lg">
            Professional Trading Analysis • Fibonacci Levels • Real-time News
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          onSelectPair={handleSelectPair}
          defaultValue={tokenSymbol}
        />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <p className="text-red-400 text-lg">{error}</p>
            <button
              onClick={() => fetchPairData(selectedPair)}
              className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && pairData && (
          <>
            {/* Pair Info Card */}
            <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {/* Token Logo with fallback priority: API > Local Assets > Gradient */}
                  <img 
                    src={pairData.info?.imageUrl || getFallbackLogo(pairData.baseToken.symbol) || ''} 
                    alt={pairData.baseToken.symbol}
                    className={`w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30 ${
                      !pairData.info?.imageUrl && !getFallbackLogo(pairData.baseToken.symbol) ? 'hidden' : ''
                    }`}
                    onError={(e) => {
                      // Fallback to gradient if all images fail
                      (e.target as HTMLImageElement).style.display = 'none';
                      const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div 
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold ${
                      (pairData.info?.imageUrl || getFallbackLogo(pairData.baseToken.symbol)) ? 'hidden' : ''
                    }`}
                  >
                    {pairData.baseToken.symbol.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {pairData.baseToken.symbol} / {pairData.quoteToken.symbol}
                    </h2>
                    <p className="text-gray-400">{pairData.baseToken.name}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{formatPrice(currentPrice)}</p>
                  <p className={`text-lg ${parseFloat(pairData.priceChange?.h24 || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(parseFloat(pairData.priceChange?.h24 || '0'))}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">1H Change</p>
                  <p className={`text-lg font-bold ${parseFloat(pairData.priceChange?.h1 || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(parseFloat(pairData.priceChange?.h1 || '0'))}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">6H Change</p>
                  <p className={`text-lg font-bold ${parseFloat(pairData.priceChange?.h6 || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(parseFloat(pairData.priceChange?.h6 || '0'))}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">24H Volume</p>
                  <p className="text-lg font-bold text-white">
                    ${formatCompact(pairData.volume?.h24 || 0)}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Liquidity</p>
                  <p className="text-lg font-bold text-white">
                    ${formatCompact(pairData.liquidity?.usd || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Signal Strength & Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Signal Strength Card */}
              <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-green-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      signal.type === 'BUY' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                      signal.type === 'SELL' ? 'bg-gradient-to-br from-red-500 to-pink-500' :
                      'bg-gradient-to-br from-gray-500 to-gray-600'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Signal Strength</h3>
                      <p className="text-sm text-gray-400">{selectedTimeframe} • {signal.strategyCount} strategies</p>
                    </div>
                  </div>

                  {/* Timeframe Selector */}
                  <div className="flex gap-1">
                    {(['15m', '1H', '4H', '1D', '1W'] as const).map(tf => (
                      <button
                        key={tf}
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-3 py-1 text-xs rounded-lg transition-all ${
                          selectedTimeframe === tf
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700/50 text-gray-400 hover:bg-green-500/20'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Signal Display */}
                <div className="space-y-4">
                  <div className={`p-6 rounded-xl border-2 ${
                    signal.type === 'BUY' ? 'bg-green-500/10 border-green-500' :
                    signal.type === 'SELL' ? 'bg-red-500/10 border-red-500' :
                    'bg-gray-500/10 border-gray-500'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-white">{signal.type}</span>
                      <span className="text-3xl font-bold text-white">{signal.strength}%</span>
                    </div>
                    
                    <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          signal.type === 'BUY' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          signal.type === 'SELL' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                          'bg-gradient-to-r from-gray-500 to-gray-600'
                        }`}
                        style={{ width: `${signal.strength}%` }}
                      ></div>
                    </div>

                    {/* Confidence Badge */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Confidence Level</span>
                      <span className={`font-bold ${
                        signal.confidence >= 70 ? 'text-green-400' :
                        signal.confidence >= 40 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {signal.confidence}%
                      </span>
                    </div>
                  </div>

                  {/* Strategy Info Footer */}
                  <div className="text-center text-xs text-gray-500">
                    <p>Analysis based on {signal.strategyCount} technical indicators and market metrics</p>
                  </div>
                </div>
              </div>

              {/* DexScreener Chart */}
              <DexScreenerChart
                currentPrice={currentPrice}
                supports={supports}
                resistances={resistances}
                timeframe={selectedTimeframe}
                tokenSymbol={tokenSymbol}
                pairAddress={selectedPair}
                onTimeframeChange={setSelectedTimeframe}
              />
            </div>

            {/* Key Levels Card */}
            <KeyLevelsCard
              supports={supports}
              resistances={resistances}
              currentPrice={currentPrice}
              signalType={signal.type}
              signalStrength={signal.strength}
              tokenSymbol={tokenSymbol}
            />

            {/* Professional DEX Analysis */}
            <ProfessionalDexAnalysis
              pairData={pairData}
              currentPrice={currentPrice}
              tokenSymbol={tokenSymbol}
            />

            {/* News Panel */}
            <NewsPanel tokenSymbol={tokenSymbol} />
          </>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>
    </div>
  );
};

export default SignalDashboard;
