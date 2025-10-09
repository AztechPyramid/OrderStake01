import { useMemo } from 'react';
import { useAllPoolsData } from './useAllPoolsData';
import { useEcosystemPools } from './useEcosystemPools';
import { useDexScreener } from './useDexScreener';
import { ethers } from 'ethers';

interface TVLPoolData {
  pool: string;
  stakingToken: string;
  rewardToken: string;
  tvlOrderAmount?: number;
  tvlUsd: number;
  apy?: number;
  isEcosystemPool: boolean;
  stakingTokenAddress?: string;
  rewardTokenAddress?: string;
}

export const useEnhancedTVLData = () => {
  // Original Arena pools data
  const { pools: arenaPools, totalTVLUsd: arenaTVL, orderPrice, isLoading: arenaLoading } = useAllPoolsData();
  
  // Ecosystem pools data from GitHub indexer
  const { pools: ecosystemPools, isLoading: ecosystemLoading } = useEcosystemPools();
  
  // DexScreener price data
  const { getTokenPrice, isLoading: priceLoading } = useDexScreener();

  // Calculate ecosystem pools TVL
  const ecosystemTVLPools = useMemo(() => {
    if (!ecosystemPools.length) return [];

    return ecosystemPools
      .map(pool => {
        try {
          // Get staking token info
          const stakingTokenSymbol = pool.tokenInfo?.stakingToken?.symbol || pool.poolMetadata?.stakingSymbol || 'Unknown';
          const rewardTokenSymbol = pool.tokenInfo?.rewardToken?.symbol || pool.poolMetadata?.rewardSymbol || 'Unknown';
          
          // Get total staked amount (in wei)
          const totalStakedWei = pool.poolData?.totalStaked || '0';
          const stakingTokenDecimals = pool.tokenInfo?.stakingToken?.decimals || 18;
          
          // Convert wei to readable amount
          const totalStakedAmount = parseFloat(ethers.formatUnits(totalStakedWei, stakingTokenDecimals));
          
          // Skip if no staking
          if (totalStakedAmount === 0) return null;
          
          // Get token price from DexScreener
          const stakingTokenAddress = pool.poolData?.stakingToken;
          const stakingTokenPrice = stakingTokenAddress ? getTokenPrice(stakingTokenAddress) : 0;
          
          // Calculate TVL in USD
          const tvlUsd = totalStakedAmount * stakingTokenPrice;
          
          // Skip if price not available or TVL too low
          if (!stakingTokenPrice || tvlUsd < 1) return null;

          return {
            pool: `${stakingTokenSymbol} → ${rewardTokenSymbol}`,
            stakingToken: stakingTokenSymbol,
            rewardToken: rewardTokenSymbol,
            tvlUsd,
            isEcosystemPool: true,
            stakingTokenAddress,
            rewardTokenAddress: pool.poolData?.rewardToken,
            apy: 0, // Could be calculated if needed
            tvlTokenAmount: totalStakedAmount,
            poolAddress: pool.address,
            poolName: pool.poolMetadata?.poolName
          };
        } catch (error) {
          console.warn(`Error calculating TVL for pool ${pool.address}:`, error);
          return null;
        }
      })
      .filter((pool): pool is NonNullable<typeof pool> => pool !== null)
      .filter(pool => pool.tvlUsd >= 10) // Only show pools with at least $10 TVL
      .sort((a, b) => b.tvlUsd - a.tvlUsd); // Sort by TVL descending
  }, [ecosystemPools, getTokenPrice]);

  // Combine Arena pools and Ecosystem pools
  const allPools: TVLPoolData[] = useMemo(() => {
    // Convert arena pools to enhanced format
    const enhancedArenaPools: TVLPoolData[] = arenaPools.map(pool => ({
      ...pool,
      isEcosystemPool: false
    }));

    // Combine and sort by TVL
    return [...enhancedArenaPools, ...ecosystemTVLPools].sort((a, b) => b.tvlUsd - a.tvlUsd);
  }, [arenaPools, ecosystemTVLPools]);

  // Calculate total TVL
  const totalTVLUsd = useMemo(() => {
    return allPools.reduce((sum, pool) => sum + pool.tvlUsd, 0);
  }, [allPools]);

  // Calculate ecosystem TVL separately
  const ecosystemTVLUsd = useMemo(() => {
    return ecosystemTVLPools.reduce((sum, pool) => sum + pool.tvlUsd, 0);
  }, [ecosystemTVLPools]);

  return {
    pools: allPools,
    arenaPools,
    ecosystemPools: ecosystemTVLPools,
    totalTVLUsd,
    arenaTVLUsd: arenaTVL,
    ecosystemTVLUsd,
    orderPrice,
    isLoading: arenaLoading || ecosystemLoading || priceLoading,
    // Stats
    totalArenaPoolsCount: arenaPools.length,
    totalEcosystemPoolsCount: ecosystemTVLPools.length,
    totalPoolsCount: allPools.length
  };
};