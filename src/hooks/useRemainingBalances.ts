import { useEffect, useState } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

export const useRemainingBalances = () => {
  const [xOrderRemaining, setXOrderRemaining] = useState('0');
  const [xArenaRemaining, setXArenaRemaining] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const arenaData = useArenaSDK();

  const fetchRemainingBalances = async () => {
    if (!arenaData?.sdk?.provider || !arenaData.isConnected) {
      setXOrderRemaining('0');
      setXArenaRemaining('0');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Helper function to make calls with fallback to direct RPC
      const makeCall = async (callData: { method: string; params: unknown[] }) => {
        try {
          return await arenaData.sdk.provider.request(callData);
        } catch (error) {
          console.log(`Arena provider failed for remaining balances, using direct RPC: ${error}`);
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

      // Fetch xORDER remaining from ALP xORDER reward pool
      const xOrderResult = await makeCall({
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESSES.tokens.xORDER,
          data: '0x70a08231' + CONTRACT_ADDRESSES.rewardPools.ALP_xORDER.slice(2).padStart(64, '0') // balanceOf(ALP_xORDER_pool)
        }, 'latest']
      });

      // Fetch xARENA remaining from ALP xARENA reward pool
      const xArenaResult = await makeCall({
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESSES.tokens.xARENA,
          data: '0x70a08231' + CONTRACT_ADDRESSES.rewardPools.ALP_xARENA.slice(2).padStart(64, '0') // balanceOf(ALP_xARENA_pool)
        }, 'latest']
      });

      console.log('🏦 Remaining Balances Debug:', {
        xOrderPool: CONTRACT_ADDRESSES.rewardPools.ALP_xORDER,
        xArenaPool: CONTRACT_ADDRESSES.rewardPools.ALP_xARENA,
        xOrderRaw: xOrderResult,
        xArenaRaw: xArenaResult
      });

      if (xOrderResult && xOrderResult !== '0x' && xOrderResult !== '0x0') {
        const balanceWei = BigInt(xOrderResult);
        const balanceEth = Number(balanceWei) / 1e18;
        setXOrderRemaining(balanceEth.toFixed(4));
        console.log('✅ xORDER remaining:', balanceEth.toFixed(4));
      } else {
        setXOrderRemaining('0');
        console.log('⚠️ No xORDER remaining data');
      }

      if (xArenaResult && xArenaResult !== '0x' && xArenaResult !== '0x0') {
        const balanceWei = BigInt(xArenaResult);
        const balanceEth = Number(balanceWei) / 1e18;
        setXArenaRemaining(balanceEth.toFixed(4));
        console.log('✅ xARENA remaining:', balanceEth.toFixed(4));
      } else {
        setXArenaRemaining('0');
        console.log('⚠️ No xARENA remaining data');
      }

    } catch (error) {
      console.error('❌ Error fetching remaining balances:', error);
      setXOrderRemaining('0');
      setXArenaRemaining('0');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRemainingBalances();
  }, [arenaData?.sdk?.provider, arenaData?.isConnected]);

  return {
    xOrderRemaining,
    xArenaRemaining,
    isLoading,
    refresh: fetchRemainingBalances
  };
};
