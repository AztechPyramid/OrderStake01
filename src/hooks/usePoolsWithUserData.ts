import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useSubgraphPools, SubgraphPool, blockToDate } from './useSubgraphPools';
import { ECOSYSTEM_STAKING_ABI } from '@/contracts/EcosystemStakingABI';

export interface EnrichedPoolData extends Partial<SubgraphPool> {
  // Required from subgraph
  id: string;
  address: string;
  stakingToken: string;
  rewardToken: string;
  rewardPerBlock: string;
  startBlock: string;
  endBlock: string;
  totalStaked: string;
  creator: {
    id: string;
    address: string;
  };
  
  // User-specific data from contract
  userStakeAmount: string;
  userPendingReward: string;
  
  // Calculated fields
  remainingRewardAmount: string;
  estimatedEndDate: Date | null;
  daysRemaining: number;
  isUserStaking: boolean;
}

export function usePoolsWithUserData(
  page: number = 0,
  pageSize: number = 20,
  searchQuery: string = '',
  provider?: ethers.BrowserProvider,
  userAddress?: string
) {
  const { pools, loading: subgraphLoading, error: subgraphError, hasMore, refetch } = useSubgraphPools(page, pageSize, searchQuery);
  
  const [enrichedPools, setEnrichedPools] = useState<EnrichedPoolData[]>([]);
  const [contractLoading, setContractLoading] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<number>(0);

  // Fetch current block number (less frequently to avoid rate limiting)
  useEffect(() => {
    if (!provider) return;

    const fetchCurrentBlock = async () => {
      try {
        const block = await provider.getBlockNumber();
        setCurrentBlock(block);
      } catch (err) {
        console.error('Error fetching current block:', err);
      }
    };

    fetchCurrentBlock();
    const interval = setInterval(fetchCurrentBlock, 60000); // Update every 60 seconds instead of 10

    return () => clearInterval(interval);
  }, [provider]);

  // Enrich pools with user-specific data
  const enrichPoolsWithUserData = useCallback(async () => {
    if (!pools.length) {
      setEnrichedPools([]);
      return;
    }
    
    if (!provider || !currentBlock) {
      // If no user connected, still return pools with default values
      if (!provider && pools.length) {
        const defaultEnriched = pools.map(pool => ({
          ...pool,
          userStakeAmount: '0',
          userPendingReward: '0',
          remainingRewardAmount: pool.totalRewardAmount || '0',
          estimatedEndDate: blockToDate(Number(pool.endBlock), currentBlock || 0),
          daysRemaining: Math.max(0, Math.ceil((Number(pool.endBlock) - (currentBlock || 0)) * 2 / 86400)),
          isUserStaking: false
        }));
        setEnrichedPools(defaultEnriched);
      }
      return;
    }

    try {
      setContractLoading(true);

      // Add delay to avoid overwhelming RPC
      await new Promise(resolve => setTimeout(resolve, 300));

      // Batch contract calls for efficiency
      const enrichedData = await Promise.all(
        pools.map(async (pool) => {
          const poolContract = new ethers.Contract(
            pool.address,
            ECOSYSTEM_STAKING_ABI,
            provider
          );

          let userStakeAmount = '0';
          let userPendingReward = '0';
          let remainingRewardAmount = pool.totalRewardAmount || pool.totalStaked || '0';

          try {
            // Fetch user-specific data if address provided
            if (userAddress) {
              const [stakeInfo, pending] = await Promise.all([
                poolContract.stakes(userAddress),
                poolContract.pendingReward(userAddress)
              ]);

              userStakeAmount = ethers.formatEther(stakeInfo.amount);
              userPendingReward = ethers.formatEther(pending);
            }

            // Get remaining rewards
            const rewardToken = await poolContract.rewardToken();
            const rewardTokenContract = new ethers.Contract(
              rewardToken,
              ['function balanceOf(address) view returns (uint256)'],
              provider
            );
            const balance = await rewardTokenContract.balanceOf(pool.address);
            remainingRewardAmount = ethers.formatEther(balance);

          } catch (err) {
            console.error(`Error fetching data for pool ${pool.address}:`, err);
          }

          // Calculate derived fields
          const estimatedEndDate = blockToDate(Number(pool.endBlock), currentBlock);
          const blocksRemaining = Math.max(0, Number(pool.endBlock) - currentBlock);
          const daysRemaining = Math.ceil(blocksRemaining * 2 / 86400); // 2 seconds per block

          return {
            ...pool,
            userStakeAmount,
            userPendingReward,
            remainingRewardAmount,
            estimatedEndDate,
            daysRemaining,
            isUserStaking: Number(userStakeAmount) > 0
          };
        })
      );

      setEnrichedPools(enrichedData);
      console.log(`✅ Enriched ${enrichedData.length} pools with user data`);
      
    } catch (err) {
      console.error('❌ Error enriching pools with user data:', err);
      // Fallback to basic data if enrichment fails
      const fallbackData = pools.map(pool => ({
        ...pool,
        userStakeAmount: '0',
        userPendingReward: '0',
        remainingRewardAmount: pool.totalRewardAmount || '0',
        estimatedEndDate: blockToDate(Number(pool.endBlock), currentBlock),
        daysRemaining: Math.max(0, Math.ceil((Number(pool.endBlock) - currentBlock) * 2 / 86400)),
        isUserStaking: false
      }));
      setEnrichedPools(fallbackData);
    } finally {
      setContractLoading(false);
    }
  }, [pools, provider, userAddress, currentBlock]);

  // Only enrich when pools change, not on every currentBlock update
  useEffect(() => {
    if (pools.length > 0) {
      enrichPoolsWithUserData();
    }
  }, [pools, userAddress]); // Removed currentBlock from deps

  return {
    pools: enrichedPools,
    loading: subgraphLoading || contractLoading,
    subgraphLoading,
    contractLoading,
    error: subgraphError,
    hasMore,
    currentBlock,
    refetch: () => {
      refetch();
      enrichPoolsWithUserData();
    }
  };
}

