import { useState, useEffect } from 'react';
import { useArenaSDK } from './useArenaSDK';

interface DirectWalletProvider {
  sendTransaction: (params: {
    from: string;
    to: string;
    data: string;
    value?: string;
  }) => Promise<string>;
  signTransaction: (params: {
    from: string;
    to: string;
    data: string;
    value?: string;
  }) => Promise<string>;
}

/**
 * Direct wallet provider that bypasses Arena SDK's RPC system
 * Uses only Arena for signing, no external RPC calls
 */
export const useDirectWallet = () => {
  const arenaData = useArenaSDK();
  const [provider, setProvider] = useState<DirectWalletProvider | null>(null);

  useEffect(() => {
    if (!arenaData?.sdk?.provider || !arenaData.isConnected || !arenaData.address) {
      setProvider(null);
      return;
    }

    const directProvider: DirectWalletProvider = {
      sendTransaction: async (params) => {
        try {
          console.log('🎯 Direct transaction via Arena wallet:', params);
          
          if (!arenaData?.sdk?.provider) {
            throw new Error('Arena provider not available');
          }
          
          // Use Arena SDK for signing ONLY
          const txHash = await arenaData.sdk.provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: params.from,
              to: params.to,
              data: params.data,
              value: params.value || '0x0'
            }]
          });

          console.log('✅ Transaction sent successfully:', txHash);
          return txHash as string;
        } catch (error) {
          console.error('❌ Direct transaction failed:', error);
          throw error;
        }
      },

      signTransaction: async (params) => {
        try {
          console.log('✍️ Signing transaction via Arena wallet:', params);
          
          if (!arenaData?.sdk?.provider) {
            throw new Error('Arena provider not available');
          }
          
          const signature = await arenaData.sdk.provider.request({
            method: 'eth_signTransaction',
            params: [{
              from: params.from,
              to: params.to,
              data: params.data,
              value: params.value || '0x0'
            }]
          });

          return signature as string;
        } catch (error) {
          console.error('❌ Transaction signing failed:', error);
          throw error;
        }
      }
    };

    setProvider(directProvider);
  }, [arenaData?.sdk?.provider, arenaData?.isConnected, arenaData?.address]);

  return {
    provider,
    isReady: !!provider && !!arenaData?.address,
    address: arenaData?.address,
    isConnected: arenaData?.isConnected
  };
};
