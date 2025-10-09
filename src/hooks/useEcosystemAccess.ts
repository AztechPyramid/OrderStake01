import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { ERC20ABI } from '@/contracts/ERC20ABI';
import { OrderSignalABI, ORDER_SIGNAL_ADDRESS } from '@/contracts/OrderSignalABI';
import { useArenaSDK } from './useArenaSDK';
import { ORDER_TOKEN, FACTORY_ADDRESS } from '@/config/contracts';

export interface EcosystemAccessInfo {
  hasMonthlyAccess: boolean;
  expiryTime: number;
  remainingTime: number;
  expiryDate?: Date;
  daysLeft?: number;
  hoursLeft?: number;
  minutesLeft?: number;
  isWhitelisted: boolean;
}

const MONTHLY_ACCESS_FEE = ethers.parseEther('1000000'); // 1M ORDER
const MONTHLY_ACCESS_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

export const useEcosystemAccess = () => {
  const { address, sdk, isConnected } = useArenaSDK();
  const [accessInfo, setAccessInfo] = useState<EcosystemAccessInfo | null>(null);
  const [orderBalance, setOrderBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get provider
  const getProvider = useCallback(() => {
    if (!sdk?.provider) return null;
    return new BrowserProvider(sdk.provider);
  }, [sdk]);

  // Fetch user access info from OrderSignal contract
  const fetchAccessInfo = useCallback(async () => {
    if (!address) return;

    try {
      const provider = getProvider();
      if (!provider) return;

      // Get access info from OrderSignal contract
      const signalContract = new Contract(ORDER_SIGNAL_ADDRESS, OrderSignalABI, provider);
      const userAccessData = await signalContract.getUserAccessInfo(address);
      
      const hasMonthlyAccess = userAccessData.hasValidAccess;
      const expiryTime = Number(userAccessData.expiryTime);
      const remainingTime = Number(userAccessData.remainingTime);

      // Check whitelist from Factory contract
      const factoryContract = new Contract(FACTORY_ADDRESS, ['function whitelistedCreators(address) view returns (bool)'], provider);
      const isWhitelisted = await factoryContract.whitelistedCreators(address);

      const expiryDate = expiryTime > 0 ? new Date(expiryTime * 1000) : undefined;
      const daysLeft = Math.floor(remainingTime / 86400);
      const hoursLeft = Math.floor((remainingTime % 86400) / 3600);
      const minutesLeft = Math.floor((remainingTime % 3600) / 60);

      console.log('🔍 Access Info:', {
        address,
        hasMonthlyAccess,
        expiryTime,
        remainingTime,
        isWhitelisted
      });

      setAccessInfo({
        hasMonthlyAccess,
        expiryTime,
        remainingTime,
        expiryDate,
        daysLeft,
        hoursLeft,
        minutesLeft,
        isWhitelisted
      });
    } catch (err) {
      console.error('Error fetching access info:', err);
      setError('Failed to fetch access info');
    }
  }, [address, getProvider]);

  // Fetch ORDER balance
  const fetchOrderBalance = useCallback(async () => {
    if (!address) return;

    try {
      const provider = getProvider();
      if (!provider) return;

      const orderContract = new Contract(ORDER_TOKEN, ERC20ABI, provider);
      const balance = await orderContract.balanceOf(address);
      setOrderBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error('Error fetching ORDER balance:', err);
    }
  }, [address, getProvider]);

  // Purchase monthly access using OrderSignal contract
  const purchaseMonthlyAccess = useCallback(async () => {
    if (!address || !sdk?.provider) {
      throw new Error('Wallet not connected');
    }

    console.log('🔥 Purchasing monthly ecosystem access via OrderSignal contract...');
    setLoading(true);
    setError(null);

    try {
      // Create fresh provider
      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const orderContract = new Contract(ORDER_TOKEN, ERC20ABI, signer);
      const signalContract = new Contract(ORDER_SIGNAL_ADDRESS, OrderSignalABI, signer);

      // Get access fee from contract
      const accessFee = await signalContract.accessFee();
      console.log('💰 Access fee:', ethers.formatEther(accessFee), 'ORDER');

      // Check ORDER balance
      const balance = await orderContract.balanceOf(address);
      console.log('💼 Current balance:', ethers.formatEther(balance), 'ORDER');

      if (balance < accessFee) {
        throw new Error('Insufficient ORDER token balance. You need 1,000,000 ORDER tokens.');
      }

      // Check allowance
      const allowance = await orderContract.allowance(address, ORDER_SIGNAL_ADDRESS);
      console.log('� Current allowance:', ethers.formatEther(allowance), 'ORDER');
      
      if (allowance < accessFee) {
        console.log('📝 Approving ORDER tokens for OrderSignal contract...');
        const approveTx = await orderContract.approve(ORDER_SIGNAL_ADDRESS, accessFee);
        console.log('⏳ Approval transaction sent:', approveTx.hash);
        await approveTx.wait();
        console.log('✅ Approval confirmed');
      }

      // Purchase access through OrderSignal contract
      console.log('📝 Purchasing access via OrderSignal.purchaseAccess()...');
      const purchaseTx = await signalContract.purchaseAccess();
      console.log('⏳ Purchase transaction sent:', purchaseTx.hash);
      await purchaseTx.wait();
      console.log('✅ Access purchased successfully via OrderSignal contract!');

      // Refresh data
      await fetchAccessInfo();
      await fetchOrderBalance();

      return true;
    } catch (err: any) {
      console.error('❌ Error purchasing access:', err);
      
      // Handle user rejection
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Failed to purchase monthly access');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, sdk, fetchAccessInfo, fetchOrderBalance]);

  // Check if user can create pools (whitelisted OR has monthly access OR willing to burn per pool)
  const canCreatePools = useCallback((): boolean => {
    if (!accessInfo) return false;
    return accessInfo.isWhitelisted || accessInfo.hasMonthlyAccess;
  }, [accessInfo]);

  // Initialize data
  useEffect(() => {
    if (isConnected && address) {
      fetchAccessInfo();
      fetchOrderBalance();
    }
  }, [isConnected, address, fetchAccessInfo, fetchOrderBalance]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isConnected && address) {
      const interval = setInterval(() => {
        fetchAccessInfo();
        fetchOrderBalance();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, address, fetchAccessInfo, fetchOrderBalance]);

  return {
    // State
    accessInfo,
    orderBalance,
    loading,
    error,

    // Access checks
    canCreatePools,
    hasMonthlyAccess: accessInfo?.hasMonthlyAccess || false,
    isWhitelisted: accessInfo?.isWhitelisted || false,

    // Actions
    purchaseMonthlyAccess,

    // Refresh
    refresh: useCallback(() => {
      if (isConnected && address) {
        fetchAccessInfo();
        fetchOrderBalance();
      }
    }, [isConnected, address, fetchAccessInfo, fetchOrderBalance])
  };
};
