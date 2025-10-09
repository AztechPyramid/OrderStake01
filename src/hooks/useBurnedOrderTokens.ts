import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useArenaSDK } from './useArenaSDK';
import { useOrderPrice } from './useOrderPrice';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

export interface BurnedOrderInfo {
  balance: string;
  balanceFormatted: string;
  usdValue: string;
  usdValueFormatted: string;
  isLoading: boolean;
  error?: string;
}

const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

/**
 * Hook to fetch burned ORDER tokens from the dead address
 * and calculate their USD value
 * Only refreshes when user is on the home page to prevent interference
 */
export function useBurnedOrderTokens(): BurnedOrderInfo {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const arenaData = useArenaSDK();
  const { priceData } = useOrderPrice();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let interval: NodeJS.Timeout | null = null;

    // Only run on home page to prevent interference with other pages
    const isHomePage = router.pathname === '/' || router.pathname === '/home';
    const now = Date.now();
    const shouldFetch = isHomePage && (!lastFetchTime || now - lastFetchTime > 5000); // 5 second minimum between fetches

    async function fetchBurnedBalance() {
      if (!arenaData?.sdk?.provider) {
        setBalance('0');
        setIsLoading(false);
        setError('No provider available');
        return;
      }

      try {
        setIsLoading(true);
        setError(undefined);

        const tokenAddress = CONTRACT_ADDRESSES.tokens.ORDER;
        
        // Prepare the call data for balanceOf(deadAddress)
        const data = '0x70a08231' + DEAD_ADDRESS.slice(2).padStart(64, '0');
        
        const result = await arenaData.sdk.provider.request({
          method: 'eth_call',
          params: [{ to: tokenAddress, data }, 'latest']
        });

        if (result && result !== '0x' && typeof result === 'string') {
          const balanceWei = BigInt(result);
          const balanceFormatted = (Number(balanceWei) / 1e18).toFixed(2);
          
          if (!cancelled) {
            setBalance(balanceFormatted);
            setError(undefined); // Clear any previous errors
            setLastFetchTime(Date.now()); // Update last fetch time
          }
        } else {
          if (!cancelled) {
            setBalance('0');
            setError('No data received');
          }
        }
      } catch (err: any) {
        console.log('Error fetching burned ORDER tokens:', err?.message || err);
        if (!cancelled) {
          // Don't immediately show error - just keep trying
          if (!balance || balance === '0') {
            setError('Loading data...');
          }
          // Keep previous balance if we had one
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (shouldFetch && arenaData?.sdk?.provider) {
      console.log('🔥 Fetching burned tokens data...');
      // Fetch initial data when entering home page
      fetchBurnedBalance();
      
      // Don't set interval for continuous updates - only fetch on page entry
      // This prevents constant API calls and loading states
    } else if (isHomePage && lastFetchTime > 0) {
      // If we're on home page but recently fetched, just stop loading
      setIsLoading(false);
    } else if (!isHomePage) {
      // If not on home page, just set loading to false and keep existing balance
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [arenaData?.sdk?.provider, router.pathname, lastFetchTime]); // Add lastFetchTime to deps

  // Calculate USD value
  const usdValue = priceData.price > 0 ? (parseFloat(balance) * priceData.price).toFixed(2) : '0';
  const usdValueFormatted = priceData.price > 0 ? `$${parseFloat(usdValue).toLocaleString()}` : '$0';

  return {
    balance,
    balanceFormatted: parseFloat(balance).toLocaleString(),
    usdValue,
    usdValueFormatted,
    isLoading,
    error,
  };
}