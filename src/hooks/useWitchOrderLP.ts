import { useEffect, useState, useCallback } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { useDexScreener } from './useDexScreener';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

interface WitchOrderLPData {
  orderReserve: number;
  witchReserve: number;
  totalTVL: number; // In USD
  orderValue: number; // ORDER tokens value in USD
  witchValue: number; // WITCH tokens value in USD
  lpAddress: string;
}

export const useWitchOrderLP = () => {
  const [lpData, setLpData] = useState<WitchOrderLPData>({
    orderReserve: 0,
    witchReserve: 0,
    totalTVL: 0,
    orderValue: 0,
    witchValue: 0,
    lpAddress: '0xAc7e3b8242e0915d22C107c411b90cAc702EBC56'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const arenaData = useArenaSDK();
  const { getTokenPrice, TOKEN_ADDRESSES } = useDexScreener();

  // Token addresses
  const ORDER_TOKEN = CONTRACT_ADDRESSES.tokens.ORDER; // Correct ORDER address from constants
  const LP_ADDRESS = '0xAc7e3b8242e0915d22C107c411b90cAc702EBC56';

  const fetchWitchOrderLPData = useCallback(async () => {
    if (!arenaData?.sdk?.provider) {
      console.log('⚠️ Arena provider not available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 Fetching Witch/Order LP data...');

      // Create timeout promise for network calls
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 15000);
      });

      // Helper function to make RPC call with timeout
      const makeCall = async (data: string, to: string) => {
        return Promise.race([
          arenaData.sdk.provider.request({
            method: 'eth_call',
            params: [{ to, data }, 'latest']
          }),
          timeoutPromise
        ]);
      };

      // Get reserves from LP contract using getReserves()
      console.log('📊 Getting Witch/Order LP reserves...');
      const getReservesData = '0x0902f1ac'; // getReserves() selector
      const reservesResult = await makeCall(getReservesData, LP_ADDRESS);

      // Parse reserves (reserve0, reserve1, blockTimestampLast)
      let orderReserve = 0;
      let witchReserve = 0;
      
      if (reservesResult && reservesResult !== '0x') {
        const reserve0 = BigInt('0x' + reservesResult.slice(2, 66));
        const reserve1 = BigInt('0x' + reservesResult.slice(66, 130));
        
        // Get token0 address to determine which is ORDER and which is WITCH
        console.log('📊 Getting token0 address...');
        const token0Data = '0x0dfe1681'; // token0() selector
        const token0Result = await makeCall(token0Data, LP_ADDRESS);
        
        const token0Address = '0x' + token0Result.slice(26); // Remove padding
        const isOrderToken0 = token0Address.toLowerCase() === ORDER_TOKEN.toLowerCase();
        
        console.log('🔍 Witch/Order LP Token analysis:', {
          token0Address: token0Address.toLowerCase(),
          orderAddress: ORDER_TOKEN.toLowerCase(),
          witchAddress: CONTRACT_ADDRESSES.tokens.WITCH.toLowerCase(),
          isOrderToken0,
          reserve0: reserve0.toString(),
          reserve1: reserve1.toString(),
          reserve0Formatted: (Number(reserve0) / 1e18).toFixed(2),
          reserve1Formatted: (Number(reserve1) / 1e18).toFixed(2)
        });
        
        if (isOrderToken0) {
          orderReserve = Number(reserve0) / 1e18;
          witchReserve = Number(reserve1) / 1e18;
          console.log('✅ ORDER is token0: ORDER=' + orderReserve.toFixed(2) + ', WITCH=' + witchReserve.toFixed(2));
        } else {
          orderReserve = Number(reserve1) / 1e18;
          witchReserve = Number(reserve0) / 1e18;
          console.log('✅ ORDER is token1: ORDER=' + orderReserve.toFixed(2) + ', WITCH=' + witchReserve.toFixed(2));
        }
      } else {
        console.log('⚠️ No reserves data received for Witch/Order LP');
      }

      // Calculate TVL in USD using DexScreener real-time prices
      const orderPrice = getTokenPrice(TOKEN_ADDRESSES.ORDER) || 0.0012; // Fallback price
      const witchPrice = 0.00001; // Witch token price - update with real price if available
      
      const orderValue = orderReserve * orderPrice;
      const witchValue = witchReserve * witchPrice;
      const totalTVL = orderValue + witchValue;
      
      console.log('💰 Witch/Order LP TVL Calculation:', {
        orderReserve: orderReserve.toLocaleString(),
        orderPrice: `$${orderPrice.toFixed(6)}`,
        orderValue: `$${orderValue.toFixed(2)}`,
        witchReserve: witchReserve.toLocaleString(),
        witchPrice: `$${witchPrice.toFixed(8)}`,
        witchValue: `$${witchValue.toFixed(2)}`,
        totalTVL: `$${totalTVL.toFixed(2)}`
      });

      const newLpData = {
        orderReserve,
        witchReserve,
        totalTVL,
        orderValue,
        witchValue,
        lpAddress: LP_ADDRESS
      };

      console.log('✅ Witch/Order LP data fetched:', newLpData);
      setLpData(newLpData);
      setError(null);
    } catch (error) {
      console.error('❌ Error fetching Witch/Order LP data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Witch/Order LP data';
      setError(errorMessage);
      
      // Set default values on error
      setLpData({
        orderReserve: 0,
        witchReserve: 0,
        totalTVL: 0,
        orderValue: 0,
        witchValue: 0,
        lpAddress: LP_ADDRESS
      });
    } finally {
      setIsLoading(false);
    }
  }, [arenaData?.sdk?.provider, getTokenPrice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWitchOrderLPData();
    }, 1000);

    return () => clearTimeout(timer);
  }, [fetchWitchOrderLPData]);

  // Refresh function
  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing Witch/Order LP data...');
    await fetchWitchOrderLPData();
  }, [fetchWitchOrderLPData]);

  return {
    lpData,
    isLoading,
    error,
    refresh
  };
};
