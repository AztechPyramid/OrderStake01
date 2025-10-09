import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArenaAppStoreSdk } from 'arena-app-store-sdk';

export const useArenaConnect = () => {
  const [sdk, setSdk] = useState<ArenaAppStoreSdk | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initSdk = async () => {
      try {
        const newSdk = new ArenaAppStoreSdk({
          projectId: '3b92724d86fb832c617225316f7c06b3', // From Rules.md
          metadata: {
            name: 'OrderStake Platform',
            description: 'OrderStake is a comprehensive Web3 platform integrating multiple staking contracts',
            url: 'https://orderstake.netlify.app',
            icons: ['https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg']
          }
        });
        setSdk(newSdk);

        // Wait a bit for Arena SDK to restore pairing
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if already connected after pairing restore
        const provider = newSdk.provider;
        if (provider) {
          try {
            const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
            if (accounts && accounts.length > 0) {
              setAddress(accounts[0]);
              setIsConnected(true);
              console.log('✅ Arena SDK: Restored connection', accounts[0]);
              
              // Check network
              try {
                const chainId = await provider.request({ method: 'eth_chainId' }) as string;
                const chainIdNum = parseInt(chainId, 16);
                console.log('🌐 Arena SDK Network:', {
                  chainId: chainIdNum,
                  expected: 43114,
                  isCorrect: chainIdNum === 43114
                });
                
                if (chainIdNum !== 43114) {
                  console.warn('⚠️ WARNING: Not on Avalanche C-Chain! Please switch network in Arena.');
                }
              } catch (err) {
                console.log('Could not check network:', err);
              }
            } else {
              console.log('⚠️ Arena SDK: No active connection');
            }
          } catch (err) {
            console.log('⚠️ Arena SDK: Could not check connection status', err);
          }
        }
      } catch (error) {
        console.error('❌ Arena SDK init failed:', error);
      }
    };

    initSdk();
  }, []);

  // Listen for account changes and connect events
  useEffect(() => {
    if (!sdk?.provider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 Arena SDK: Accounts changed', accounts);
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      } else {
        setAddress(null);
        setIsConnected(false);
      }
    };

    const handleConnect = (info: any) => {
      console.log('🔗 Arena SDK: Connected event', info);
      // Re-check accounts
      if (sdk.provider) {
        sdk.provider.request({ method: 'eth_accounts' })
          .then((accounts: unknown) => {
            const accts = accounts as string[];
            if (accts && accts.length > 0) {
              setAddress(accts[0]);
              setIsConnected(true);
              console.log('✅ Arena SDK: Connected with account', accts[0]);
            }
          })
          .catch((err: any) => console.error('Error getting accounts on connect:', err));
      }
    };

    const provider = sdk.provider;
    if (provider.on) {
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('connect', handleConnect);
      
      return () => {
        if (provider.removeListener) {
          provider.removeListener('accountsChanged', handleAccountsChanged);
          provider.removeListener('connect', handleConnect);
        }
      };
    }
  }, [sdk]);

  const connect = useCallback(async () => {
    if (!sdk) {
      console.log('SDK not initialized');
      return;
    }
    try {
      const provider = sdk.provider;
      if (provider) {
        const accounts = await provider.enable();
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Arena connection failed:', error);
    }
  }, [sdk]);

  const disconnect = useCallback(async () => {
    if (!sdk) return;
    try {
      const provider = sdk.provider;
      if (provider && provider.disconnect) {
        await provider.disconnect();
      }
      setAddress(null);
      setIsConnected(false);
    } catch (error) {
      console.error('Arena disconnection failed:', error);
      // Force disconnect
      setAddress(null);
      setIsConnected(false);
    }
  }, [sdk]);

  return useMemo(() => ({
    connect,
    disconnect,
    isConnected,
    address,
    sdk
  }), [connect, disconnect, isConnected, address, sdk]);
};
