import { useEffect, useState } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

export interface ContractOrderBalance {
  balance: string;
  balanceFormatted: string;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook to fetch ORDER token balance from a specific contract address
 * Used for fetching reward pool balance from Tetris game contract
 */
export function useContractOrderBalance(contractAddress: string): ContractOrderBalance {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const arenaData = useArenaSDK();

  useEffect(() => {
    let cancelled = false;

    async function fetchBalance() {
      if (!arenaData?.sdk?.provider || !contractAddress) {
        setBalance('0');
        setIsLoading(false);
        setError('No provider or contract address');
        return;
      }

      try {
        setIsLoading(true);
        setError(undefined);

        const tokenAddress = CONTRACT_ADDRESSES.tokens.ORDER;
        
        // Prepare the call data for balanceOf(address)
        const data = '0x70a08231' + contractAddress.slice(2).padStart(64, '0');
        
        const result = await arenaData.sdk.provider.request({
          method: 'eth_call',
          params: [{ to: tokenAddress, data }, 'latest']
        });

        if (result && result !== '0x' && typeof result === 'string') {
          const balanceWei = BigInt(result);
          const balanceFormatted = (Number(balanceWei) / 1e18).toFixed(4);
          
          if (!cancelled) {
            setBalance(balanceFormatted);
          }
        } else {
          if (!cancelled) {
            setBalance('0');
          }
        }
      } catch (err: any) {
        console.error('Error fetching contract ORDER balance:', err);
        if (!cancelled) {
          setError(err?.message || 'Failed to fetch balance');
          setBalance('0');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [arenaData?.sdk?.provider, contractAddress]);

  return {
    balance,
    balanceFormatted: balance,
    isLoading,
    error,
  };
}