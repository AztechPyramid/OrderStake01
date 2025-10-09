import React, { createContext, useContext, useState, useCallback } from 'react';

interface PoolSearchData {
  poolName?: string;
  stakingSymbol?: string;
  rewardSymbol?: string;
  creatorUsername?: string;
  creatorDisplayName?: string;
  creatorAddress?: string;
}

interface SearchContextType {
  updatePoolSearchData: (poolAddress: string, data: Partial<PoolSearchData>) => void;
  getPoolSearchData: (poolAddress: string) => PoolSearchData | undefined;
  searchInPool: (poolAddress: string, searchTerm: string) => boolean;
}

const SearchContext = createContext<SearchContextType | null>(null);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [poolsSearchData, setPoolsSearchData] = useState<{[address: string]: PoolSearchData}>({});

  const updatePoolSearchData = useCallback((poolAddress: string, data: Partial<PoolSearchData>) => {
    setPoolsSearchData(prev => ({
      ...prev,
      [poolAddress]: {
        ...prev[poolAddress],
        ...data
      }
    }));
  }, []);

  const getPoolSearchData = useCallback((poolAddress: string) => {
    return poolsSearchData[poolAddress];
  }, [poolsSearchData]);

  const searchInPool = useCallback((poolAddress: string, searchTerm: string): boolean => {
    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase();
    const data = poolsSearchData[poolAddress];

    // Search by pool address
    const addressMatch = poolAddress.toLowerCase().includes(search);
    
    if (!data) return addressMatch;

    // Search by pool metadata
    const poolNameMatch = data.poolName ? data.poolName.toLowerCase().includes(search) : false;
    const stakingSymbolMatch = data.stakingSymbol ? data.stakingSymbol.toLowerCase().includes(search) : false;
    const rewardSymbolMatch = data.rewardSymbol ? data.rewardSymbol.toLowerCase().includes(search) : false;
    const creatorUsernameMatch = data.creatorUsername ? data.creatorUsername.toLowerCase().includes(search) : false;
    const creatorDisplayNameMatch = data.creatorDisplayName ? data.creatorDisplayName.toLowerCase().includes(search) : false;
    const creatorAddressMatch = data.creatorAddress ? data.creatorAddress.toLowerCase().includes(search) : false;

    return addressMatch || poolNameMatch || stakingSymbolMatch || rewardSymbolMatch || 
           creatorUsernameMatch || creatorDisplayNameMatch || creatorAddressMatch;
  }, [poolsSearchData]);

  return (
    <SearchContext.Provider value={{
      updatePoolSearchData,
      getPoolSearchData,
      searchInPool
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
};