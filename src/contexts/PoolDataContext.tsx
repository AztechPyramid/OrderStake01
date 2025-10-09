'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PoolData {
  [poolAddress: string]: any;
}

interface PoolDataContextType {
  getCachedPoolData: (poolAddress: string) => any;
  setCachedPoolData: (poolAddress: string, data: any) => void;
  clearCache: () => void;
  hasCachedData: (poolAddress: string) => boolean;
}

const PoolDataContext = createContext<PoolDataContextType | undefined>(undefined);

const POOL_DATA_CACHE_KEY = 'ecosystem-pool-data-cache';
// Cache artık süresiz - sadece manuel silme ile temizlenir
const CACHE_EXPIRY_TIME = Infinity;

export const usePoolDataContext = () => {
  const context = useContext(PoolDataContext);
  if (!context) {
    throw new Error('usePoolDataContext must be used within a PoolDataProvider');
  }
  return context;
};

interface PoolDataProviderProps {
  children: ReactNode;
}

export const PoolDataProvider: React.FC<PoolDataProviderProps> = ({ children }) => {
  const [cachedData, setCachedData] = useState<PoolData>({});

  // Load cached data from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(POOL_DATA_CACHE_KEY);
      if (cached) {
        const parsedData = JSON.parse(cached);
        const validData: PoolData = {};
        
        // Filter out expired data (artık expiry yok ama eski kodu temizlik için bırakıyoruz)
        Object.entries(parsedData).forEach(([poolAddress, data]: [string, any]) => {
          // Cache süresiz olduğu için tüm verileri valid kabul et
          validData[poolAddress] = data;
        });
        
        setCachedData(validData);
        
        // Update localStorage with only valid data
        if (Object.keys(validData).length !== Object.keys(parsedData).length) {
          localStorage.setItem(POOL_DATA_CACHE_KEY, JSON.stringify(validData));
        }
      }
    } catch (error) {
      console.warn('Failed to load pool data cache:', error);
    }
  }, []);

  const getCachedPoolData = (poolAddress: string) => {
    const data = cachedData[poolAddress];
    if (!data) return null;
    
    // Cache süresiz olduğu için expiry kontrolü yapılmıyor
    // Direkt veriyi döndür
    return data;
  };

  const setCachedPoolData = (poolAddress: string, data: any) => {
    const timestampedData = {
      ...data,
      timestamp: Date.now()
    };
    
    setCachedData(prev => ({
      ...prev,
      [poolAddress]: timestampedData
    }));
    
    // Update localStorage
    try {
      const updatedCache = {
        ...cachedData,
        [poolAddress]: timestampedData
      };
      localStorage.setItem(POOL_DATA_CACHE_KEY, JSON.stringify(updatedCache));
    } catch (error) {
      console.warn('Failed to save pool data to cache:', error);
    }
  };

  const hasCachedData = (poolAddress: string) => {
    return !!getCachedPoolData(poolAddress);
  };

  const clearCache = () => {
    setCachedData({});
    try {
      localStorage.removeItem(POOL_DATA_CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  };

  const value: PoolDataContextType = {
    getCachedPoolData,
    setCachedPoolData,
    clearCache,
    hasCachedData
  };

  return (
    <PoolDataContext.Provider value={value}>
      {children}
    </PoolDataContext.Provider>
  );
};