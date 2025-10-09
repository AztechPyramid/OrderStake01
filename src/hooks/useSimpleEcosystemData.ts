/**
 * Simple Ecosystem Data Hook - GitHub Integration
 * Replaces complex factory hook with simple GitHub indexer integration
 */
import { useState, useEffect, useCallback } from 'react';
import { githubDataService, PoolData } from '@/services/githubDataService';
import { useArenaSDK } from './useArenaSDK';

interface EcosystemData {
  pools: PoolData[];
  totalPoolsCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export const useSimpleEcosystemData = () => {
  const { address } = useArenaSDK();
  
  const [data, setData] = useState<EcosystemData>({
    pools: [],
    totalPoolsCount: 0,
    isLoading: false,
    error: null,
    lastUpdate: null
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPools, setFilteredPools] = useState<PoolData[]>([]);

  // Fetch pools from GitHub indexer
  const fetchPools = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('📊 Fetching pools from GitHub indexer...');
      
      // Check if data is available
      const isAvailable = await githubDataService.isAvailable();
      if (!isAvailable) {
        // If GitHub data not available, return empty state (not an error)
        console.warn('⚠️ GitHub indexer data not yet available');
        setData(prev => ({
          ...prev,
          pools: [],
          totalPoolsCount: 0,
          isLoading: false,
          error: null // Don't treat this as error
        }));
        return;
      }

      // Fetch all pools
      const poolsData = await githubDataService.getPoolsArray();
      const lastUpdate = await githubDataService.getLastUpdate();
      
      console.log(`✅ Loaded ${poolsData.length} pools from GitHub indexer`);
      
      setData(prev => ({
        ...prev,
        pools: poolsData,
        totalPoolsCount: poolsData.length,
        lastUpdate,
        isLoading: false
      }));
      
      // Set filtered pools to all pools initially
      setFilteredPools(poolsData);
      
    } catch (error) {
      console.error('❌ Error fetching pools from indexer:', error);
      setData(prev => ({
        ...prev,
        error: 'Indexer data temporarily unavailable',
        isLoading: false
      }));
    }
  }, []);

  // Filter pools based on search term
  const searchPools = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredPools(data.pools);
      return;
    }
    
    const searchTerm = query.toLowerCase();
    const filtered = data.pools.filter(pool => {
      // Search by pool address
      if (pool.address.toLowerCase().includes(searchTerm)) return true;
      
      // Search by creator address
      if (pool.creatorProfile.address.toLowerCase().includes(searchTerm)) return true;
      
      // Search by pool name
      if (pool.poolMetadata.poolName?.toLowerCase().includes(searchTerm)) return true;
      
      // Search by token symbols
      if (pool.poolMetadata.stakingSymbol?.toLowerCase().includes(searchTerm)) return true;
      if (pool.poolMetadata.rewardSymbol?.toLowerCase().includes(searchTerm)) return true;
      
      return false;
    });
    
    setFilteredPools(filtered);
  }, [data.pools]);

  // Get user's created pools
  const getUserCreatedPools = useCallback(() => {
    if (!address) return [];
    
    return data.pools.filter(pool => 
      pool.creatorProfile.address.toLowerCase() === address.toLowerCase()
    );
  }, [address, data.pools]);

  // Get user's staked pools (placeholder - would need staking events indexing)
  const getUserStakedPools = useCallback(() => {
    // TODO: This would require indexing user staking events
    // For now, return empty array
    return [];
  }, []);

  // Update search when term changes
  useEffect(() => {
    searchPools(searchTerm);
  }, [searchTerm, searchPools]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing ecosystem data...');
      fetchPools();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchPools]);

  return {
    // Data
    pools: filteredPools,
    totalPoolsCount: data.totalPoolsCount,
    allPools: data.pools,
    isLoading: data.isLoading,
    error: data.error,
    lastUpdate: data.lastUpdate,
    
    // Search
    searchTerm,
    setSearchTerm,
    searchPools,
    
    // User-specific
    getUserCreatedPools,
    getUserStakedPools,
    
    // Functions
    fetchPools,
    refreshData: () => {
      githubDataService.clearCache();
      fetchPools();
    }
  };
};

export default useSimpleEcosystemData;