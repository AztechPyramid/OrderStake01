import { useState, useEffect, useRef } from 'react';

// Dynamic import types - will be loaded client-side only
type ArenaAppStoreSdk = any;
type ArenaUserProfile = any;

// CRITICAL: No wagmi imports in Arena SDK to prevent RainbowKit provider conflicts

interface UseArenaSDKResult {
  sdk: ArenaAppStoreSdk | null;
  isConnected: boolean;
  address: string | null;
  profile: ArenaUserProfile | null;
  isLoading: boolean;
  error: string | null;
  isInArena: boolean;
}

// Global SDK instance to prevent multiple initializations
let globalSdkInstance: ArenaAppStoreSdk | null = null;
let globalInitPromise: Promise<void> | null = null;
let globalWalletAddress: string | null = null;
let globalIsConnected: boolean = false;
let globalProfile: ArenaUserProfile | null = null;

// Load saved connection state from localStorage - only on client
const loadSavedState = () => {
  if (typeof window !== 'undefined') {
    try {
      const savedConnection = localStorage.getItem('arena_connection_state');
      if (savedConnection) {
        const parsed = JSON.parse(savedConnection);
        globalWalletAddress = parsed.address;
        globalIsConnected = parsed.isConnected;
      }
    } catch (error) {
      console.error('Failed to parse saved connection state:', error);
    }
  }
};

// Initialize on client side only
if (typeof window !== 'undefined') {
  loadSavedState();
}

