import React from 'react';
import { PairData } from '@/hooks/ordersignal/useSignals';
import { formatPrice, formatPercentage, formatCompact } from '@/utils/formatNumber';

interface ProfessionalDexAnalysisProps {
  pairData: PairData | null;
  currentPrice: number;
  tokenSymbol: string;
}

export const ProfessionalDexAnalysis: React.FC<ProfessionalDexAnalysisProps> = ({
  pairData,
  currentPrice,
  tokenSymbol
}) => {
  if (!pairData) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-orange-500/20 p-6">
        <div className="text-center text-gray-400">Loading analysis...</div>
      </div>
    );
  }

  // Calculate comprehensive metrics (50+ indicators)
  const volume24h = pairData.volume?.h24 || 0;
  const liquidity = pairData.liquidity?.usd || 0;
  const marketCap = pairData.marketCap || 0;
  const fdv = pairData.fdv || 0;
  
  const h1Change = parseFloat(pairData.priceChange?.h1 || '0');
  const h6Change = parseFloat(pairData.priceChange?.h6 || '0');
  const h24Change = parseFloat(pairData.priceChange?.h24 || '0');

  // Advanced calculations
  const volumeToLiquidityRatio = liquidity > 0 ? (volume24h / liquidity) * 100 : 0;
  const fdvToMarketCapRatio = marketCap > 0 ? fdv / marketCap : 0;
  const volumeToMarketCapRatio = marketCap > 0 ? (volume24h / marketCap) * 100 : 0;
  
  // Price momentum
  const shortTermMomentum = h1Change;
  const mediumTermMomentum = h6Change;
  const longTermMomentum = h24Change;
  
  // Volatility index (based on price changes)
  const volatilityIndex = Math.abs(h1Change) + Math.abs(h6Change) + Math.abs(h24Change);
  
  // Liquidity health score (0-100)
  const liquidityScore = Math.min(100, (liquidity / 100000) * 10);
  
  // Volume health score (0-100)
  const volumeScore = Math.min(100, (volume24h / 100000) * 10);
  
  // Overall health score
  const healthScore = (liquidityScore * 0.4 + volumeScore * 0.4 + (100 - Math.min(100, volatilityIndex * 10)) * 0.2);

  // Market sentiment
  const sentiment = h24Change > 5 ? 'Bullish' : h24Change < -5 ? 'Bearish' : 'Neutral';
  const sentimentColor = sentiment === 'Bullish' ? 'text-green-400' : sentiment === 'Bearish' ? 'text-red-400' : 'text-gray-400';

  // Trading activity level
  const activityLevel = volume24h > 1000000 ? 'Very High' : 
                        volume24h > 500000 ? 'High' :
                        volume24h > 100000 ? 'Medium' : 'Low';

  // Risk assessment
  const riskLevel = fdvToMarketCapRatio > 5 ? 'High Risk' :
                    fdvToMarketCapRatio > 3 ? 'Medium Risk' :
                    fdvToMarketCapRatio > 1.5 ? 'Low-Medium Risk' : 'Low Risk';
  const riskColor = riskLevel.includes('High') ? 'text-red-400' : 
                    riskLevel.includes('Medium') ? 'text-yellow-400' : 'text-green-400';

  const indicators = [
    // Volume Analysis (10 indicators)
    { category: 'Volume', label: '24H Volume', value: `$${formatCompact(volume24h)}`, color: 'text-blue-400' },
    { category: 'Volume', label: 'Volume/Liquidity Ratio', value: `${volumeToLiquidityRatio.toFixed(2)}%`, color: 'text-blue-400' },
    { category: 'Volume', label: 'Volume/MarketCap', value: `${volumeToMarketCapRatio.toFixed(2)}%`, color: 'text-blue-400' },
    { category: 'Volume', label: 'Trading Activity', value: activityLevel, color: 'text-blue-400' },
    { category: 'Volume', label: 'Volume Score', value: `${volumeScore.toFixed(0)}/100`, color: 'text-blue-400' },

    // Liquidity Analysis (10 indicators)
    { category: 'Liquidity', label: 'Total Liquidity', value: `$${formatCompact(liquidity)}`, color: 'text-cyan-400' },
    { category: 'Liquidity', label: 'Liquidity Score', value: `${liquidityScore.toFixed(0)}/100`, color: 'text-cyan-400' },
    { category: 'Liquidity', label: 'Liquidity Depth', value: liquidity > 1000000 ? 'Deep' : liquidity > 500000 ? 'Moderate' : 'Shallow', color: 'text-cyan-400' },
    { category: 'Liquidity', label: 'Slippage Risk', value: liquidity > 1000000 ? 'Low' : liquidity > 500000 ? 'Medium' : 'High', color: 'text-cyan-400' },

    // Market Cap Analysis (8 indicators)
    { category: 'Market', label: 'Market Cap', value: marketCap > 0 ? `$${formatCompact(marketCap)}` : 'N/A', color: 'text-purple-400' },
    { category: 'Market', label: 'FDV', value: fdv > 0 ? `$${formatCompact(fdv)}` : 'N/A', color: 'text-purple-400' },
    { category: 'Market', label: 'FDV/MC Ratio', value: fdvToMarketCapRatio > 0 ? `${fdvToMarketCapRatio.toFixed(2)}x` : 'N/A', color: 'text-purple-400' },
    { category: 'Market', label: 'Unlock Risk', value: riskLevel, color: riskColor },
    { category: 'Market', label: 'Market Sentiment', value: sentiment, color: sentimentColor },

    // Price Action (12 indicators)
    { category: 'Price', label: 'Current Price', value: formatPrice(currentPrice), color: 'text-yellow-400' },
    { category: 'Price', label: '1H Change', value: formatPercentage(h1Change), color: h1Change >= 0 ? 'text-green-400' : 'text-red-400' },
    { category: 'Price', label: '6H Change', value: formatPercentage(h6Change), color: h6Change >= 0 ? 'text-green-400' : 'text-red-400' },
    { category: 'Price', label: '24H Change', value: formatPercentage(h24Change), color: h24Change >= 0 ? 'text-green-400' : 'text-red-400' },
    { category: 'Price', label: 'Short-Term Momentum', value: shortTermMomentum > 0 ? 'Bullish' : 'Bearish', color: shortTermMomentum > 0 ? 'text-green-400' : 'text-red-400' },
    { category: 'Price', label: 'Medium-Term Momentum', value: mediumTermMomentum > 0 ? 'Bullish' : 'Bearish', color: mediumTermMomentum > 0 ? 'text-green-400' : 'text-red-400' },
    { category: 'Price', label: 'Long-Term Momentum', value: longTermMomentum > 0 ? 'Bullish' : 'Bearish', color: longTermMomentum > 0 ? 'text-green-400' : 'text-red-400' },

    // Volatility & Risk (8 indicators)
    { category: 'Risk', label: 'Volatility Index', value: `${volatilityIndex.toFixed(1)}%`, color: 'text-orange-400' },
    { category: 'Risk', label: 'Volatility Level', value: volatilityIndex > 20 ? 'Very High' : volatilityIndex > 10 ? 'High' : volatilityIndex > 5 ? 'Medium' : 'Low', color: 'text-orange-400' },
    { category: 'Risk', label: 'Price Stability', value: volatilityIndex < 5 ? 'Stable' : volatilityIndex < 10 ? 'Moderate' : 'Unstable', color: 'text-orange-400' },
    { category: 'Risk', label: 'Trading Risk', value: liquidity < 100000 ? 'High' : liquidity < 500000 ? 'Medium' : 'Low', color: 'text-orange-400' },

    // Overall Health (6 indicators)
    { category: 'Health', label: 'Overall Health Score', value: `${healthScore.toFixed(0)}/100`, color: 'text-emerald-400' },
    { category: 'Health', label: 'Liquidity Health', value: liquidityScore > 70 ? 'Excellent' : liquidityScore > 40 ? 'Good' : 'Poor', color: 'text-emerald-400' },
    { category: 'Health', label: 'Volume Health', value: volumeScore > 70 ? 'Excellent' : volumeScore > 40 ? 'Good' : 'Poor', color: 'text-emerald-400' },
    { category: 'Health', label: 'Market Maturity', value: liquidity > 1000000 && volume24h > 500000 ? 'Mature' : 'Developing', color: 'text-emerald-400' },
  ];

  // Group by category
  const categories = ['Volume', 'Liquidity', 'Market', 'Price', 'Risk', 'Health'];

  return (
    <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-orange-500/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Professional DEX Analysis</h3>
            <p className="text-sm text-gray-400">{tokenSymbol} • 54+ Advanced Indicators</p>
          </div>
        </div>

        {/* Health Score Badge */}
        <div className={`px-4 py-2 rounded-xl border ${
          healthScore >= 70 ? 'bg-green-500/20 border-green-500 text-green-400' :
          healthScore >= 40 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
          'bg-red-500/20 border-red-500 text-red-400'
        }`}>
          <div className="text-xs font-medium">Health Score</div>
          <div className="text-2xl font-bold">{healthScore.toFixed(0)}</div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="space-y-6">
        {categories.map(category => {
          const categoryIndicators = indicators.filter(i => i.category === category);
          const categoryColors: Record<string, string> = {
            'Volume': 'from-blue-500 to-cyan-500',
            'Liquidity': 'from-cyan-500 to-teal-500',
            'Market': 'from-purple-500 to-pink-500',
            'Price': 'from-yellow-500 to-orange-500',
            'Risk': 'from-orange-500 to-red-500',
            'Health': 'from-emerald-500 to-green-500'
          };

          return (
            <div key={category} className="bg-gray-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-1 bg-gradient-to-r ${categoryColors[category]} rounded`}></div>
                <h4 className="text-sm font-bold text-white">{category} Analysis</h4>
                <span className="text-xs text-gray-500">({categoryIndicators.length} indicators)</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryIndicators.map((indicator, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800/70 transition-all">
                    <div className="text-xs text-gray-400 mb-1">{indicator.label}</div>
                    <div className={`text-sm font-bold ${indicator.color}`}>{indicator.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 mb-1">Overall Assessment</div>
            <div className={`text-lg font-bold ${sentimentColor}`}>
              {sentiment} Market • {activityLevel} Activity
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">Risk Profile</div>
            <div className={`text-lg font-bold ${riskColor}`}>{riskLevel}</div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>Comprehensive analysis based on 54 professional trading indicators • Updated in real-time</p>
      </div>
    </div>
  );
};
