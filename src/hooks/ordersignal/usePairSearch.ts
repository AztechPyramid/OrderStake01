import { useState, useCallback, useRef, useEffect } from 'react';

export interface TradingPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  liquidity?: {
    usd: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: Array<{ url: string }>;
    socials?: Array<{ platform: string; handle: string }>;
  };
}

export const usePairSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const searchPairs = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    try {
      // Smart search mapping for common aliases
      let searchTerm = query;
      const upperQuery = query.toUpperCase().trim();
      
      // Map common search terms to actual token symbols
      if (upperQuery === 'AVAX') {
        searchTerm = 'WAVAX'; // Search for WAVAX when user types "avax"
      } else if (upperQuery === 'BTC') {
        // Search for both BTC.b and WBTC.e
        searchTerm = 'BTC.b WBTC.e';
      }

      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(searchTerm)}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      if (data.pairs && data.pairs.length > 0) {
        // Popular quote tokens on Avalanche
        const popularQuoteTokens = [
          'WAVAX', 'AVAX', 'USDC', 'USDT', 'USDC.e', 'USDT.e',
          'DAI', 'DAI.e', 'WETH.e', 'WBTC.e', 'BTC.b', 'ARENA'
        ];

        // Filter for Avalanche C-Chain pairs with popular quote tokens
        // Accept pairs where EITHER baseToken OR quoteToken is a popular token
        const filteredPairs = data.pairs
          .filter((pair: any) => {
            if (pair.chainId !== 'avalanche') return false;
            
            const baseSymbol = pair.baseToken?.symbol?.toUpperCase() || '';
            const quoteSymbol = pair.quoteToken?.symbol?.toUpperCase() || '';
            
            // Accept if quoteToken is popular OR baseToken is popular (for reverse pairs)
            return popularQuoteTokens.some(token => 
              quoteSymbol === token || baseSymbol === token
            );
          })
          .sort((a: any, b: any) => {
            // Prioritize by liquidity
            const aLiq = a.liquidity?.usd || 0;
            const bLiq = b.liquidity?.usd || 0;
            return bLiq - aLiq;
          })
          .slice(0, 20); // Increased from 15 to 20 for more results

        setSearchResults(filteredPairs);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new timeout for debounced search
    debounceTimeout.current = setTimeout(() => {
      searchPairs(value);
    }, 300);
  }, [searchPairs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  }, []);

  return {
    searchQuery,
    searchResults,
    loading,
    showDropdown,
    setShowDropdown,
    handleSearchChange,
    searchPairs,
    clearSearch
  };
};
