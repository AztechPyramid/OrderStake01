import { useState, useEffect } from 'react';
import { Timeframe } from './useSignals';

interface PriceRange {
  high: number;
  low: number;
}

interface HistoricalRanges {
  '15m': PriceRange;
  '1h': PriceRange;
  '4h': PriceRange;
  '1d': PriceRange;
  '1w': PriceRange;
}

/**
 * Hook to get historical price ranges for Fibonacci calculations based on timeframe
 * Currently uses simulated data based on realistic crypto volatility
 * TODO: Integrate with real historical price API (CoinGecko, DexScreener, etc.)
 */
export function useHistoricalPrices(currentPrice: number, timeframe: Timeframe) {
  const [ranges, setRanges] = useState<HistoricalRanges>({
    '15m': { high: currentPrice * 1.05, low: currentPrice * 0.95 },
    '1h': { high: currentPrice * 1.08, low: currentPrice * 0.92 },
    '4h': { high: currentPrice * 1.12, low: currentPrice * 0.88 },
    '1d': { high: currentPrice * 1.20, low: currentPrice * 0.80 },
    '1w': { high: currentPrice * 1.35, low: currentPrice * 0.65 }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentPrice || currentPrice === 0) return;

    setLoading(true);

    // Volatility increases with longer timeframes
    const volatilityMap = {
      '15M': 0.05, // ±5% for 15 minutes
      '1H': 0.08,  // ±8% for 1 hour
      '4H': 0.12,  // ±12% for 4 hours
      '1D': 0.20,  // ±20% for 1 day
      '1W': 0.35   // ±35% for 1 week
    };

    // Add some randomness to make it more realistic
    const random15m = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
    const random1h = 0.9 + Math.random() * 0.2;
    const random4h = 0.9 + Math.random() * 0.2;
    const random1d = 0.9 + Math.random() * 0.2;
    const random1w = 0.9 + Math.random() * 0.2;

    setRanges({
      '15m': {
        high: currentPrice * (1 + volatilityMap['15M'] * random15m),
        low: currentPrice * (1 - volatilityMap['15M'] * random15m)
      },
      '1h': {
        high: currentPrice * (1 + volatilityMap['1H'] * random1h),
        low: currentPrice * (1 - volatilityMap['1H'] * random1h)
      },
      '4h': {
        high: currentPrice * (1 + volatilityMap['4H'] * random4h),
        low: currentPrice * (1 - volatilityMap['4H'] * random4h)
      },
      '1d': {
        high: currentPrice * (1 + volatilityMap['1D'] * random1d),
        low: currentPrice * (1 - volatilityMap['1D'] * random1d)
      },
      '1w': {
        high: currentPrice * (1 + volatilityMap['1W'] * random1w),
        low: currentPrice * (1 - volatilityMap['1W'] * random1w)
      }
    });

    setLoading(false);
  }, [currentPrice, timeframe]);

  return { ranges, loading };
}
