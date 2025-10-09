/**
 * Enhanced Ecosystem Staking Hook - GitHub Indexer Integration
 * Uses GitHub-hosted JSON data with minimal blockchain interaction
 */
import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { githubDataService, PoolData } from '@/services/githubDataService';
import { useArenaSDK } from './useArenaSDK';
import { ECOSYSTEM_STAKING_ABI } from '@/contracts/EcosystemStakingABI';
import { ERC20ABI } from '@/contracts/ERC20ABI';

export interface UseEcosystemStakingGitHubResult {
  // Pool data from GitHub indexer
  poolData: PoolData | null;
  
  // User-specific data (requires blockchain interaction)
  userInfo: {
    stakedAmount: string;
    pendingRewards: string;
    rewardDebt: string;
  } | null;
  
  // Token interaction data
  stakingTokenBalance: string;
  stakingTokenAllowance: string;
  
  // Status
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Functions
  refreshData: () => Promise<void>;
  approveStakingToken: (amount?: string) => Promise<boolean>;
  stake: (amount: string) => Promise<boolean>;
  unstake: (amount: string) => Promise<boolean>;
  claimRewards: () => Promise<boolean>;
  emergencyWithdraw: () => Promise<boolean>;
}

export const useEcosystemStakingGitHub = (poolAddress: string): UseEcosystemStakingGitHubResult => {
  const { address, sdk, isConnected } = useArenaSDK();
  
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [userInfo, setUserInfo] = useState<{
    stakedAmount: string;
    pendingRewards: string;
    rewardDebt: string;
  } | null>(null);
  const [stakingTokenBalance, setStakingTokenBalance] = useState<string>('0');
  const [stakingTokenAllowance, setStakingTokenAllowance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get provider
  const getProvider = useCallback(() => {
    if (!sdk?.provider) return null;
    return new BrowserProvider(sdk.provider);
  }, [sdk]);

  // Fetch pool data from GitHub indexer
  const fetchPoolData = useCallback(async () => {
    try {
      console.log(`📊 Fetching pool ${poolAddress} from GitHub indexer...`);
      const data = await githubDataService.getPool(poolAddress);
      
      if (data) {
        setPoolData(data);
        console.log(`✅ Pool data loaded from indexer:`, data.poolMetadata.poolName);
      } else {
        console.warn(`⚠️ Pool ${poolAddress} not found in indexer`);
        setError('Pool not found in indexer data');
      }
    } catch (error) {
      console.error('❌ Error fetching pool from indexer:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch pool data');
    }
  }, [poolAddress]);

  // Fetch user-specific data (requires blockchain interaction)
  const fetchUserInfo = useCallback(async () => {
    try {
      if (!address || !poolData) return;
      
      const provider = getProvider();
      if (!provider) return;
      
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, provider);
      
      const [userStake, pendingRewards] = await Promise.all([
        contract.userInfo(address),
        contract.pendingReward(address)
      ]);
      
      // Get token decimals from poolData
      const stakingTokenDecimals = poolData.tokenInfo.stakingToken?.decimals || 18;
      const rewardTokenDecimals = poolData.tokenInfo.rewardToken?.decimals || 18;
      
      setUserInfo({
        stakedAmount: ethers.formatUnits(userStake.amount, stakingTokenDecimals),
        pendingRewards: ethers.formatUnits(pendingRewards, rewardTokenDecimals),
        rewardDebt: ethers.formatUnits(userStake.rewardDebt, rewardTokenDecimals)
      });
      
      console.log(`✅ User info loaded for ${address}`);
    } catch (error) {
      console.error('❌ Error fetching user info:', error);
    }
  }, [address, poolData, poolAddress, getProvider]);

  // Fetch staking token balance and allowance
  const fetchTokenInfo = useCallback(async () => {
    try {
      if (!address || !poolData) return;
      
      const provider = getProvider();
      if (!provider) return;
      
      const tokenContract = new Contract(poolData.poolData.stakingToken, ERC20ABI, provider);
      const stakingTokenDecimals = poolData.tokenInfo.stakingToken?.decimals || 18;
      
      const [balance, allowance] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.allowance(address, poolAddress)
      ]);
      
      setStakingTokenBalance(ethers.formatUnits(balance, stakingTokenDecimals));
      setStakingTokenAllowance(ethers.formatUnits(allowance, stakingTokenDecimals));
      
      console.log(`✅ Token info loaded for ${address}`);
    } catch (error) {
      console.error('❌ Error fetching token info:', error);
    }
  }, [address, poolData, poolAddress, getProvider]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear GitHub cache to get fresh data
      githubDataService.clearCache();
      
      // Fetch pool data from GitHub
      await fetchPoolData();
      
      // Fetch user-specific data if connected
      if (address && isConnected) {
        await Promise.all([
          fetchUserInfo(),
          fetchTokenInfo()
        ]);
      }
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPoolData, fetchUserInfo, fetchTokenInfo, address, isConnected]);

  // Approve staking tokens
  const approveStakingToken = useCallback(async (amount?: string): Promise<boolean> => {
    try {
      if (!address || !poolData || !sdk?.provider) {
        throw new Error('Not ready');
      }

      setIsLoading(true);
      setError(null);

      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(poolData.poolData.stakingToken, ERC20ABI, signer);
      const stakingTokenDecimals = poolData.tokenInfo.stakingToken?.decimals || 18;

      const amountToApprove = amount 
        ? ethers.parseUnits(amount, stakingTokenDecimals)
        : ethers.MaxUint256;

      console.log('🔓 Requesting approval...');
      const tx = await tokenContract.approve(poolAddress, amountToApprove);
      console.log('⏳ Approval transaction sent, waiting for confirmation...');
      await tx.wait();
      console.log('✅ Approval confirmed!');

      await fetchTokenInfo();
      return true;
      
    } catch (err: any) {
      console.error('❌ Error approving tokens:', err);
      
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Approval failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, poolData, sdk, poolAddress, fetchTokenInfo]);

  // Stake tokens
  const stake = useCallback(async (amount: string): Promise<boolean> => {
    try {
      if (!address || !poolData || !sdk?.provider) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, signer);
      const stakingTokenDecimals = poolData.tokenInfo.stakingToken?.decimals || 18;

      const amountWei = ethers.parseUnits(amount, stakingTokenDecimals);
      
      console.log('📥 Requesting stake transaction...');
      const tx = await contract.stake(amountWei);
      console.log('⏳ Stake transaction sent, waiting for confirmation...');
      await tx.wait();
      console.log('✅ Stake confirmed!');

      await Promise.all([
        fetchUserInfo(),
        fetchTokenInfo()
      ]);
      
      return true;
    } catch (err: any) {
      console.error('❌ Error staking:', err);
      
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Staking failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, poolData, sdk, poolAddress, fetchUserInfo, fetchTokenInfo]);

  // Unstake tokens
  const unstake = useCallback(async (amount: string): Promise<boolean> => {
    try {
      if (!address || !poolData || !sdk?.provider) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, signer);
      const stakingTokenDecimals = poolData.tokenInfo.stakingToken?.decimals || 18;

      const amountWei = ethers.parseUnits(amount, stakingTokenDecimals);
      
      console.log('📤 Requesting unstake transaction...');
      const tx = await contract.unstake(amountWei);
      console.log('⏳ Unstake transaction sent, waiting for confirmation...');
      await tx.wait();
      console.log('✅ Unstake confirmed!');

      await Promise.all([
        fetchUserInfo(),
        fetchTokenInfo()
      ]);
      
      return true;
    } catch (err: any) {
      console.error('❌ Error unstaking:', err);
      
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Unstaking failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, poolData, sdk, poolAddress, fetchUserInfo, fetchTokenInfo]);

  // Claim rewards
  const claimRewards = useCallback(async (): Promise<boolean> => {
    try {
      if (!address || !sdk?.provider) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, signer);

      console.log('🎁 Requesting claim transaction...');
      const tx = await contract.claimReward();
      console.log('⏳ Claim transaction sent, waiting for confirmation...');
      await tx.wait();
      console.log('✅ Rewards claimed successfully!');

      await fetchUserInfo();
      return true;
      
    } catch (err: any) {
      console.error('❌ Error claiming rewards:', err);
      
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Claim failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, sdk, poolAddress, fetchUserInfo]);

  // Emergency withdraw
  const emergencyWithdraw = useCallback(async (): Promise<boolean> => {
    try {
      if (!address || !sdk?.provider) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, signer);

      console.log('🚨 Requesting emergency withdraw...');
      const tx = await contract.emergencyWithdraw();
      console.log('⏳ Emergency withdraw transaction sent, waiting for confirmation...');
      await tx.wait();
      console.log('✅ Emergency withdraw completed!');

      await Promise.all([
        fetchUserInfo(),
        fetchTokenInfo()
      ]);
      
      return true;
    } catch (err: any) {
      console.error('❌ Error emergency withdraw:', err);
      
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Emergency withdraw failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, sdk, poolAddress, fetchUserInfo, fetchTokenInfo]);

  // Load initial pool data
  useEffect(() => {
    if (poolAddress) {
      fetchPoolData();
    }
  }, [poolAddress, fetchPoolData]);

  // Fetch user-specific data when wallet connects or poolData changes
  useEffect(() => {
    if (poolData && address && isConnected) {
      fetchUserInfo();
      fetchTokenInfo();
    }
  }, [poolData, address, isConnected, fetchUserInfo, fetchTokenInfo]);

  return {
    poolData,
    userInfo,
    stakingTokenBalance,
    stakingTokenAllowance,
    isLoading,
    error,
    isConnected,
    refreshData,
    approveStakingToken,
    stake,
    unstake,
    claimRewards,
    emergencyWithdraw
  };
};

export default useEcosystemStakingGitHub;