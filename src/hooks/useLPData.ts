import { useEffect, useState, useRef, useCallback } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { useDexScreener } from './useDexScreener';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

interface LPPoolData {
  userLPBalance: number;
  totalLPSupply: number;
  userShare: number; // Percentage
  orderReserve: number;
  avaxReserve: number;
  userOrderValue: number;
  userAvaxValue: number;
  totalTVL: number; // In USD
}

export const useLPData = () => {
  const [lpData, setLpData] = useState<LPPoolData>({
    userLPBalance: 0,
    totalLPSupply: 0,
    userShare: 0,
    orderReserve: 0,
    avaxReserve: 0,
    userOrderValue: 0,
    userAvaxValue: 0,
    totalTVL: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const retryCount = useRef(0);
  const lastRefreshTime = useRef<number>(0);
  const maxRetries = 3;

  const arenaData = useArenaSDK();
  const { getTokenPrice, getAVAXPrice } = useDexScreener();

  const fetchLPData = useCallback(async () => {
    // Prevent excessive refresh - minimum 50 seconds between automatic refreshes
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;
    const minRefreshInterval = 50000; // 50 seconds
    
    if (dataLoaded && timeSinceLastRefresh < minRefreshInterval) {
      console.log(`⏸️ Skipping refresh - only ${Math.round(timeSinceLastRefresh / 1000)}s since last refresh (minimum: 50s)`);
      return;
    }

    if (!arenaData?.sdk?.provider || !arenaData.isConnected || !arenaData.address) {
      console.log('⚠️ Arena not connected, resetting LP data');
      setLpData({
        userLPBalance: 0,
        totalLPSupply: 0,
        userShare: 0,
        orderReserve: 0,
        avaxReserve: 0,
        userOrderValue: 0,
        userAvaxValue: 0,
        totalTVL: 0
      });
      setIsLoading(false);
      setError('Arena wallet not connected');
      setDataLoaded(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 Fetching LP Pool data...');
      lastRefreshTime.current = now; // Update last refresh time

      // Create timeout promise for network calls
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 15000); // Increased to 15 seconds
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

      // 1. Get user LP balance
      console.log('📊 Getting user LP balance...');
      const lpBalanceData = '0x70a08231' + arenaData.address.slice(2).padStart(64, '0');
      const userLPResult = await makeCall(lpBalanceData, CONTRACT_ADDRESSES.liquidity.ORDER_AVAX_LP);

      // 2. Get total LP supply
      console.log('📊 Getting total LP supply...');
      const totalSupplyResult = await makeCall('0x18160ddd', CONTRACT_ADDRESSES.liquidity.ORDER_AVAX_LP);

      // 3. Get reserves from LP contract using getReserves()
      console.log('📊 Getting reserves...');
      const getReservesData = '0x0902f1ac'; // getReserves() selector
      const reservesResult = await makeCall(getReservesData, CONTRACT_ADDRESSES.liquidity.ORDER_AVAX_LP);

      // Parse reserves (reserve0, reserve1, blockTimestampLast)
      let orderReserve = 0;
      let avaxReserve = 0;
      
      if (reservesResult && reservesResult !== '0x') {
        const reserve0 = BigInt('0x' + reservesResult.slice(2, 66));
        const reserve1 = BigInt('0x' + reservesResult.slice(66, 130));
        
        // Need to determine which is ORDER and which is WAVAX
        console.log('📊 Getting token0 address...');
        const token0Data = '0x0dfe1681'; // token0() selector
        const token0Result = await makeCall(token0Data, CONTRACT_ADDRESSES.liquidity.ORDER_AVAX_LP);
        
        const token0Address = '0x' + token0Result.slice(26); // Remove padding
        const isOrderToken0 = token0Address.toLowerCase() === CONTRACT_ADDRESSES.tokens.ORDER.toLowerCase();
        
        console.log('🔍 Token analysis:', {
          token0Address,
          orderAddress: CONTRACT_ADDRESSES.tokens.ORDER,
          isOrderToken0,
          reserve0: reserve0.toString(),
          reserve1: reserve1.toString()
        });
        
        if (isOrderToken0) {
          orderReserve = Number(reserve0) / 1e18;
          avaxReserve = Number(reserve1) / 1e18;
        } else {
          orderReserve = Number(reserve1) / 1e18;
          avaxReserve = Number(reserve0) / 1e18;
        }
      } else {
        console.log('⚠️ No reserves data received');
      }

      // Convert from wei to readable numbers
      const userLPBalance = Number(BigInt(userLPResult || '0')) / 1e18;
      const totalLPSupply = Number(BigInt(totalSupplyResult || '0')) / 1e18;

      // Calculate user share percentage
      const userShare = totalLPSupply > 0 ? (userLPBalance / totalLPSupply) * 100 : 0;

      // Calculate user's share of reserves
      const userOrderValue = orderReserve * (userLPBalance / totalLPSupply);
      const userAvaxValue = avaxReserve * (userLPBalance / totalLPSupply);

      // Calculate TVL in USD using DexScreener real-time prices
      const orderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER); // Real ORDER price from DexScreener
      const avaxPrice = getAVAXPrice(); // Real AVAX price from DexScreener
      
      const totalTVL = (orderReserve * orderPrice) + (avaxReserve * avaxPrice);
      
      console.log('💰 TVL Calculation with DexScreener prices:', {
        orderReserve,
        orderPrice: `$${orderPrice.toFixed(6)}`,
        orderValue: `$${(orderReserve * orderPrice).toFixed(2)}`,
        avaxReserve, 
        avaxPrice: `$${avaxPrice.toFixed(2)}`,
        avaxValue: `$${(avaxReserve * avaxPrice).toFixed(2)}`,
        totalTVL: `$${totalTVL.toFixed(2)}`
      });

      const newLpData = {
        userLPBalance,
        totalLPSupply,
        userShare,
        orderReserve,
        avaxReserve,
        userOrderValue,
        userAvaxValue,
        totalTVL
      };

      console.log('✅ LP Pool data fetched:', newLpData);
      setLpData(newLpData);
      setError(null);
      setDataLoaded(true);
      retryCount.current = 0; // Reset retry count on success
    } catch (error) {
      console.error('❌ Error fetching LP data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch LP data';
      
      // Only set error if we haven't loaded data before or after max retries
      if (!dataLoaded || retryCount.current >= maxRetries) {
        setError(errorMessage);
        // Set default values on error
        setLpData({
          userLPBalance: 0,
          totalLPSupply: 0,
          userShare: 0,
          orderReserve: 0,
          avaxReserve: 0,
          userOrderValue: 0,
          userAvaxValue: 0,
          totalTVL: 0
        });
      }
      
      retryCount.current++;
    } finally {
      setIsLoading(false);
    }
  }, [arenaData?.sdk?.provider, arenaData?.isConnected, arenaData?.address, getTokenPrice, getAVAXPrice, dataLoaded]);

  useEffect(() => {
    // Only fetch data on initial mount or when wallet connection changes
    if (!dataLoaded) {
      const timer = setTimeout(() => {
        fetchLPData();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [arenaData?.isConnected, fetchLPData, dataLoaded]);

  // Remove automatic periodic refresh - only refresh manually
  // Users can press F5 or use the retry button to refresh

  // Force refresh function that clears cache and refetches
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refreshing LP data...');
    setError(null);
    setIsLoading(true);
    setDataLoaded(false);
    retryCount.current = 0; // Reset retry count
    lastRefreshTime.current = 0; // Reset refresh time to allow immediate refresh
    
    // Add small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await fetchLPData();
  }, [fetchLPData]);

  return {
    lpData,
    isLoading,
    error,
    refresh: fetchLPData,
    forceRefresh
  };
};
