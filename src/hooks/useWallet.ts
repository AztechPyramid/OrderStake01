import { useArenaSDK } from './useArenaSDK';
import { useArenaEnvironment } from './useArenaEnvironment';
import { ethers } from 'ethers';
import { useMemo, useState, useEffect } from 'react';

// Ethereum window type extension
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletData {
  address: string | undefined;
  isConnected: boolean;
  isLoading: boolean;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
}

/**
 * Simplified wallet hook focused on Arena SDK only
 * No more RainbowKit complexity - pure Arena implementation
 */
export const useWallet = (): WalletData => {
  const { isInArena, isLoading: envLoading } = useArenaEnvironment();
  const arenaData = useArenaSDK();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Get provider from window.ethereum or create RPC provider
  const provider = useMemo(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    // Fallback to Avalanche RPC
    return new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
  }, []);

  // Get signer from provider if possible
  useEffect(() => {
    const getSigner = async () => {
      if (typeof window !== 'undefined' && window.ethereum && provider instanceof ethers.BrowserProvider) {
        try {
          const sig = await provider.getSigner();
          setSigner(sig);
        } catch (error) {
          console.warn('Could not get signer:', error);
          setSigner(null);
        }
      } else {
        setSigner(null);
      }
    };
    getSigner();
  }, [provider]);

  // Return data based on environment
  if (envLoading) {
    return {
      address: undefined,
      isConnected: false,
      isLoading: true,
      provider,
      signer: null
    };
  }

  if (isInArena) {
    // Arena environment: Use Arena SDK data
    return {
      address: arenaData.address || undefined,
      isConnected: arenaData.isConnected,
      isLoading: arenaData.isLoading,
      provider,
      signer // Use the signer from state
    };
  } else {
    // Standalone mode: No wallet connection for now (pure Arena focus)
    return {
      address: undefined,
      isConnected: false,
      isLoading: false,
      provider,
      signer: null
    };
  }
};
