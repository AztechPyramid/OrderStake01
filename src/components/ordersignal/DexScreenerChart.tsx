import React from 'react';
import { FibonacciLevel } from '@/hooks/ordersignal/useFibonacci';
import { Timeframe } from '@/hooks/ordersignal/useSignals';
import { formatPrice } from '@/utils/formatNumber';

interface DexScreenerChartProps {
  currentPrice: number;
  supports: FibonacciLevel[];
  resistances: FibonacciLevel[];
  timeframe: Timeframe;
  tokenSymbol: string;
  pairAddress: string;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const DexScreenerChart: React.FC<DexScreenerChartProps> = ({
  currentPrice,
  supports,
  resistances,
  timeframe,
  tokenSymbol,
  pairAddress,
  onTimeframeChange
}) => {
  // Map our timeframes to DexScreener's format
  const getDexScreenerTimeframe = (tf: Timeframe): string => {
    const mapping: Record<Timeframe, string> = {
      '15m': '15',
      '1H': '60',
      '4H': '240',
      '1D': '1D',
      '1W': '1W'
    };
    return mapping[tf] || '60';
  };

  return (
    <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {timeframe} Chart
            </h3>
            <p className="text-sm text-gray-400">DexScreener • {tokenSymbol}</p>
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex gap-1">
          {(['15m', '1H', '4H', '1D', '1W'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                timeframe === tf 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-700/50 text-gray-400 hover:bg-purple-500/20'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* DexScreener Embedded Chart */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900/50" style={{ height: '500px' }}>
        <iframe
          key={`${pairAddress}-${timeframe}`}
          src={`https://dexscreener.com/avalanche/${pairAddress}?embed=1&theme=dark&trades=0&info=0`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '12px'
          }}
          title={`${tokenSymbol} Chart`}
        />
      </div>

      {/* Timeframe Note */}
      <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <p className="text-xs text-blue-400 text-center">
          💡 Selected timeframe: <span className="font-bold">{timeframe}</span> - Use chart controls for timeframe change
        </p>
      </div>

      {/* Fibonacci Levels Display */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Support Levels */}
        <div className="bg-gray-900/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded"></div>
            <h4 className="text-xs font-bold text-green-400">SUPPORT</h4>
          </div>
          <div className="space-y-2">
            {supports.slice(0, 3).map((support, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{support.label}</span>
                <span className="text-xs font-medium text-green-400">{formatPrice(support.price)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resistance Levels */}
        <div className="bg-gray-900/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded"></div>
            <h4 className="text-xs font-bold text-red-400">RESISTANCE</h4>
          </div>
          <div className="space-y-2">
            {resistances.slice(0, 3).map((resistance, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{resistance.label}</span>
                <span className="text-xs font-medium text-red-400">{formatPrice(resistance.price)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Price Badge */}
      <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 text-center">
        <div className="text-xs text-gray-400 mb-1">Current Price</div>
        <div className="text-xl font-bold text-white">{formatPrice(currentPrice)}</div>
      </div>

      {/* Info Footer */}
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>Live chart from DexScreener • Fibonacci levels calculated in real-time</p>
      </div>
    </div>
  );
};
