import { useState } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { useContractData } from './useContractData';
import { useTransactionContext } from '@/contexts/TransactionContext';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

// Arena SDK staking contract hook - uses Arena SDK for all transactions
export const useStakingContract = (poolType: 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA') => {
  const [step, setStep] = useState<'idle' | 'approving' | 'staking' | 'claiming' | 'unstaking'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const contractData = useContractData(poolType);
  const arenaSDK = useArenaSDK();
  const { startTransaction, updateTransactionHash, setTransactionError, completeTransaction } = useTransactionContext();

  const getPoolName = () => {
    const poolNames = {
      ORDER_ORDER: 'ORDER/ORDER Pool',
      ORDER_WITCH: 'ORDER/WITCH Pool',
      ORDER_KOKSAL: 'ORDER/KOKSAL Pool',
      ORDER_STANK: 'ORDER/STANK Pool',
      ORDER_xORDER: 'ORDER/xORDER Pool',
      ORDER_xARENA: 'ORDER/xARENA Pool'
    };
    return poolNames[poolType];
  };

  const getContractAddresses = () => {
    return {
      stakingContract: CONTRACT_ADDRESSES.staking[poolType],
      orderToken: CONTRACT_ADDRESSES.tokens.ORDER,
    };
  };

  const sendArenaTransaction = async (txParams: { to: string; data: string; value?: string }) => {
    try {
      console.log('🚀 [STAKING] Using Arena SDK for transaction');
      console.log('🔍 [STAKING] Arena SDK state:', {
        isConnected: arenaSDK?.isConnected,
        hasAddress: !!arenaSDK?.address,
        hasProvider: !!arenaSDK?.sdk?.provider
      });
      
      if (!arenaSDK?.isConnected || !arenaSDK.address || !arenaSDK.sdk?.provider) {
        console.error('❌ [STAKING] Arena SDK not ready:', {
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
      
      console.log('✅ [STAKING] Arena SDK transaction successful:', txHash);
      return txHash;
    } catch (error) {
      console.error('❌ [STAKING] Arena SDK transaction failed:', error);
      throw error;
    }
  };

  // Approve unlimited (max uint256) allowance
  const approve = async () => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('approve', undefined, getPoolName());

    try {
      setStep('approving');
      setIsLoading(true);
      
      const { stakingContract, orderToken } = getContractAddresses();
      // Max uint256 value for unlimited approve
      const amountWei = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      console.log('🔑 Arena SDK Approve:', { 
        amount: 'UNLIMITED',
        amountWei: amountWei.toString(), 
        stakingContract 
      });

      const txParams = {
        to: orderToken,
        data: '0x095ea7b3' + 
              stakingContract.slice(2).padStart(64, '0') +
              amountWei.toString(16).padStart(64, '0')
      };

      const txHash = await sendArenaTransaction(txParams);
      console.log('✅ Arena SDK Approve successful:', txHash);
      
      updateTransactionHash(notificationId, txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Arena SDK Approve error:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Approval failed');
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const stake = async (amount: number) => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('stake', amount, getPoolName());

    try {
      setStep('staking');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();
      const amountWei = BigInt(Math.floor(amount * 1e18));

      console.log('🎯 Arena SDK Deposit (Stake):', { 
        amount, 
        amountWei: amountWei.toString(), 
        stakingContract 
      });

      const txParams = {
        to: stakingContract,
        data: '0xb6b55f25' + amountWei.toString(16).padStart(64, '0') // deposit(uint256)
      };

      const txHash = await sendArenaTransaction(txParams);
      console.log('✅ Arena SDK Deposit successful:', txHash);
      
      updateTransactionHash(notificationId, txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Arena SDK Deposit error:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Staking failed');
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const unstake = async (amount: number) => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('unstake', amount, getPoolName());

    try {
      setStep('unstaking');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();
      const amountWei = BigInt(Math.floor(amount * 1e18));

      console.log('🎯 Arena SDK Withdraw (Unstake):', { 
        amount, 
        amountWei: amountWei.toString(), 
        stakingContract 
      });

      const txParams = {
        to: stakingContract,
        data: '0x2e1a7d4d' + amountWei.toString(16).padStart(64, '0') // withdraw(uint256)
      };

      const txHash = await sendArenaTransaction(txParams);
      console.log('✅ Arena SDK Withdraw successful:', txHash);
      
      updateTransactionHash(notificationId, txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Arena SDK Withdraw error:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Unstaking failed');
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const claim = async () => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('claim', undefined, getPoolName());

    try {
      setStep('claiming');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();

      console.log('🎯 Arena SDK ClaimAllRewards');
      
      const txParams = {
        to: stakingContract,
        data: '0x0b83a727' // claimAllRewards()
      };

      const txHash = await sendArenaTransaction(txParams);
      console.log('✅ Arena SDK ClaimAllRewards successful:', txHash);
      
      updateTransactionHash(notificationId, txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Arena SDK ClaimAllRewards error:', error);
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

  return {
    // State
    step,
    isLoading,
    
    // Transaction results (simple boolean flags)
    isApproveSuccess: step === 'idle' && !isLoading,
    isStakeSuccess: step === 'idle' && !isLoading,
    isClaimSuccess: step === 'idle' && !isLoading,
    isUnstakeSuccess: step === 'idle' && !isLoading,
    
    // Contract data from useContractData hook
    userBalance: contractData.userBalance,
    userStaked: contractData.userStaked,
    pendingRewards: contractData.pendingRewards,
    allowance: contractData.allowance,
    remainingBalance: contractData.remainingBalance,
    
    // Functions
    approve,
    stake,
    unstake,
    claim,
    reset,
  };
};
