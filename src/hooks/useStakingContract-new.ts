import { useState } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { useContractData } from './useContractData';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

// Arena SDK staking contract hook with real contract data
export const useStakingContract = (poolType: 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA') => {
  const [step, setStep] = useState<'idle' | 'approving' | 'staking' | 'claiming' | 'unstaking'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const contractData = useContractData(poolType);
  const arenaData = useArenaSDK();

  const getContractAddresses = () => {
    return {
      stakingContract: CONTRACT_ADDRESSES.staking[poolType],
      orderToken: CONTRACT_ADDRESSES.tokens.ORDER,
    };
  };

  const approve = async (amount: number) => {
    if (!arenaData?.sdk?.provider || !arenaData.isConnected) {
      throw new Error('Arena wallet not connected');
    }

    try {
      setStep('approving');
      setIsLoading(true);
      
      const { stakingContract, orderToken } = getContractAddresses();
      const userAddress = arenaData.sdk.provider.accounts[0];
      const amountWei = (BigInt(Math.floor(amount * 1e18))).toString(16);

      const txHash = await arenaData.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: orderToken,
          data: '0x095ea7b3' + 
                stakingContract.slice(2).padStart(64, '0') +
                amountWei.padStart(64, '0')
        }]
      });

      console.log('Approve transaction hash:', txHash);
      return txHash;
    } catch (error) {
      console.error('Approve error:', error);
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const stake = async (amount: number) => {
    if (!arenaData?.sdk?.provider || !arenaData.isConnected) {
      throw new Error('Arena wallet not connected');
    }

    try {
      setStep('staking');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();
      const userAddress = arenaData.sdk.provider.accounts[0];
      const amountWei = (BigInt(Math.floor(amount * 1e18))).toString(16);

      const txHash = await arenaData.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: stakingContract,
          data: '0xa694fc3a' + amountWei.padStart(64, '0') // stake(uint256)
        }]
      });

      console.log('Stake transaction hash:', txHash);
      return txHash;
    } catch (error) {
      console.error('Stake error:', error);
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const unstake = async (amount: number) => {
    if (!arenaData?.sdk?.provider || !arenaData.isConnected) {
      throw new Error('Arena wallet not connected');
    }

    try {
      setStep('unstaking');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();
      const userAddress = arenaData.sdk.provider.accounts[0];
      const amountWei = (BigInt(Math.floor(amount * 1e18))).toString(16);

      const txHash = await arenaData.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: stakingContract,
          data: '0x2e1a7d4d' + amountWei.padStart(64, '0') // withdraw(uint256)
        }]
      });

      console.log('Unstake transaction hash:', txHash);
      return txHash;
    } catch (error) {
      console.error('Unstake error:', error);
      throw error;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  };

  const claim = async () => {
    if (!arenaData?.sdk?.provider || !arenaData.isConnected) {
      throw new Error('Arena wallet not connected');
    }

    try {
      setStep('claiming');
      setIsLoading(true);
      
      const { stakingContract } = getContractAddresses();
      const userAddress = arenaData.sdk.provider.accounts[0];

      console.log('🎯 Claiming rewards using claimAllRewards()');
      
      const txHash = await arenaData.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: stakingContract,
          data: '0x0b83a727' // claimAllRewards()
        }]
      });

      console.log('✅ Claim transaction hash:', txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Claim error:', error);
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
