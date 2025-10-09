import { useState, useEffect, useCallback } from 'react';
import { request } from 'graphql-request';
import { 
  SUBGRAPH_URL, 
  GET_POOLS_QUERY, 
  SEARCH_POOLS_QUERY,
  GET_FACTORY_STATS_QUERY 
} from '@/config/subgraph';

export interface SubgraphPool {
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
  // Optional fields that may not exist in current schema
  poolName?: string;
  poolDescription?: string;
  stakingSymbol?: string;
  rewardSymbol?: string;
  stakingLogo?: string;
  rewardLogo?: string;
  totalRewardAmount?: string;
  totalUsers?: string;
  createdAt?: string;
  createdAtBlock?: string;
  isActive?: boolean;
}

export interface FactoryStats {
  poolCount: string;
  totalOrderBurned: string;
}

export interface GlobalStats {
  totalPools: string;
  totalOrderBurned: string;
  totalCreators: string;
  totalValueLocked: string;
}

export function useSubgraphPools(
  page: number = 0,
  pageSize: number = 20,
  searchQuery: string = ''
) {
  const [pools, setPools] = useState<SubgraphPool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

      const skip = page * pageSize;
      
      let data: any;
      if (searchQuery) {
        // Search query
        data = await request(SUBGRAPH_URL, SEARCH_POOLS_QUERY, {
          searchTerm: searchQuery,
          first: pageSize,
          skip
        });
      } else {
        // Normal pagination
        data = await request(SUBGRAPH_URL, GET_POOLS_QUERY, {
          first: pageSize,
          skip,
          orderBy: 'createdAt',
          orderDirection: 'desc'
        });
      }

      const fetchedPools = (data?.pools || []) as SubgraphPool[];
      setPools(fetchedPools);
      setHasMore(fetchedPools.length === pageSize);
      
      console.log(`📊 Fetched ${fetchedPools.length} pools from subgraph (page ${page})`);
    } catch (err) {
      console.error('❌ Error fetching pools from subgraph:', err);
      
      // Handle rate limiting with retry
      if (err instanceof Error && err.message.includes('429')) {
        console.warn('⚠️ Rate limited, retrying in 2 seconds...');
        setTimeout(() => fetchPools(), 2000);
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return {
    pools,
    loading,
    error,
    hasMore,
    refetch: fetchPools
  };
}

export function useFactoryStats() {
  const [stats, setStats] = useState<{
    factory: FactoryStats | null;
    global: GlobalStats | null;
  }>({
    factory: null,
    global: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data: any = await request(SUBGRAPH_URL, GET_FACTORY_STATS_QUERY);

      setStats({
        factory: data?.factory || null,
        global: data?.statistic || null
      });

      console.log('📊 Factory stats fetched:', data);
    } catch (err) {
      console.error('❌ Error fetching factory stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    factoryStats: stats.factory,
    globalStats: stats.global,
    loading,
    error,
    refetch: fetchStats
  };
}

// Helper function to convert block number to date
export function blockToDate(blockNumber: number, currentBlock: number): Date {
  const blockDiff = blockNumber - currentBlock;
  const secondsDiff = blockDiff * 2; // Avalanche: 2 seconds per block
  return new Date(Date.now() + (secondsDiff * 1000));
}

// Helper function to check if pool is active
export function isPoolActive(startBlock: string, endBlock: string, currentBlock: number): boolean {
  const start = Number(startBlock);
  const end = Number(endBlock);
  return currentBlock >= start && currentBlock < end;
}
