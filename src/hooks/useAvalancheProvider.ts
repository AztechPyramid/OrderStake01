import { useCallback, useEffect, useState } from 'react';
import { ethers, BrowserProvider, JsonRpcProvider } from 'ethers';
import { useArenaSDK } from './useArenaSDK';

/**
 * Enhanced provider hook that ensures reliable Avalanche C-Chain connectivity
 * This hook provides fallback mechanisms for Arena SDK provider issues
 */
export const useAvalancheProvider = () => {
  const { sdk, isConnected, isInArena } = useArenaSDK();
  const [providerStatus, setProviderStatus] = useState<{
    isReady: boolean;
    isArenaWorking: boolean;
    isFallbackActive: boolean;
    lastError: string | null;
  }>({
    isReady: false,
    isArenaWorking: false,
    isFallbackActive: false,
    lastError: null
  });

  // Avalanche C-Chain RPC endpoints (ordered by preference)
  const AVALANCHE_RPCS = [
    'https://api.avax.network/ext/bc/C/rpc',           // Official Avalanche RPC
    'https://rpc.ankr.com/avalanche',                  // Ankr RPC
    'https://avalanche-c-chain.publicnode.com',       // PublicNode RPC
    'https://1rpc.io/avax/c',                          // 1RPC
    'https://avalanche.blockpi.network/v1/rpc/public', // BlockPI
  ];

  // Test if a provider can make successful calls to Avalanche
  const testProvider = useCallback(async (provider: JsonRpcProvider | BrowserProvider): Promise<boolean> => {
    try {
      console.log('🧪 Testing provider connectivity...');
      
      // Test basic connectivity with timeout
      const networkPromise = provider.getNetwork();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network check timeout')), 3000)
      );
      
      const network = await Promise.race([networkPromise, timeoutPromise]) as any;
      
      // Verify it's Avalanche C-Chain
      if (Number(network.chainId) !== 43114) {
        console.warn('Provider is not on Avalanche C-Chain:', network.chainId);
        return false;
      }
      
      // Test eth_getCode call (this was failing)
      const codePromise = provider.getCode('0x3e0e28bb59f823222f01702710eb600661ed0949');
      const codeTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getCode timeout')), 5000)
      );
      
      await Promise.race([codePromise, codeTimeoutPromise]);
      
      // Test block number call
      const blockPromise = provider.getBlockNumber();
      const blockTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getBlockNumber timeout')), 3000)
      );
      
      await Promise.race([blockPromise, blockTimeoutPromise]);
      
      console.log('✅ Provider test successful');
      return true;
    } catch (error: any) {
      console.warn('❌ Provider test failed:', error.message);
      return false;
    }
  }, []);

  // Get the best available provider for Avalanche with auto-testing
  const getProvider = useCallback(async (): Promise<JsonRpcProvider | BrowserProvider> => {
    // If Arena SDK is available and working, use it
    if (sdk?.provider && providerStatus.isArenaWorking) {
      return new BrowserProvider(sdk.provider);
    }
    
    // Test multiple RPC endpoints to find the best one
    for (const rpcUrl of AVALANCHE_RPCS) {
      try {
        console.log(`🔍 Testing RPC: ${rpcUrl}`);
        const testProvider = new JsonRpcProvider(rpcUrl);
        const isWorking = await testProvider.getBlockNumber();
        
        if (isWorking) {
          console.log(`✅ Using RPC: ${rpcUrl}`);
          return testProvider;
        }
      } catch (error: any) {
        console.warn(`❌ RPC failed: ${rpcUrl}`, error.message);
        continue;
      }
    }
    
    // Fallback to first RPC (might work despite test failure)
    console.warn('⚠️ All RPC tests failed, using first endpoint as fallback');
    return new JsonRpcProvider(AVALANCHE_RPCS[0]);
  }, [sdk, providerStatus.isArenaWorking, AVALANCHE_RPCS]);

  // Get provider specifically for write operations (transactions)
  const getWriteProvider = useCallback(async (): Promise<BrowserProvider | null> => {
    if (!sdk?.provider || !isConnected) {
      return null;
    }
    
    const browserProvider = new BrowserProvider(sdk.provider);
    
    // Test if Arena provider can handle transactions
    try {
      const signer = await browserProvider.getSigner();
      return browserProvider;
    } catch (error: any) {
      console.error('Arena provider cannot create signer:', error.message);
      return null;
    }
  }, [sdk, isConnected]);

  // Enhanced provider that tries Arena first, then falls back to multiple Avalanche RPCs
  const getRobustProvider = useCallback(() => {
    // Create a pool of fallback providers
    const fallbackProviders = AVALANCHE_RPCS.map(rpc => new JsonRpcProvider(rpc));
    let currentFallbackIndex = 0;
    
    if (!sdk?.provider) {
      console.log('📡 No Arena provider, using Avalanche RPC pool');
      return fallbackProviders[0];
    }
    
    const arenaProvider = new BrowserProvider(sdk.provider);
    
    // Create a proxy that tries Arena first, then cycles through fallback RPCs
    return new Proxy(arenaProvider, {
      get(target, prop, receiver) {
        // For critical read operations that might fail
        if (['call', 'getCode', 'getNetwork', 'getBlockNumber', 'getBlock'].includes(String(prop))) {
          return async function(...args: any[]) {
            // Try Arena provider first (with shorter timeout for faster failover)
            try {
              const result = await Promise.race([
                (target as any)[prop](...args),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Arena provider timeout')), 5000)
                )
              ]);
              return result;
            } catch (error: any) {
              console.warn(`Arena provider failed for ${String(prop)}: ${error.message}`);
              
              // Update status
              setProviderStatus(prev => ({
                ...prev,
                isArenaWorking: false,
                isFallbackActive: true,
                lastError: error.message
              }));
              
              // Try fallback providers one by one
              for (let i = 0; i < fallbackProviders.length; i++) {
                const fallbackIndex = (currentFallbackIndex + i) % fallbackProviders.length;
                const fallbackProvider = fallbackProviders[fallbackIndex];
                
                try {
                  console.log(`🔄 Trying fallback RPC ${fallbackIndex + 1}/${fallbackProviders.length}: ${AVALANCHE_RPCS[fallbackIndex]}`);
                  
                  const fallbackResult = await Promise.race([
                    (fallbackProvider as any)[prop](...args),
                    new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Fallback timeout')), 8000)
                    )
                  ]);
                  
                  console.log(`✅ Fallback RPC ${fallbackIndex + 1} succeeded`);
                  currentFallbackIndex = fallbackIndex; // Remember working RPC
                  return fallbackResult;
                } catch (fallbackError: any) {
                  console.warn(`❌ Fallback RPC ${fallbackIndex + 1} failed: ${fallbackError.message}`);
                  continue;
                }
              }
              
              // All providers failed
              console.error(`❌ All providers failed for ${String(prop)}`);
              throw new Error(`Network connectivity issues. All RPC endpoints failed. Original error: ${error.message}`);
            }
          };
        }
        
        // For other operations, use original target
        return Reflect.get(target, prop, receiver);
      }
    });
  }, [sdk, AVALANCHE_RPCS]);

  // Test Arena provider connectivity periodically
  useEffect(() => {
    if (!isInArena || !sdk?.provider) {
      setProviderStatus(prev => ({
        ...prev,
        isReady: true,
        isArenaWorking: false,
        isFallbackActive: true
      }));
      return;
    }

    const testArenaProvider = async () => {
      try {
        const arenaProvider = new BrowserProvider(sdk.provider);
        const isWorking = await testProvider(arenaProvider);
        
        setProviderStatus(prev => ({
          ...prev,
          isReady: true,
          isArenaWorking: isWorking,
          isFallbackActive: !isWorking,
          lastError: isWorking ? null : 'Arena provider connectivity issues'
        }));
        
        if (isWorking) {
          console.log('✅ Arena provider is working correctly');
        } else {
          console.warn('⚠️ Arena provider has issues, fallback will be used');
        }
      } catch (error: any) {
        console.error('Arena provider test failed:', error);
        setProviderStatus(prev => ({
          ...prev,
          isReady: true,
          isArenaWorking: false,
          isFallbackActive: true,
          lastError: error.message
        }));
      }
    };

    // Test immediately
    testArenaProvider();
    
    // Test periodically (every 30 seconds)
    const interval = setInterval(testArenaProvider, 30000);
    
    return () => clearInterval(interval);
  }, [sdk, isInArena, testProvider]);

  return {
    // Providers
    getProvider,           // Get best read provider (async)
    getRobustProvider,     // Get provider with automatic fallback (sync)
    getWriteProvider,      // Get provider for transactions
    
    // Status
    ...providerStatus,
    isInArena,
    
    // Utilities
    testProvider,
    AVALANCHE_RPCS
  };
};