export const useArenaSDK = (): UseArenaSDKResult => {
  // CRITICAL: No wagmi hooks in Arena environment per ReadmeSDK.md specifications
  const [sdk, setSdk] = useState<ArenaAppStoreSdk | null>(globalSdkInstance);
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const [address, setAddress] = useState<string | null>(globalWalletAddress);
  const [profile, setProfile] = useState<ArenaUserProfile | null>(globalProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInArena, setIsInArena] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Clean up function to track component unmounting
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Helper functions to reduce complexity
    const isArenaEnvironment = () => {
      if (typeof window === 'undefined') return false;
      const isIframe = typeof window !== 'undefined' && window !== window.top;
      const referrer = typeof document !== 'undefined' ? document.referrer : '';
      return isIframe && referrer.includes('arena.social');
    };

    const loadExistingSdk = () => {
      if (globalSdkInstance) {
        setSdk(globalSdkInstance);
        if (globalWalletAddress) {
          setAddress(globalWalletAddress);
          setIsConnected(globalIsConnected);
        }
        if (globalProfile) {
          setProfile(globalProfile);
        }
        setIsLoading(false);
        return true;
      }
      return false;
    };

    const initializeArenaSDK = async () => {
      try {
        if (!isArenaEnvironment()) {
          setIsInArena(false);
          setIsLoading(false);
          return;
        }
        
        setIsInArena(true);
        
        if (loadExistingSdk()) {
          return;
        }
        
        // If already initializing, wait for it
        if (globalInitPromise) {
          await globalInitPromise;
          if (globalSdkInstance) {
            setSdk(globalSdkInstance);
          }
          setIsLoading(false);
          return;
        }
        
        // Start new initialization following ReadmeSDK.md specifications
        globalInitPromise = (async () => {
          // CRITICAL: Disable other wallet providers to prevent conflicts
          const windowWithWallets = typeof window !== 'undefined' ? window as typeof window & {
            ethereum?: unknown;
            __conflictingEthereum?: unknown;
            CoinbaseWalletSDK?: unknown;
            __disabledCoinbase?: unknown;
            WalletConnectModal?: unknown;
            __arenaProvider?: unknown;
            __conflictingProvider?: unknown;
          } : null;
          
          // Dynamic import to avoid SSR issues
          const { ArenaAppStoreSdk } = await import('arena-app-store-sdk');
          
          // Initialize Arena SDK as per documentation
          const arenaAppStoreSdk = new ArenaAppStoreSdk({
            projectId: "3b92724d86fb832c617225316f7c06b3",
          metadata: {
            name: "OrderStake",
            description: "🏛️ Elite Gladiator Staking on Avalanche",
            url: typeof window !== 'undefined' ? window.location.href : 'https://orderstake.netlify.app',
            icons: ["https://orderstake.netlify.app/favicon.ico"]
          }
        });
        
        globalSdkInstance = arenaAppStoreSdk;
          
        // CRITICAL: Disable other wallet providers to prevent conflicts
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          // Store reference but don't let it interfere
          (window as any).__conflictingEthereum = (window as any).ethereum;
        }
        
        // Disable Coinbase completely in Arena environment
        if (typeof window !== 'undefined' && (window as any).CoinbaseWalletSDK) {
          (window as any).__disabledCoinbase = (window as any).CoinbaseWalletSDK;
          delete (window as any).CoinbaseWalletSDK;
        }
        
        // Clear any wallet connection attempts
        if (typeof window !== 'undefined' && (window as any).WalletConnectModal) {
          (window as any).__disabledWC = (window as any).WalletConnectModal;
          delete (window as any).WalletConnectModal;
        }
        
        if (!mountedRef.current) return;
          setSdk(arenaAppStoreSdk);
          
          // Set up wallet changed event ONCE - silent mode
          arenaAppStoreSdk.on('walletChanged', ({ address: walletAddress }) => {
            // Update global state silently
            globalWalletAddress = walletAddress;
            globalIsConnected = !!walletAddress;
            
            // Save to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('arena_connection_state', JSON.stringify({
                address: walletAddress,
                isConnected: !!walletAddress
              }));
            }
            
            if (mountedRef.current) {
              setAddress(walletAddress);
              setIsConnected(!!walletAddress);
              setIsLoading(false);
            }
          });
          
          // Load profile
        try {
          const userProfile = await arenaAppStoreSdk.sendRequest('getUserProfile') as any;
          console.log(`✅ Profile: ${userProfile?.userHandle || 'Unknown'}`);
          // Update global state
          globalProfile = userProfile;            if (mountedRef.current) {
              setProfile(userProfile);
            }
          } catch (profileError) {
            console.log(`Profile error: ${profileError}`);
          }
          
          // Check wallet with minimal polling
          let attempts = 0;
          const checkWallet = () => {
            if (attempts >= 10 || !mountedRef.current) return;
            attempts++;
            
            if (arenaAppStoreSdk.provider?.accounts?.length && arenaAppStoreSdk.provider.accounts.length > 0) {
              const walletAddress = arenaAppStoreSdk.provider.accounts[0];
              console.log(`✅ Wallet found: ${walletAddress.slice(0, 8)}...`);
              
              // CRITICAL: Secure Arena provider dominance
              console.log('🔒 Securing Arena provider...');
              const arenaProvider = arenaAppStoreSdk.provider;
              
              // Store Arena provider safely
              if (windowWithWallets) {
                windowWithWallets.__arenaProvider = arenaProvider;
              }
              
              // Clear any conflicting providers
              if (windowWithWallets?.ethereum && windowWithWallets.ethereum !== arenaProvider) {
                console.log('🚫 Neutralizing conflicting ethereum provider');
                windowWithWallets.__conflictingProvider = windowWithWallets.ethereum;
              }
              
              // Update global state
              globalWalletAddress = walletAddress;
              globalIsConnected = true;
              
              // Save to localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem('arena_connection_state', JSON.stringify({
                  address: walletAddress,
                  isConnected: true
                }));
              }
              
              if (mountedRef.current) {
                setAddress(walletAddress);
                setIsConnected(true);
                setIsLoading(false); // IMPORTANT: Stop loading when wallet found
              }
            } else {
              setTimeout(checkWallet, 400);
            }
          };
          
          checkWallet();
        })();
        
        await globalInitPromise;
        
      } catch (err) {
        console.error('Arena SDK Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeArenaSDK();
  }, []); // Empty deps - only run once on mount

  // Cleanup effect on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (sdk) {
        try {
          // Try to cleanup if methods exist (prevents memory leaks)
          if ('removeAllListeners' in sdk && typeof sdk.removeAllListeners === 'function') {
            (sdk as { removeAllListeners: () => void }).removeAllListeners();
          }
        } catch (error) {
          console.warn('Failed to cleanup SDK listeners:', error);
        }
      }
    };
  }, [sdk]);

  return {
    sdk,
    isConnected,
    address,
    profile,
    isLoading,
    error,
    isInArena
  };
};
