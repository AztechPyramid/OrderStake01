import { useState, useEffect } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

export const useTotalStakedALP = () => {
  const [totalStakedALP, setTotalStakedALP] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const arenaData = useArenaSDK();

  const fetchTotalStakedALP = async () => {
    if (!arenaData?.sdk?.provider || !arenaData.isConnected) {
      setTotalStakedALP('0');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Helper function to make calls with fallback to direct RPC
      const makeCall = async (callData: { method: string; params: unknown[] }) => {
        try {
          return await arenaData.sdk.provider.request(callData);
        } catch (error) {
          console.log(`Arena provider failed for total staked ALP, using direct RPC: ${error}`);
          const response = await fetch('https://api.avax.network/ext/bc/C/rpc', {
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

      // Get total supply of staked ALP tokens from the staking contract
      // This uses the totalSupply() function which returns total staked amount
      const totalSupplyResult = await makeCall({
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESSES.staking.ALP_DUAL, // 0xec4fefcb1123139cb70e6b0dbd0e19f9a7056e3f
          data: '0x18160ddd' // totalSupply() function selector
        }, 'latest']
      });

      console.log('🏦 Total Staked ALP Debug:', {
        stakingContract: CONTRACT_ADDRESSES.staking.ALP_DUAL,
        totalSupplyRaw: totalSupplyResult
      });

      if (totalSupplyResult && totalSupplyResult !== '0x' && totalSupplyResult !== '0x0') {
        const totalStakedWei = BigInt(totalSupplyResult);
        const totalStakedEth = Number(totalStakedWei) / 1e18;
        setTotalStakedALP(totalStakedEth.toFixed(6));
        console.log('✅ Total Staked ALP:', totalStakedEth.toFixed(6));
      } else {
        setTotalStakedALP('0');
        console.log('⚠️ No total staked ALP data');
      }

    } catch (error) {
      console.error('❌ Error fetching total staked ALP:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setTotalStakedALP('0');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTotalStakedALP();
  }, [arenaData?.sdk?.provider, arenaData?.isConnected]);

  return {
    totalStakedALP,
    isLoading,
    error,
    refresh: fetchTotalStakedALP
  };
};
