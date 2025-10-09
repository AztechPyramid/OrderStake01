import React from 'react';
import { FibonacciLevel } from '@/hooks/ordersignal/useFibonacci';
import { SignalType } from '@/hooks/ordersignal/useSignals';
import { formatPrice } from '@/utils/formatNumber';

interface KeyLevelsCardProps {
  supports: FibonacciLevel[];
  resistances: FibonacciLevel[];
  currentPrice: number;
  signalType: SignalType;
  signalStrength: number;
  tokenSymbol: string;
}

export const KeyLevelsCard: React.FC<KeyLevelsCardProps> = ({
  supports,
  resistances,
  currentPrice,
  signalType,
  signalStrength,
  tokenSymbol
}) => {
  const getSignalColor = () => {
    switch (signalType) {
      case 'BUY':
        return 'from-green-500 to-emerald-500';
      case 'SELL':
        return 'from-red-500 to-pink-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getSignalBadgeColor = () => {
    switch (signalType) {
      case 'BUY':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'SELL':
        return 'bg-red-500/20 text-red-400 border-red-500';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  const calculateDistance = (price: number) => {
    const distance = ((price - currentPrice) / currentPrice) * 100;
    return distance > 0 ? `+${distance.toFixed(2)}%` : `${distance.toFixed(2)}%`;
  };

  return (
    <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-yellow-500/20 p-6">
      {/* Header with Signal Badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getSignalColor()} flex items-center justify-center`}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Key Fibonacci Levels</h3>
            <p className="text-sm text-gray-400">{tokenSymbol} • Professional Analysis</p>
          </div>
        </div>

        {/* Signal Badge */}
        <div className={`px-4 py-2 rounded-xl border ${getSignalBadgeColor()} font-bold flex items-center gap-2`}>
          {signalType === 'BUY' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
          )}
          {signalType === 'SELL' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
            </svg>
          )}
          <span>{signalType}</span>
          <span className="text-xs opacity-75">({signalStrength}%)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Support Levels */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded"></div>
            <h4 className="text-sm font-bold text-green-400">SUPPORT LEVELS</h4>
          </div>
          
          <div className="space-y-2">
            {supports.length > 0 ? (
              supports.map((support, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-green-500/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-green-400">{support.label}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-white font-bold">{formatPrice(support.price)}</span>
                    <span className="text-xs text-gray-400">{calculateDistance(support.price)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No support levels detected
              </div>
            )}
          </div>
        </div>

        {/* Resistance Levels */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded"></div>
            <h4 className="text-sm font-bold text-red-400">RESISTANCE LEVELS</h4>
          </div>
          
          <div className="space-y-2">
            {resistances.length > 0 ? (
              resistances.map((resistance, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-red-500/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-red-400">{resistance.label}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-white font-bold">{formatPrice(resistance.price)}</span>
                    <span className="text-xs text-gray-400">{calculateDistance(resistance.price)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No resistance levels detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Price Badge */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Current Price</p>
            <p className="text-2xl font-bold text-white">{formatPrice(currentPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">24h Range</p>
            <p className="text-sm text-gray-300">
              {supports.length > 0 && formatPrice(supports[supports.length - 1].price)} - 
              {resistances.length > 0 && formatPrice(resistances[resistances.length - 1].price)}
            </p>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>Fibonacci retracement & extension levels • Updated in real-time</p>
      </div>
    </div>
  );
};
