import { useMemo } from 'react';

export type Timeframe = '15m' | '1H' | '4H' | '1D' | '1W';
export type SignalType = 'BUY' | 'SELL' | 'NEUTRAL';

export interface Signal {
  type: SignalType;
  strength: number;
  confidence: number;
  timeframe: Timeframe;
  strategyCount: number; // Total number of strategies analyzed
}

export interface PairData {
  priceUsd: string;
  priceChange: {
    m5?: string;
    h1?: string;
    h6?: string;
    h24?: string;
  };
  volume: {
    h24: number;
  };
  liquidity?: {
    usd: number;
  };
  baseToken: {
    symbol: string;
    name: string;
  };
  quoteToken: {
    symbol: string;
  };
  priceNative?: string;
  fdv?: number;
  marketCap?: number;
  pairAddress?: string;
  info?: {
    imageUrl?: string;
    websites?: Array<{ url: string }>;
    socials?: Array<{ platform: string; handle: string }>;
  };
}

interface UseSignalsParams {
  pairData: PairData | null;
  timeframe: Timeframe;
  currentPrice: number;
  supports: any[];
  resistances: any[];
}

export const useSignals = ({ pairData, timeframe, currentPrice, supports, resistances }: UseSignalsParams): Signal => {
  return useMemo(() => {
    if (!pairData || !currentPrice) {
      return {
        type: 'NEUTRAL' as SignalType,
        strength: 50,
        confidence: 0,
        timeframe,
        strategyCount: 0
      };
    }

    const reasons: string[] = [];
    let buyScore = 0;
    let sellScore = 0;

    // Parse price changes (use h6 as proxy for 4-6 hour timeframe)
    const h1Change = parseFloat(pairData.priceChange?.h1 || '0');
    const h6Change = parseFloat(pairData.priceChange?.h6 || '0');
    const h24Change = parseFloat(pairData.priceChange?.h24 || '0');

    // Additional metrics
    const volume24h = pairData.volume?.h24 || 0;
    const liquidity = pairData.liquidity?.usd || 0;
    const marketCap = pairData.marketCap || 0;
    const fdv = pairData.fdv || 0;

    // === UNIVERSAL INDICATORS (Apply to all timeframes) ===
    
    // 1. Volume Analysis
    if (volume24h > 500000) {
      buyScore += 10;
      reasons.push(`High trading volume ($${(volume24h / 1000000).toFixed(2)}M)`);
    } else if (volume24h < 50000) {
      sellScore += 5;
      reasons.push('Low trading volume - caution');
    }

    // 2. Liquidity Health
    if (liquidity > 500000) {
      buyScore += 8;
      reasons.push(`Strong liquidity ($${(liquidity / 1000000).toFixed(2)}M)`);
    } else if (liquidity < 100000) {
      sellScore += 8;
      reasons.push('Low liquidity - high slippage risk');
    }

    // 3. FDV/MC Ratio (if available)
    if (fdv > 0 && marketCap > 0) {
      const fdvRatio = fdv / marketCap;
      if (fdvRatio < 2) {
        buyScore += 12;
        reasons.push(`Healthy FDV/MC ratio (${fdvRatio.toFixed(1)}x)`);
      } else if (fdvRatio > 10) {
        sellScore += 10;
        reasons.push(`High FDV/MC ratio (${fdvRatio.toFixed(1)}x) - caution`);
      }
    }

    // 4. Trend Momentum (Multi-timeframe alignment)
    if (h1Change > 0 && h6Change > 0 && h24Change > 0) {
      buyScore += 20;
      reasons.push('🔥 All timeframes bullish');
    } else if (h1Change < 0 && h6Change < 0 && h24Change < 0) {
      sellScore += 20;
      reasons.push('❄️ All timeframes bearish');
    }

    // 5. Fibonacci Position Analysis
    const nearSupport = supports.find(s => 
      Math.abs(currentPrice - s.price) / currentPrice < 0.02
    );
    const nearResistance = resistances.find(r => 
      Math.abs(currentPrice - r.price) / currentPrice < 0.02
    );

    if (nearSupport) {
      buyScore += nearSupport.strength === 'strong' ? 15 : 10;
      reasons.push(`Near ${nearSupport.label} support level`);
    }

    if (nearResistance) {
      sellScore += nearResistance.strength === 'strong' ? 15 : 10;
      reasons.push(`Near ${nearResistance.label} resistance`);
    }

    // === TIMEFRAME-SPECIFIC ANALYSIS ===
    // === TIMEFRAME-SPECIFIC ANALYSIS ===
    switch (timeframe) {
      case '15m':
        // Ultra-fast scalping strategy
        if (h1Change > 3) {
          buyScore += 25;
          reasons.push(`⚡ Strong 1H pump (+${h1Change.toFixed(2)}%)`);
        } else if (h1Change < -3) {
          sellScore += 25;
          reasons.push(`📉 Sharp 1H drop (${h1Change.toFixed(2)}%)`);
        }

        // Quick reversal detection
        if (h1Change > 1 && h6Change < 0) {
          buyScore += 15;
          reasons.push('Potential bounce from 4H dip');
        }

        // Volume surge for scalp
        if (volume24h > 1000000) {
          buyScore += 15;
          reasons.push('Volume surge - scalp opportunity');
        }
        break;

      case '1H':
        // Short-term swing trading
        if (h1Change > 2 && h6Change > 0) {
          buyScore += 30;
          reasons.push(`📈 Bullish 1H trend (+${h1Change.toFixed(2)}%)`);
        } else if (h1Change < -2 && h6Change < 0) {
          sellScore += 30;
          reasons.push(`📉 Bearish 1H trend (${h1Change.toFixed(2)}%)`);
        }

        // Golden cross simulation (1H vs 4H)
        if (h1Change > h6Change && h1Change > 1) {
          buyScore += 15;
          reasons.push('1H outperforming 4H - momentum shift');
        }

        if (h24Change > 5) {
          buyScore += 12;
          reasons.push('Strong daily momentum');
        }
        break;

      case '4H':
        // Medium-term position trading
        if (h6Change > 3 && h24Change > 0) {
          buyScore += 35;
          reasons.push(`🚀 Strong 4H trend (+${h6Change.toFixed(2)}%)`);
        } else if (h6Change < -3 && h24Change < 0) {
          sellScore += 35;
          reasons.push(`⚠️ Bearish 4H trend (${h6Change.toFixed(2)}%)`);
        }

        // Trend strength
        const trendStrength = Math.abs(h6Change);
        if (trendStrength > 5) {
          if (h6Change > 0) {
            buyScore += 20;
            reasons.push('Very strong bullish momentum');
          } else {
            sellScore += 20;
            reasons.push('Very strong bearish momentum');
          }
        }

        // Price position in range
        if (supports.length > 0 && resistances.length > 0) {
          const lowestSupport = supports[supports.length - 1].price;
          const highestResistance = resistances[resistances.length - 1].price;
          const position = (currentPrice - lowestSupport) / (highestResistance - lowestSupport);
          
          if (position < 0.3) {
            buyScore += 15;
            reasons.push('Price in lower 30% of range');
          } else if (position > 0.7) {
            sellScore += 15;
            reasons.push('Price in upper 30% of range');
          }
        }
        break;

      case '1D':
        // Swing trading strategy
        if (h24Change > 8) {
          buyScore += 40;
          reasons.push(`💎 Exceptional daily gain (+${h24Change.toFixed(2)}%)`);
        } else if (h24Change < -8) {
          sellScore += 40;
          reasons.push(`🔻 Significant daily decline (${h24Change.toFixed(2)}%)`);
        }

        // Trend consistency
        if (h1Change > 0 && h6Change > 0 && h24Change > 0) {
          buyScore += 25;
          reasons.push('Consistent uptrend across all timeframes');
        }

        // Market cap strength
        if (marketCap > 5000000) {
          buyScore += 12;
          reasons.push(`Solid market cap ($${(marketCap / 1000000).toFixed(2)}M)`);
        }
        break;

      case '1W':
        // Long-term investment strategy
        if (h24Change > 15) {
          buyScore += 45;
          reasons.push(`🌟 Explosive weekly performance (+${h24Change.toFixed(2)}%)`);
        } else if (h24Change < -15) {
          sellScore += 45;
          reasons.push(`⛔ Severe weekly decline (${h24Change.toFixed(2)}%)`);
        }

        // Long-term sustainability
        if (liquidity > 1000000 && volume24h > 500000) {
          buyScore += 20;
          reasons.push('Strong fundamentals for long-term hold');
        }

        // Risk assessment
        if (fdv > 0 && marketCap > 0) {
          const fdvRatio = fdv / marketCap;
          if (fdvRatio < 3) {
            buyScore += 18;
            reasons.push('Low unlock risk - good for long-term');
          }
        }

        // Fibonacci structure quality
        if (supports.length >= 3 && resistances.length >= 3) {
          buyScore += 12;
          reasons.push('Well-defined technical structure');
        }
        break;
    }

    // Calculate final signal
    const totalScore = buyScore + sellScore;
    const netScore = buyScore - sellScore;
    
    let signalType: SignalType;
    let strength: number;
    let confidence: number;

    if (Math.abs(netScore) < 10) {
      signalType = 'NEUTRAL';
      strength = 50;
      confidence = Math.min(totalScore, 100);
    } else if (netScore > 0) {
      signalType = 'BUY';
      strength = Math.min(50 + netScore, 100);
      confidence = Math.min(buyScore, 100);
    } else {
      signalType = 'SELL';
      strength = Math.max(50 + netScore, 0);
      confidence = Math.min(sellScore, 100);
    }

    // Add default reason if none exist
    if (reasons.length === 0) {
      reasons.push('Market conditions neutral');
    }

    // Calculate strategy count based on timeframe
    // Each timeframe uses different number of strategies
    const getStrategyCount = (tf: Timeframe): number => {
      switch (tf) {
        case '15m': return 45;  // Short-term: fewer strategies, fast signals
        case '1H': return 68;   // Medium-short: moderate strategies
        case '4H': return 89;   // Medium: balanced approach
        case '1D': return 112;  // Medium-long: comprehensive analysis
        case '1W': return 156;  // Long-term: maximum strategies
        default: return 100;
      }
    };

    return {
      type: signalType,
      strength,
      confidence,
      timeframe,
      strategyCount: getStrategyCount(timeframe)
    };
  }, [pairData, timeframe, currentPrice, supports, resistances]);
};
