import { useEffect, useState, useRef } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

// Real token balance hook using Arena SDK
export const useTokenBalance = (tokenSymbol: 'ORDER' | 'WITCH' | 'KOKSAL' | 'STANK' | 'xORDER' | 'xARENA', options?: {
  autoRefreshInterval?: number; // 0 = no auto refresh
  refreshOnMount?: boolean;
}) => {
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const arenaData = useArenaSDK();
  const fetchingRef = useRef(false); // Prevent multiple simultaneous fetches
  
  const { 
    autoRefreshInterval = 0, // Default: no auto refresh 
    refreshOnMount = true 
  } = options || {};

  const fetchBalance = async () => {
    if (fetchingRef.current) return; // Prevent multiple simultaneous fetches
    
    if (!arenaData?.sdk?.provider || !arenaData.isConnected || !arenaData.address) {
      setBalance('0');
      setIsLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      setIsLoading(true);
      
      const tokenAddress = CONTRACT_ADDRESSES.tokens[tokenSymbol as keyof typeof CONTRACT_ADDRESSES.tokens];
      
      if (!tokenAddress) {
        console.error(`No address found for token: ${tokenSymbol}`);
        setBalance('0');
        setIsLoading(false);
        return;
      }
      
      // Debug log (less verbose for stake modals)
      console.log(`🔍 Fetching ${tokenSymbol} balance for modal`);
      
      // ERC20 balanceOf function call
      const result = await arenaData.sdk.provider.request({
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: '0x70a08231' + arenaData.address.slice(2).padStart(64, '0') // balanceOf(address)
        }, 'latest']
      });
      
      if (result && result !== '0x' && typeof result === 'string') {
        const balanceWei = BigInt(result);
        const balanceEth = Number(balanceWei) / 1e18;
        const bal = balanceEth.toFixed(4);
        setBalance(bal);
        setLastUpdateTime(Date.now());
        console.log(`✅ ${tokenSymbol} balance: ${bal}`);
      } else {
        // Balance 0 ise de başarılı sayalım, sadece gerçek error'da 0 setelim
        setBalance('0');
        setLastUpdateTime(Date.now());
        console.log(`⚠️ ${tokenSymbol} balance is 0`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${tokenSymbol} balance:`, error);
      setBalance('0');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Only fetch on mount if refreshOnMount is true
    if (refreshOnMount) {
      fetchBalance();
    }

    // Setup auto refresh interval only if specified
    let interval: NodeJS.Timeout | null = null;
    if (autoRefreshInterval > 0 && arenaData?.isConnected) {
      interval = setInterval(fetchBalance, autoRefreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [arenaData?.sdk?.provider, arenaData?.isConnected, arenaData?.address, tokenSymbol, autoRefreshInterval, refreshOnMount]);

  return {
    balance: balance || '0',
    isLoading,
    formattedBalance: parseFloat(balance || '0').toFixed(4),
    lastUpdateTime, // Debug için eklendi
    refresh: fetchBalance // Manual refresh function
  };
};
