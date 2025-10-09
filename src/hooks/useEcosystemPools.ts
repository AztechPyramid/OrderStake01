/**
 * Ecosystem Pools Hook - GitHub Indexer Integration
 * Uses GitHub-hosted JSON data instead of direct blockchain calls
 */
import { useState, useEffect, useCallback } from 'react';
import { githubDataService, PoolData } from '@/services/githubDataService';
import { useArenaSDK } from './useArenaSDK';

export interface EcosystemPoolsState {
  pools: PoolData[];
  totalPoolsCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  isDataAvailable: boolean;
}

export interface UseEcosystemPoolsResult extends EcosystemPoolsState {
  // Data fetching
  fetchPools: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Pool filtering
  getAllPools: () => PoolData[];
  getActiveePools: () => PoolData[];
  getUpcomingPools: () => PoolData[];
  getEndedPools: () => PoolData[];
  
  // User-specific filters
  getUserStakedPools: () => PoolData[];
  getUserCreatedPools: () => PoolData[];
  
  // Search functionality
  searchPools: (query: string) => PoolData[];
  
  // Pool details
  getPool: (address: string) => Promise<PoolData | null>;
  
  // Status checks
  checkDataAvailability: () => Promise<boolean>;
}

export const useEcosystemPools = (): UseEcosystemPoolsResult => {
  const { address } = useArenaSDK();
  
  const [state, setState] = useState<EcosystemPoolsState>({
    pools: [],
    totalPoolsCount: 0,
    isLoading: false,
    error: null,
    lastUpdate: null,
    isDataAvailable: false
  });

  // Fetch pools from GitHub indexer
  const fetchPools = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('📊 Fetching pools from GitHub indexer...');
      
      // Check if data is available
      const isAvailable = await githubDataService.isAvailable();
      if (!isAvailable) {
        throw new Error('Indexer data not available. Please wait for initial indexing to complete.');
      }

      // Fetch all pools
      const poolsData = await githubDataService.getPoolsArray();
      const lastUpdate = await githubDataService.getLastUpdate();
      
      console.log(`✅ Loaded ${poolsData.length} pools from GitHub indexer`);
      
      setState(prev => ({
        ...prev,
        pools: poolsData,
        totalPoolsCount: poolsData.length,
        lastUpdate,
        isDataAvailable: true,
        isLoading: false
      }));
      
    } catch (error) {
      console.error('❌ Error fetching pools from indexer:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch pools',
        isLoading: false,
        isDataAvailable: false
      }));
    }
  }, []);

  // Refresh data and clear cache
  const refreshData = useCallback(async () => {
    githubDataService.clearCache();
    await fetchPools();
  }, [fetchPools]);

  // Get all pools (sorted by newest first based on startBlock)
  const getAllPools = useCallback(() => {
    return [...state.pools].sort((a, b) => {
      const blockA = parseInt(a.poolData?.startBlock || '0');
      const blockB = parseInt(b.poolData?.startBlock || '0');
      return blockB - blockA; // Newest first (higher block number first)
    });
  }, [state.pools]);

  // Get active pools (currently running)
  const getActivePools = useCallback(() => {
    const currentBlock = Date.now(); // Approximate, could be enhanced with real block number
    return state.pools.filter(pool => {
      return pool.poolStats.isActive && pool.poolStats.hasStarted && !pool.poolStats.hasEnded;
    });
  }, [state.pools]);

  // Get upcoming pools (not started yet)
  const getUpcomingPools = useCallback(() => {
    return state.pools.filter(pool => {
      return !pool.poolStats.hasStarted;
    });
  }, [state.pools]);

  // Get ended pools
  const getEndedPools = useCallback(() => {
    return state.pools.filter(pool => {
      return pool.poolStats.hasEnded;
    });
  }, [state.pools]);

  // Get pools where user has stake (requires wallet connection)
  const getUserStakedPools = useCallback(() => {
    if (!address) return [];
    
    // This would need additional data from indexer about user stakes
    // For now, return empty - can be enhanced when user staking data is indexed
    return state.pools.filter(pool => {
      // TODO: Check if user has stake in this pool
      // This requires indexing user staking events
      return false;
    });
  }, [address, state.pools]);

  // Get pools created by user
  const getUserCreatedPools = useCallback(() => {
    if (!address) return [];
    
    return state.pools.filter(pool => {
      return pool.creatorProfile.address.toLowerCase() === address.toLowerCase();
    });
  }, [address, state.pools]);

  // Search pools by various criteria
  const searchPools = useCallback((query: string) => {
    if (!query.trim()) return state.pools;
    
    const searchTerm = query.toLowerCase();
    
    return state.pools.filter(pool => {
      // Search by pool address
      if (pool.address.toLowerCase().includes(searchTerm)) return true;
      
      // Search by creator address
      if (pool.creatorProfile.address.toLowerCase().includes(searchTerm)) return true;
      
      // Search by pool name
      if (pool.poolMetadata.poolName?.toLowerCase().includes(searchTerm)) return true;
      
      // Search by token symbols
      if (pool.poolMetadata.stakingSymbol?.toLowerCase().includes(searchTerm)) return true;
      if (pool.poolMetadata.rewardSymbol?.toLowerCase().includes(searchTerm)) return true;
      
      // Search by token addresses
      if (pool.poolData.stakingToken.toLowerCase().includes(searchTerm)) return true;
      if (pool.poolData.rewardToken.toLowerCase().includes(searchTerm)) return true;
      
      // Search by pool description
      if (pool.poolMetadata.poolDescription?.toLowerCase().includes(searchTerm)) return true;
      
      return false;
    });
  }, [state.pools]);

  // Get specific pool
  const getPool = useCallback(async (address: string): Promise<PoolData | null> => {
    try {
      return await githubDataService.getPool(address);
    } catch (error) {
      console.error(`Error fetching pool ${address}:`, error);
      return null;
    }
  }, []);

  // Check data availability
  const checkDataAvailability = useCallback(async () => {
    try {
      const isAvailable = await githubDataService.isAvailable();
      setState(prev => ({ ...prev, isDataAvailable: isAvailable }));
      return isAvailable;
    } catch {
      setState(prev => ({ ...prev, isDataAvailable: false }));
      return false;
    }
  }, []);

  // Auto-fetch pools on mount
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // Auto-refresh every 5 minutes when data is available
  useEffect(() => {
    if (!state.isDataAvailable) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing pools data...');
      fetchPools();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [state.isDataAvailable, fetchPools]);

  return {
    ...state,
    fetchPools,
    refreshData,
    getAllPools,
    getActiveePools: getActivePools,
    getUpcomingPools,
    getEndedPools,
    getUserStakedPools,
    getUserCreatedPools,
    searchPools,
    getPool,
    checkDataAvailability
  };
};

export default useEcosystemPools;