import { useState, useEffect } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { useContractData } from './useContractData';
import { useTransactionContext } from '@/contexts/TransactionContext';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

// ALP Dual Staking contract hook - using Arena SDK for all transactions
export const useALPStaking = () => {
  const [step, setStep] = useState<'idle' | 'approving' | 'staking' | 'claiming' | 'unstaking'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [xArenaPending, setXArenaPending] = useState('0');
  const contractData = useContractData('ALP_DUAL'); // This is the key - same as ORDER staking uses useContractData
  const arenaSDK = useArenaSDK();
  const { startTransaction, updateTransactionHash, setTransactionError, completeTransaction } = useTransactionContext();

  const getContractAddresses = () => {
    return {
      stakingContract: CONTRACT_ADDRESSES.staking.ALP_DUAL,
      alpToken: CONTRACT_ADDRESSES.tokens.ALP, // Use ALP token instead of ORDER
    };
  };

  const sendArenaTransaction = async (txParams: { to: string; data: string; value?: string }) => {
    try {
      console.log('🚀 [ALP_STAKING] Using Arena SDK for transaction');
      console.log('🔍 [ALP_STAKING] Arena SDK state:', {
        isConnected: arenaSDK?.isConnected,
        hasAddress: !!arenaSDK?.address,
        hasProvider: !!arenaSDK?.sdk?.provider
      });
      
      if (!arenaSDK?.isConnected || !arenaSDK.address || !arenaSDK.sdk?.provider) {
        console.error('❌ [ALP_STAKING] Arena SDK not ready:', {
          isConnected: arenaSDK?.isConnected,
          address: !!arenaSDK?.address,
          provider: !!arenaSDK?.sdk?.provider
        });
        throw new Error('Arena SDK not ready');
      }
      
      // Use Arena SDK to send transaction
      const txHash = await arenaSDK.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: arenaSDK.address,
          to: txParams.to,
          data: txParams.data,
          value: txParams.value || '0x0',
          gas: '0x5B8D80' // 6M gas
        }]
      });
      
      console.log('✅ [ALP_STAKING] Arena SDK transaction successful:', txHash);
      return txHash;
    } catch (error) {
      console.error('❌ [ALP_STAKING] Arena SDK transaction failed:', error);
      throw error;
    }
  };

  // Approve unlimited (max uint256) allowance
  const approve = async () => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('approve', undefined, 'ALP Dual Staking');

    try {
      setStep('approving');
      setIsLoading(true);
      
      const { stakingContract, alpToken } = getContractAddresses();
      // Max uint256 value for unlimited approve
      const amountWei = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      console.log('🔑 [ALP_STAKING] Arena SDK Approve:', { 
        amount: 'UNLIMITED',
        amountWei: amountWei.toString(), 
        stakingContract 
      });

      const txParams = {
        to: alpToken,
        data: '0x095ea7b3' + 
              stakingContract.slice(2).padStart(64, '0') +
              amountWei.toString(16).padStart(64, '0')
      };

      const txHash = await sendArenaTransaction(txParams);
      console.log('✅ [ALP_STAKING] Arena SDK Approve successful:', txHash);
      
      updateTransactionHash(notificationId, txHash);
      return txHash;
    } catch (error) {
      console.error('❌ [ALP_STAKING] Arena SDK Approve error:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Approval failed');
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const stake = async (amount: number | string) => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const notificationId = startTransaction('stake', numAmount, 'ALP Dual Staking');

    try {
      setStep('staking');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();
      const amountWei = BigInt(Math.floor(numAmount * 1e18));

      console.log('🎯 [ALP_STAKING] Arena SDK Deposit (Stake):', { 
        amount: numAmount, 
        amountWei: amountWei.toString(), 
        stakingContract 
      });

      const txParams = {
        to: stakingContract,
        data: '0xb6b55f25' + amountWei.toString(16).padStart(64, '0') // deposit(uint256)
      };

      const txHash = await sendArenaTransaction(txParams);
      console.log('✅ [ALP_STAKING] Arena SDK Deposit successful:', txHash);
      
      updateTransactionHash(notificationId, txHash);
      return txHash;
    } catch (error) {
      console.error('❌ [ALP_STAKING] Arena SDK Deposit error:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Staking failed');
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const unstake = async (amount: number | string) => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const notificationId = startTransaction('unstake', numAmount, 'ALP Dual Staking');

    try {
      setStep('unstaking');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();
      const amountWei = BigInt(Math.floor(numAmount * 1e18));

      console.log('🎯 [ALP_STAKING] Arena SDK Withdraw (Unstake):', { 
        amount: numAmount, 
        amountWei: amountWei.toString(), 
        stakingContract 
      });

      const txParams = {
        to: stakingContract,
        data: '0x2e1a7d4d' + amountWei.toString(16).padStart(64, '0') // withdraw(uint256)
      };

      const txHash = await sendArenaTransaction(txParams);
      console.log('✅ [ALP_STAKING] Arena SDK Withdraw successful:', txHash);
      
      updateTransactionHash(notificationId, txHash);
      return txHash;
    } catch (error) {
      console.error('❌ [ALP_STAKING] Arena SDK Withdraw error:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Unstaking failed');
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const claimRewards = async () => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('claim', undefined, 'ALP Dual Staking');

    try {
      setStep('claiming');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();

      console.log('🎯 [ALP_STAKING] Arena SDK ClaimAllRewards');
      
      const txParams = {
        to: stakingContract,
        data: '0x0b83a727' // claimAllRewards()
      };

      const txHash = await sendArenaTransaction(txParams);
      console.log('✅ [ALP_STAKING] Arena SDK ClaimAllRewards successful:', txHash);
      
      updateTransactionHash(notificationId, txHash);
      return txHash;
    } catch (error) {
      console.error('❌ [ALP_STAKING] Arena SDK ClaimAllRewards error:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Claim failed');
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const reset = () => {
    setStep('idle');
    setIsLoading(false);
  };

  // Simple refresh function - useContractData automatically refreshes
  const refresh = async () => {
    console.log('🔄 [ALP_STAKING] Refresh called - useContractData handles auto-refresh');
  };

  const forceRefresh = async () => {
    console.log('🔄 [ALP_STAKING] Force refresh called - useContractData handles auto-refresh');
  };

  // Fetch xARENA pending rewards separately
  const fetchXArenaPendingRewards = async () => {
    if (!arenaSDK?.sdk?.provider || !arenaSDK.isConnected) {
      return;
    }

    try {
      const userAddress = arenaSDK.sdk.provider.accounts[0];
      const stakingContract = CONTRACT_ADDRESSES.staking.ALP_DUAL;
      const xArenaToken = CONTRACT_ADDRESSES.tokens.xARENA;

      // Try Arena provider first, fallback to direct RPC
      const makeCall = async (callData: { method: string; params: unknown[] }) => {
        try {
          return await arenaSDK.sdk.provider.request(callData);
        } catch (error) {
          console.log(`Arena provider failed for xARENA, using direct RPC: ${error}`);
          const response = await fetch('https://api.avax.network/ext/bc/C/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: callData.method,
              params: callData.params,
              id: 1
            })
          });
          const result = await response.json();
          return result.result;
        }
      };

      // getPendingRewardByToken(address user, address rewardToken) for xARENA
      const xArenaPendingResult = await makeCall({
        method: 'eth_call',
        params: [{
          to: stakingContract,
          data: '0x00b68f08' + 
                userAddress.slice(2).padStart(64, '0') + 
                xArenaToken.slice(2).padStart(64, '0')
        }, 'latest']
      });

      const xArenaPendingAmount = xArenaPendingResult ? parseInt(xArenaPendingResult as string, 16) : 0;
      setXArenaPending((xArenaPendingAmount / 1e18).toFixed(12));

      console.log('🎖️ [ALP_STAKING] xARENA Pending:', {
        rawResult: xArenaPendingResult,
        parsedAmount: xArenaPendingAmount,
        formatted: (xArenaPendingAmount / 1e18).toFixed(6)
      });

    } catch (error) {
      console.error('❌ [ALP_STAKING] Error fetching xARENA pending rewards:', error);
      setXArenaPending('0');
    }
  };

  // Fetch xARENA rewards when component mounts and wallet connects
  useEffect(() => {
    if (arenaSDK?.isConnected) {
      fetchXArenaPendingRewards();
      
      // Refresh xARENA data every 10 seconds
      const interval = setInterval(fetchXArenaPendingRewards, 10000);
      return () => clearInterval(interval);
    }
  }, [arenaSDK?.isConnected]);

  // Return interface compatible with ALPStakingCard expectations
  const data = {
    alpBalance: contractData.userBalance,
    stakedAmount: contractData.userStaked,
    xOrderPending: contractData.pendingRewards, // Primary reward from useContractData
    xArenaPending: xArenaPending, // Secondary reward fetched separately
    allowance: contractData.allowance,
    isLoading: contractData.isLoading,
    error: contractData.error
  };

  return {
    // Data for the UI
    data,
    
    // State
    step,
    isLoading,
    
    // Transaction results (simple boolean flags)
    isApproveSuccess: step === 'idle' && !isLoading,
    isStakeSuccess: step === 'idle' && !isLoading,
    isClaimSuccess: step === 'idle' && !isLoading,
    isUnstakeSuccess: step === 'idle' && !isLoading,
    
    // Contract data from useContractData hook (same as ORDER staking)
    userBalance: contractData.userBalance,
    userStaked: contractData.userStaked,
    pendingRewards: contractData.pendingRewards,
    allowance: contractData.allowance,
    remainingBalance: contractData.remainingBalance,
    
    // Functions
    approve,
    stake,
    unstake,
    claimRewards,
    reset,
    refresh,
    forceRefresh,
  };
};