// Helper hook for single pool data
export function usePoolWithUserData(
  poolAddress: string,
  provider?: ethers.BrowserProvider,
  userAddress?: string
) {
  const [poolData, setPoolData] = useState<EnrichedPoolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolData = useCallback(async () => {
    if (!poolAddress || !provider) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch from contract (you can also add subgraph query here)
      const poolContract = new ethers.Contract(
        poolAddress,
        ECOSYSTEM_STAKING_ABI,
        provider
      );

      const currentBlock = await provider.getBlockNumber();

      // Fetch pool info
      const [stakingToken, rewardToken, rewardPerBlock, startBlock, endBlock] = await Promise.all([
        poolContract.stakingToken(),
        poolContract.rewardToken(),
        poolContract.rewardPerBlock(),
        poolContract.startBlock(),
        poolContract.endBlock()
      ]);

      let userStakeAmount = '0';
      let userPendingReward = '0';

      if (userAddress) {
        const [stakeInfo, pending] = await Promise.all([
          poolContract.stakes(userAddress),
          poolContract.pendingReward(userAddress)
        ]);

        userStakeAmount = ethers.formatEther(stakeInfo.amount);
        userPendingReward = ethers.formatEther(pending);
      }

      // Calculate remaining rewards
      const rewardTokenContract = new ethers.Contract(
        rewardToken,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const balance = await rewardTokenContract.balanceOf(poolAddress);
      const remainingRewardAmount = ethers.formatEther(balance);

      const estimatedEndDate = blockToDate(Number(endBlock), currentBlock);
      const blocksRemaining = Math.max(0, Number(endBlock) - currentBlock);
      const daysRemaining = Math.ceil(blocksRemaining * 2 / 86400);

      // Create basic pool data (you should fetch from subgraph for full data)
      const basicPoolData: any = {
        id: poolAddress,
        address: poolAddress,
        stakingToken,
        rewardToken,
        rewardPerBlock: ethers.formatEther(rewardPerBlock),
        startBlock: startBlock.toString(),
        endBlock: endBlock.toString(),
        userStakeAmount,
        userPendingReward,
        remainingRewardAmount,
        estimatedEndDate,
        daysRemaining,
        isUserStaking: Number(userStakeAmount) > 0
      };

      setPoolData(basicPoolData);
      
    } catch (err) {
      console.error('Error fetching pool data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pool data');
    } finally {
      setLoading(false);
    }
  }, [poolAddress, provider, userAddress]);

  useEffect(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  return {
    poolData,
    loading,
    error,
    refetch: fetchPoolData
  };
}
