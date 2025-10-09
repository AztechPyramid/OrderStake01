import { useState, useEffect } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

interface OrderBurnData {
  burnedAmount: number;
  burnedUsd: number;
  isLoading: boolean;
  error: string | null;
}

export const useOrderBurn = (orderPrice: number = 0.0012): OrderBurnData => {
  const [data, setData] = useState<OrderBurnData>({
    burnedAmount: 0,
    burnedUsd: 0,
    isLoading: true,
    error: null,
  });

  const arenaData = useArenaSDK();

  useEffect(() => {
    const fetchBurnData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        
        const orderToken = CONTRACT_ADDRESSES.tokens.ORDER;
        const deadAddress = '0x000000000000000000000000000000000000dEaD';
        
        // Try Arena provider first, fallback to direct RPC
        const makeCall = async (callData: { method: string; params: unknown[] }) => {
          try {
            if (arenaData?.sdk?.provider) {
              return await arenaData.sdk.provider.request(callData);
            }
            throw new Error('Arena provider not available');
          } catch (error) {
            console.log(`Arena provider failed, using direct RPC: ${error}`);
            // Fallback to direct fetch
            const rpcUrl = 'https://api.avax.network/ext/bc/C/rpc';
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: callData.method,
                params: callData.params,
                id: 1
              })
            });
            const result = await response.json();
            return result.result;
          }
        };

        // Get burned ORDER balance at dead address
        const burnedResult = await makeCall({
          method: 'eth_call',
          params: [{
            to: orderToken,
            data: '0x70a08231' + deadAddress.slice(2).padStart(64, '0') // balanceOf(address)
          }, 'latest']
        });

        const burnedAmountWei = burnedResult ? parseInt(burnedResult as string, 16) : 0;
        const burnedAmount = burnedAmountWei / 1e18;
        const burnedUsd = burnedAmount * orderPrice;

        console.log('🔥 ORDER Burn Data:', {
          deadAddress,
          burnedAmountWei,
          burnedAmount,
          burnedUsd,
          orderPrice
        });

        setData({
          burnedAmount,
          burnedUsd,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        console.error('❌ Error fetching ORDER burn data:', error);
        setData({
          burnedAmount: 0,
          burnedUsd: 0,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch burn data'
        });
      }
    };

    fetchBurnData();
    
    // Refresh burn data every 30 seconds
    const interval = setInterval(fetchBurnData, 30000);
    return () => clearInterval(interval);
    
  }, [orderPrice, arenaData?.sdk]);

  return data;
};
