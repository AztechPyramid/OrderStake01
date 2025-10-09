import { useState, useCallback } from 'react';
import { PairData } from './useSignals';

export const usePairData = () => {
  const [pairData, setPairData] = useState<PairData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPairData = useCallback(async (pairAddress: string) => {
    if (!pairAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/avalanche/${pairAddress}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pair data');
      }

      const data = await response.json();

      if (data.pair) {
        console.log('DexScreener API Response (pair):', data.pair);
        console.log('Price Changes:', data.pair.priceChange);
        setPairData(data.pair);
      } else if (data.pairs && data.pairs.length > 0) {
        console.log('DexScreener API Response (pairs[0]):', data.pairs[0]);
        console.log('Price Changes:', data.pairs[0].priceChange);
        setPairData(data.pairs[0]);
      } else {
        throw new Error('Pair data not found');
      }
    } catch (err) {
      console.error('Pair data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pair data');
      setPairData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    pairData,
    loading,
    error,
    fetchPairData
  };
};
