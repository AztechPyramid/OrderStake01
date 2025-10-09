import React from 'react';
import { useBurnedOrderTokens } from '@/hooks/useBurnedOrderTokens';

export const BurnedTokensCard: React.FC = () => {
  const { 
    balance,
    balanceFormatted, 
    usdValueFormatted, 
    isLoading, 
    error 
  } = useBurnedOrderTokens();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/40 via-slate-700/40 to-blue-900/40 border border-slate-600/30 rounded-xl p-3 sm:p-4 shadow-2xl backdrop-blur-sm">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-600/10 via-blue-600/10 to-blue-700/10 animate-pulse opacity-50"></div>
      
      {/* Fire effect overlay */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-500 via-blue-600 to-blue-700 animate-pulse"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-600 via-red-600 to-yellow-500 rounded-full flex items-center justify-center shadow-lg overflow-hidden border border-orange-400/50">
                <img 
                  src="https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg" 
                  alt="ORDER" 
                  className="w-6 h-6 rounded-full object-cover filter brightness-110 contrast-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/order-logo.jpg';
                  }}
                />
                {/* Multi-layer fire overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-red-600/60 via-orange-500/40 to-transparent animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/30 via-transparent to-red-500/30 animate-ping"></div>
              </div>
              
              {/* Enhanced glow effect - CIRCULAR */}
              <div className="absolute inset-0 w-8 h-8 bg-gradient-to-br from-orange-400 via-red-500 to-yellow-400 rounded-full blur-lg opacity-60 animate-pulse"></div>
              <div className="absolute inset-0 w-8 h-8 bg-gradient-to-br from-yellow-300 to-red-400 rounded-full blur-md opacity-40 animate-ping"></div>
              
              {/* Dynamic fire particles */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <div className="w-1.5 h-1.5 bg-gradient-to-t from-red-500 to-yellow-400 rounded-full animate-bounce opacity-80"></div>
              </div>
              <div className="absolute -top-1.5 left-1/3">
                <div className="w-1 h-1 bg-gradient-to-t from-orange-500 to-yellow-300 rounded-full animate-ping opacity-70"></div>
              </div>
              <div className="absolute -top-1.5 right-1/3">
                <div className="w-1 h-1 bg-gradient-to-t from-red-400 to-orange-300 rounded-full animate-bounce delay-150 opacity-70"></div>
              </div>
              <div className="absolute -top-1 left-1/4">
                <div className="w-0.5 h-0.5 bg-yellow-300 rounded-full animate-ping delay-300 opacity-60"></div>
              </div>
              <div className="absolute -top-1 right-1/4">
                <div className="w-0.5 h-0.5 bg-orange-400 rounded-full animate-bounce delay-500 opacity-60"></div>
              </div>
              
              {/* Side flame effects */}
              <div className="absolute top-1 -left-1">
                <div className="w-0.5 h-2 bg-gradient-to-t from-red-500 to-transparent rounded-full animate-pulse opacity-50"></div>
              </div>
              <div className="absolute top-1 -right-1">
                <div className="w-0.5 h-2 bg-gradient-to-t from-orange-500 to-transparent rounded-full animate-pulse delay-200 opacity-50"></div>
              </div>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold bg-gradient-to-r from-blue-200 via-slate-200 to-white bg-clip-text text-transparent">
                Burned ORDER Tokens
              </h3>
              <p className="text-xs text-slate-300/80">
                Permanently removed from circulation
              </p>
            </div>
          </div>
          
          {/* Dead address indicator */}
          <div className="text-right">
            <div className="text-xs text-slate-300 font-mono bg-slate-800/30 px-2 py-1 rounded">
              💀 Dead
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Burned amount */}
          <div className="bg-gradient-to-br from-slate-700/30 to-slate-800/30 rounded-lg p-3 border border-slate-500/20 backdrop-blur-sm">
            <div className="text-xs text-slate-300 mb-1 flex items-center gap-1">
              <span>🪙</span>
              <span>Tokens Burned</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white">
              {isLoading ? (
                <div className="animate-pulse bg-slate-600/30 h-4 rounded w-20"></div>
              ) : error ? (
                <span className="text-amber-400 text-xs">⚠️ Loading...</span>
              ) : (
                <span className="bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                  {balanceFormatted}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">ORDER</div>
          </div>

          {/* USD value */}
          <div className="bg-gradient-to-br from-slate-700/30 to-blue-800/30 rounded-lg p-3 border border-slate-500/20 backdrop-blur-sm">
            <div className="text-xs text-slate-300 mb-1 flex items-center gap-1">
              <span>💰</span>
              <span>USD Value</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white">
              {isLoading ? (
                <div className="animate-pulse bg-slate-600/30 h-4 rounded w-16"></div>
              ) : error ? (
                <span className="text-amber-400 text-xs">⚠️ Loading...</span>
              ) : (
                <span className="bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                  {usdValueFormatted}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">Burned Value</div>
          </div>

          {/* Supply percentage */}
          <div className="bg-gradient-to-br from-blue-800/30 to-slate-700/30 rounded-lg p-3 border border-blue-500/20 backdrop-blur-sm">
            <div className="text-xs text-blue-300 mb-1 flex items-center gap-1">
              <div className="relative">
                <div className="w-3 h-3 bg-gradient-to-br from-orange-500 via-red-500 to-yellow-400 rounded-full flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg" 
                    alt="ORDER" 
                    className="w-2 h-2 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/order-logo.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-red-500/40 to-transparent animate-pulse"></div>
                </div>
                <div className="absolute inset-0 w-3 h-3 bg-orange-400 rounded-full blur-sm opacity-50 animate-ping"></div>
              </div>
              <span>Supply Burned</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white">
              {isLoading ? (
                <div className="animate-pulse bg-blue-700/30 h-4 rounded w-12"></div>
              ) : error ? (
                <span className="text-amber-400 text-xs">⚠️ Loading...</span>
              ) : (
                <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  {(() => {
                    const burnedAmount = parseFloat(balance) || 0;
                    const totalSupply = 10000000000; // 10 billion
                    const percentage = (burnedAmount / totalSupply) * 100;
                    return percentage.toFixed(4);
                  })()}%
                </span>
              )}
            </div>
            <div className="text-xs text-blue-400">of Total Supply</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300/70">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            <span>Live from dead address</span>
          </div>
          
          <div className="text-xs text-slate-400/70 font-mono">
            0x000...dEaD
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1 right-1 w-3 h-3 bg-gradient-to-br from-slate-500 to-blue-600 rounded-full opacity-30 animate-ping"></div>
        <div className="absolute bottom-1 left-1 w-2 h-2 bg-gradient-to-br from-blue-500 to-slate-400 rounded-full opacity-40 animate-bounce delay-300"></div>
      </div>
    </div>
  );
};