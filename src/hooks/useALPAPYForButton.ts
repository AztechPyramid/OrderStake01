import { useMemo } from 'react';
import { useALPAPY } from './useALPAPY';
import { useRemainingBalances } from './useRemainingBalances';
import { useDexScreener } from './useDexScreener';
import { useLPData } from './useLPData';
import { useTotalStakedALP } from './useTotalStakedALP';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
import { formatAPY } from '@/utils/formatters';

/**
 * Hook to get ALP staking APY for display in buttons/headers
 * Uses the same calculation logic as ALPStakingCard for consistency
 */
export const useALPAPYForButton = () => {
  const { xOrderRemaining, xArenaRemaining } = useRemainingBalances();
  const { getTokenPrice, getAVAXPrice } = useDexScreener();
  const { lpData } = useLPData();
  const { totalStakedALP } = useTotalStakedALP();

  // Calculate total staked value - same logic as ALPStakingCard
  const totalStakedValueUSD = useMemo(() => {
    if (!lpData || lpData.totalLPSupply <= 0 || parseFloat(totalStakedALP) <= 0) return 0;
    
    const globalStakedALP = parseFloat(totalStakedALP); // Use global total instead of user staked
    const stakedSharePercent = globalStakedALP / lpData.totalLPSupply;
    const stakedOrderAmount = lpData.orderReserve * stakedSharePercent;
    const stakedAvaxAmount = lpData.avaxReserve * stakedSharePercent;
    
    const orderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER);
    const avaxPrice = getAVAXPrice();
    
    return (stakedOrderAmount * orderPrice) + (stakedAvaxAmount * avaxPrice);
  }, [lpData, totalStakedALP, getTokenPrice, getAVAXPrice]);

  // Calculate total remaining rewards value - same logic as ALPStakingCard
  const totalRemainingValueUSD = useMemo(() => {
    const xOrderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.xORDER);
    const xArenaPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.xARENA);
    
    return (parseFloat(xOrderRemaining || '0') * xOrderPrice) + (parseFloat(xArenaRemaining || '0') * xArenaPrice);
  }, [xOrderRemaining, xArenaRemaining, getTokenPrice]);

  // Get APY data using the exact same calculation as ALPStakingCard
  const apyData = useALPAPY(totalStakedValueUSD, totalRemainingValueUSD);

  // Return formatted APY for button display
  return {
    apy: apyData.apy,
    isLoading: !lpData || !totalStakedALP || totalRemainingValueUSD === 0,
    isValid: apyData.apy !== null && !apyData.isEnded && totalRemainingValueUSD > 0 && totalStakedValueUSD > 0,
    formattedAPY: apyData.apy ? `${formatAPY(apyData.apy)}%` : null,
    // Debug info
    debug: {
      totalStakedValueUSD,
      totalRemainingValueUSD,
      totalStakedALP,
      lpData: lpData ? { totalLPSupply: lpData.totalLPSupply, orderReserve: lpData.orderReserve, avaxReserve: lpData.avaxReserve } : null
    }
  };
};