import { useState, useEffect, useCallback } from 'react';

interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexScreenerToken;
  quoteToken: DexScreenerToken;
  priceNative: string;
  priceUsd: string;
  volume: {
    h24: number;
  };
  priceChange: {
    h24: number;
  };
}

interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}


// Token addresses for all reward tokens
const TOKEN_ADDRESSES = {
  ORDER: '0x1BEd077195307229FcCBC719C5f2ce6416A58180',
  WITCH: '0x810e539D32b428a2BC30DC62713c04C0A2e01373',
  KOKSAL: '0x5f5840361eFb5A9845D274D3dA54872F1A441518',
  STANK: '0xc625Ba9afE42C974BD63b5434808817881a801bB',
  xORDER: '0x9d0c52d591d43484b509e8a39cbcf86de8f39c42',
  xARENA: '0x35836287376a1bad9a9819a290adc15e427e0cba',
  // WAVAX on Avalanche
  WAVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
};

export const useDexScreener = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Record<string, number>>({});

  // Fetch price for a single token
  const fetchTokenPrice = useCallback(async (tokenAddress: string) => {
    // Cache for 2 minutes per token (increased from 30 seconds)
    if (Date.now() - (lastFetch[tokenAddress] || 0) < 120000 && tokenPrices[tokenAddress]) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }
      const data: DexScreenerResponse = await response.json();
      if (data.pairs && data.pairs.length > 0) {
        // Find the best pair (highest volume)
        const bestPair = data.pairs
          .filter(pair => pair.priceUsd && parseFloat(pair.priceUsd) > 0)
          .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))[0];
        if (bestPair) {
          const price = parseFloat(bestPair.priceUsd);
          setTokenPrices(prev => ({ ...prev, [tokenAddress]: price }));
          setLastFetch(prev => ({ ...prev, [tokenAddress]: Date.now() }));
        } else {
          throw new Error('No valid price pairs found');
        }
      } else {
        throw new Error('No pairs found for token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  }, [lastFetch, tokenPrices]);

  // Fetch all token prices only on mount - no automatic refresh
  useEffect(() => {
    Object.values(TOKEN_ADDRESSES).forEach(addr => {
      fetchTokenPrice(addr);
    });
    // Remove automatic interval refresh - only manual refresh via F5 or retry button
  }, [fetchTokenPrice]);

  // Get price for a given token address (only use real DexScreener data)
  const getTokenPrice = (tokenAddress: string) => {
    return tokenPrices[tokenAddress] || 0;
  };

  // Get AVAX price specifically (only use real DexScreener data)
  const getAVAXPrice = () => {
    return tokenPrices[TOKEN_ADDRESSES.WAVAX] || 0;
  };

  return {
    tokenPrices,
    getTokenPrice,
    getAVAXPrice,
    isLoading,
    error,
    refetch: () => {
      console.log('🔄 Manually refreshing all token prices...');
      Object.values(TOKEN_ADDRESSES).forEach(addr => fetchTokenPrice(addr));
    },
    TOKEN_ADDRESSES,
  };
};
