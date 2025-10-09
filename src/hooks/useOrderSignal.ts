import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { OrderSignalABI, ORDER_SIGNAL_ADDRESS } from '../contracts/OrderSignalABI';
import { ERC20ABI } from '../contracts/ERC20ABI';
import { useWallet } from './useWallet';
import { useArenaSDK } from './useArenaSDK';

export interface UserAccessInfo {
  hasValidAccess: boolean;
  expiryTime: number;
  remainingTime: number;
  expiryDate?: Date;
  daysLeft?: number;
  hoursLeft?: number;
  minutesLeft?: number;
}

export interface ContractInfo {
  orderTokenAddress: string;
  currentAccessFee: string;
  currentAccessDuration: number;
  totalTokensBurned: string;
}

export const useOrderSignal = () => {
  const { address, provider, isConnected } = useWallet();
  const { sdk, isInArena } = useArenaSDK();
  const [userAccess, setUserAccess] = useState<UserAccessInfo | null>(null);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ORDER_TOKEN_ADDRESS = "0x1BEd077195307229FcCBC719C5f2ce6416A58180";

  // Get provider based on environment
  const getProvider = useCallback(() => {
    if (isInArena && sdk?.provider) {
      // Arena environment - use Arena provider
      return new ethers.BrowserProvider(sdk.provider);
    } else if (provider) {
      // Standalone environment - use regular provider
      return provider;
    }
    // Fallback RPC provider
    return new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
  }, [isInArena, sdk, provider]);

  // Get signer for transactions
  const getSigner = useCallback(async () => {
    const currentProvider = getProvider();
    
    // Prioritize Arena SDK provider for transactions
    if (isInArena && sdk?.provider) {
      console.log('📡 Using Arena provider for transaction');
      try {
        const browserProvider = new ethers.BrowserProvider(sdk.provider);
        const signer = await browserProvider.getSigner();
        console.log('✅ Arena signer obtained successfully');
        return signer;
      } catch (error) {
        console.error('❌ Failed to get Arena signer:', error);
        throw new Error('Failed to connect to Arena wallet');
      }
    }
    
    // Fallback to regular provider
    if (currentProvider instanceof ethers.BrowserProvider) {
      try {
        console.log('🔗 Using regular provider for transaction');
        const signer = await currentProvider.getSigner();
        console.log('✅ Regular signer obtained successfully');
        return signer;
      } catch (error) {
        console.error('❌ Failed to get regular signer:', error);
        throw new Error('Failed to connect to wallet');
      }
    }
    
    throw new Error('No wallet connection available');
  }, [getProvider, isInArena, sdk]);

  // Contract instances for transactions (requires signer)
  const getOrderSignalContract = useCallback(async () => {
    const signer = await getSigner();
    console.log('📡 Creating OrderSignal contract with signer address:', await signer.getAddress());
    return new ethers.Contract(ORDER_SIGNAL_ADDRESS, OrderSignalABI, signer);
  }, [getSigner]);

  const getOrderTokenContract = useCallback(async () => {
    const signer = await getSigner();
    console.log('💰 Creating ORDER token contract with signer address:', await signer.getAddress());
    return new ethers.Contract(ORDER_TOKEN_ADDRESS, ERC20ABI, signer);
  }, [getSigner]);

  // Contract instances for read-only operations (provider only)
  const getOrderSignalContractReadOnly = useCallback(() => {
    const currentProvider = getProvider();
    return new ethers.Contract(ORDER_SIGNAL_ADDRESS, OrderSignalABI, currentProvider);
  }, [getProvider]);

  const getOrderTokenContractReadOnly = useCallback(() => {
    const currentProvider = getProvider();
    return new ethers.Contract(ORDER_TOKEN_ADDRESS, ERC20ABI, currentProvider);
  }, [getProvider]);

  // Fetch user access info
  const fetchUserAccess = useCallback(async () => {
    if (!address) return;

    try {
      const contract = getOrderSignalContractReadOnly();
      const info = await contract.getUserAccessInfo(address);
      
      const expiryDate = new Date(Number(info.expiryTime) * 1000);
      const remainingSeconds = Number(info.remainingTime);
      const daysLeft = Math.floor(remainingSeconds / 86400);
      const hoursLeft = Math.floor((remainingSeconds % 86400) / 3600);
      const minutesLeft = Math.floor((remainingSeconds % 3600) / 60);

      setUserAccess({
        hasValidAccess: info.hasValidAccess,
        expiryTime: Number(info.expiryTime),
        remainingTime: remainingSeconds,
        expiryDate,
        daysLeft,
        hoursLeft,
        minutesLeft
      });
    } catch (err) {
      console.error('Error fetching user access info:', err);
      setError('Failed to fetch access info');
    }
  }, [address]); // Removed getOrderSignalContractReadOnly from dependencies

  // Fetch contract info
  const fetchContractInfo = useCallback(async () => {
    try {
      const contract = getOrderSignalContractReadOnly();
      const info = await contract.getContractInfo();
      
      setContractInfo({
        orderTokenAddress: info.orderTokenAddress,
        currentAccessFee: ethers.formatEther(info.currentAccessFee),
        currentAccessDuration: Number(info.currentAccessDuration),
        totalTokensBurned: ethers.formatEther(info.totalTokensBurned)
      });
    } catch (err) {
      console.error('Error fetching contract info:', err);
      setError('Failed to fetch contract info');
    }
  }, []); // No dependencies needed

  // Purchase access
  const purchaseAccess = useCallback(async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    console.log('🔥 Purchasing OrderSignal access...');
    console.log('🔗 IsInArena:', isInArena, 'Address:', address);

    setLoading(true);
    setError(null);

    try {
      const orderContract = await getOrderTokenContract();
      const signalContract = await getOrderSignalContract();
      
      // Get access fee from contract
      const accessFee = await signalContract.accessFee();
      console.log('💰 Access fee:', ethers.formatEther(accessFee), 'ORDER');

      // Check ORDER balance
      const balance = await orderContract.balanceOf(address);
      console.log('💼 Current balance:', ethers.formatEther(balance), 'ORDER');

      if (balance < accessFee) {
        throw new Error('Insufficient ORDER token balance');
      }

      // Check allowance
      const allowance = await orderContract.allowance(address, ORDER_SIGNAL_ADDRESS);
      console.log('🔓 Current allowance:', ethers.formatEther(allowance), 'ORDER');
      
      if (allowance < accessFee) {
        console.log('📝 Approving ORDER tokens...');
        const approveTx = await orderContract.approve(ORDER_SIGNAL_ADDRESS, accessFee);
        console.log('⏳ Approval transaction sent:', approveTx.hash);
        await approveTx.wait();
        console.log('✅ Approval confirmed');
      }

      // Purchase access
      console.log('📝 Purchasing access...');
      const purchaseTx = await signalContract.purchaseAccess();
      console.log('⏳ Purchase transaction sent:', purchaseTx.hash);
      await purchaseTx.wait();
      console.log('✅ Access purchased successfully!');

      // Refresh data
      await fetchUserAccess();
      await fetchContractInfo();

    } catch (err: any) {
      console.error('❌ Error purchasing access:', err);
      setError(err.message || 'Failed to purchase access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, isInArena, fetchUserAccess, fetchContractInfo]); // Simplified dependencies

  // Get ORDER token balance
  const getOrderBalance = useCallback(async (): Promise<string> => {
    if (!address) return "0";

    try {
      const contract = getOrderTokenContractReadOnly();
      const balance = await contract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Error fetching ORDER balance:', err);
      return "0";
    }
  }, [address]); // Removed getOrderTokenContractReadOnly

  // Check if user has access
  const hasAccess = useCallback(async (): Promise<boolean> => {
    if (!address) return false;

    try {
      const contract = getOrderSignalContractReadOnly();
      return await contract.hasAccess(address);
    } catch (err) {
      console.error('Error checking access:', err);
      return false;
    }
  }, [address]); // Removed getOrderSignalContractReadOnly

  // Initialize data
  useEffect(() => {
    if (isConnected && address) {
      fetchUserAccess();
      fetchContractInfo();
    }
  }, [isConnected, address, fetchUserAccess, fetchContractInfo]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isConnected && address) {
      const interval = setInterval(() => {
        fetchUserAccess();
        fetchContractInfo();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, address, fetchUserAccess, fetchContractInfo]);

  return {
    // State
    userAccess,
    contractInfo,
    loading,
    error,

    // Actions
    purchaseAccess,
    getOrderBalance,
    hasAccess,

    // Refresh functions
    refresh: useCallback(() => {
      if (isConnected && address) {
        fetchUserAccess();
        fetchContractInfo();
      }
    }, [isConnected, address, fetchUserAccess, fetchContractInfo])
  };
};
