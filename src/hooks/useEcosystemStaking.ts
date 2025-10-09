import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { useArenaSDK } from './useArenaSDK';
import { ECOSYSTEM_STAKING_ABI, PoolMetadata } from '@/contracts/EcosystemStakingABI';
import { ERC20ABI } from '@/contracts/ERC20ABI';

// Utility function to format time remaining
const formatTimeRemaining = (endDate: Date): string => {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export interface StakingPoolData {
  stakingToken: string;
  rewardToken: string;
  totalStaked: string;
  rewardPerBlock: string;
  startBlock: bigint;
  endBlock: bigint;
  lastRewardBlock: bigint;
  creator: string;
}

export interface StakingPoolMetadata {
  poolName: string;
  poolDescription: string;
  stakingSymbol: string;
  rewardSymbol: string;
  stakingLogo: string;
  rewardLogo: string;
}

export interface UserStakeInfo {
  stakedAmount: string;
  pendingRewards: string;
  rewardDebt: string;
}

export interface PoolStats {
  tvl: string; // In USD
  apy: string; // Percentage
  blocksRemaining: bigint;
  isActive: boolean;
  hasStarted: boolean;
  hasEnded: boolean;
  remainingRewards: string; // Remaining reward tokens in the pool
  startDate: Date | null;
  endDate: Date | null;
  timeRemaining: string; // Human readable time remaining
}

const BLOCKS_PER_YEAR = 15768000n; // Avalanche: ~2 seconds per block

export const useEcosystemStaking = (poolAddress: string) => {
  const { address, sdk, isConnected } = useArenaSDK();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poolData, setPoolData] = useState<StakingPoolData | null>(null);
  const [poolMetadata, setPoolMetadata] = useState<StakingPoolMetadata | null>(null);
  const [userInfo, setUserInfo] = useState<UserStakeInfo | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [stakingTokenBalance, setStakingTokenBalance] = useState<string>('0');
  const [stakingTokenAllowance, setStakingTokenAllowance] = useState<string>('0');
  const [stakingTokenPrice, setStakingTokenPrice] = useState<number>(0);
  const [rewardTokenPrice, setRewardTokenPrice] = useState<number>(0);
  const [stakingTokenDecimals, setStakingTokenDecimals] = useState<number>(18);
  const [rewardTokenDecimals, setRewardTokenDecimals] = useState<number>(18);

  // Get provider
  const getProvider = useCallback(() => {
    if (!sdk?.provider) return null;
    return new BrowserProvider(sdk.provider);
  }, [sdk]);

  // Calculate TVL and APY
  const calculateStats = useCallback(async (data: StakingPoolData) => {
    try {
      const provider = getProvider();
      if (!provider) return;

      const currentBlock = await provider.getBlockNumber();
      const currentBlockBigInt = BigInt(currentBlock);
      
      // Calculate TVL (assuming staking token price, you may want to fetch from price oracle)
      const tvlUSD = parseFloat(data.totalStaked) * stakingTokenPrice;
      
      // Calculate APY
      // Calculate remaining rewards in the pool
      const rewardTokenContract = new Contract(data.rewardToken, ERC20ABI, provider);
      const rewardTokenDecimals = await rewardTokenContract.decimals();
      const rewardBalance = await rewardTokenContract.balanceOf(poolAddress);
      const remainingRewards = ethers.formatUnits(rewardBalance, rewardTokenDecimals);

      // Convert blocks to dates (Avalanche: ~2 seconds per block)
      const currentTimestamp = Date.now();
      const startTimestamp = currentTimestamp + (Number(data.startBlock - currentBlockBigInt) * 2000);
      const endTimestamp = currentTimestamp + (Number(data.endBlock - currentBlockBigInt) * 2000);
      
      const startDate = new Date(startTimestamp);
      const endDate = new Date(endTimestamp);

      // Calculate time remaining
      const timeRemaining = formatTimeRemaining(endDate);

      let apy = '0';
      if (parseFloat(data.totalStaked) > 0 && rewardTokenPrice > 0) {
        const rewardPerYear = parseFloat(data.rewardPerBlock) * Number(BLOCKS_PER_YEAR);
        const rewardValuePerYear = rewardPerYear * rewardTokenPrice;
        const apyValue = (rewardValuePerYear / tvlUSD) * 100;
        apy = isFinite(apyValue) ? apyValue.toFixed(2) : '0';
      }

      const blocksRemaining = data.endBlock > currentBlockBigInt 
        ? data.endBlock - currentBlockBigInt 
        : 0n;

      const hasStarted = currentBlockBigInt >= data.startBlock;
      const hasEnded = currentBlockBigInt > data.endBlock;
      const isActive = hasStarted && !hasEnded;

      setPoolStats({
        tvl: tvlUSD.toFixed(2),
        apy,
        blocksRemaining,
        isActive,
        hasStarted,
        hasEnded,
        remainingRewards,
        startDate: hasStarted ? null : startDate,
        endDate,
        timeRemaining
      });
    } catch (err) {
      console.error('Error calculating stats:', err);
    }
  }, [getProvider, stakingTokenPrice, rewardTokenPrice]);

  // Fetch pool data
  const fetchPoolData = useCallback(async () => {
    try {
      const provider = getProvider();
      if (!provider) return;
      
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, provider);
      const poolInfo = await contract.getPoolInfo();
      
      // Get token decimals for proper formatting
      const stakingTokenContract = new Contract(poolInfo._stakingToken, ERC20ABI, provider);
      const rewardTokenContract = new Contract(poolInfo._rewardToken, ERC20ABI, provider);
      
      const [stakingDecimals, rewardDecimals] = await Promise.all([
        stakingTokenContract.decimals(),
        rewardTokenContract.decimals()
      ]);
      
      // Store decimals for other functions
      setStakingTokenDecimals(stakingDecimals);
      setRewardTokenDecimals(rewardDecimals);
      
      const data: StakingPoolData = {
        stakingToken: poolInfo._stakingToken,
        rewardToken: poolInfo._rewardToken,
        totalStaked: ethers.formatUnits(poolInfo._totalStaked, stakingDecimals),
        rewardPerBlock: ethers.formatUnits(poolInfo._rewardPerBlock, rewardDecimals),
        startBlock: poolInfo._startBlock,
        endBlock: poolInfo._endBlock,
        lastRewardBlock: poolInfo._lastRewardBlock,
        creator: poolInfo._creator
      };

      setPoolData(data);
      await calculateStats(data);
    } catch (err: any) {
      console.error('Error fetching pool data:', err);
      setError(err.message);
    }
  }, [getProvider, poolAddress, calculateStats]);

  // Fetch pool metadata
  const fetchPoolMetadata = useCallback(async () => {
    try {
      const provider = getProvider();
      if (!provider) return;
      
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, provider);
      const metadata: PoolMetadata = await contract.getPoolMetadata();
      
      setPoolMetadata({
        poolName: metadata.poolName,
        poolDescription: metadata.poolDescription,
        stakingSymbol: metadata.stakingSymbol,
        rewardSymbol: metadata.rewardSymbol,
        stakingLogo: metadata.stakingLogo,
        rewardLogo: metadata.rewardLogo
      });
    } catch (err: any) {
      console.error('Error fetching pool metadata:', err);
    }
  }, [getProvider, poolAddress]);

  // Fetch user info
  const fetchUserInfo = useCallback(async () => {
    try {
      if (!address) return;
      const provider = getProvider();
      if (!provider) return;
      
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, provider);
      
      const [userStake, pendingRewards] = await Promise.all([
        contract.userInfo(address),
        contract.pendingReward(address)
      ]);
      
      setUserInfo({
        stakedAmount: ethers.formatUnits(userStake.amount, stakingTokenDecimals),
        pendingRewards: ethers.formatUnits(pendingRewards, rewardTokenDecimals),
        rewardDebt: ethers.formatUnits(userStake.rewardDebt, rewardTokenDecimals)
      });
    } catch (err: any) {
      console.error('Error fetching user info:', err);
    }
  }, [address, getProvider, poolAddress, stakingTokenDecimals, rewardTokenDecimals]);

  // Fetch staking token balance and allowance
  const fetchTokenInfo = useCallback(async () => {
    try {
      if (!address || !poolData) return;
      const provider = getProvider();
      if (!provider) return;
      
      const tokenContract = new Contract(poolData.stakingToken, ERC20ABI, provider);
      
      const [balance, allowance] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.allowance(address, poolAddress)
      ]);
      
      setStakingTokenBalance(ethers.formatUnits(balance, stakingTokenDecimals));
      setStakingTokenAllowance(ethers.formatUnits(allowance, stakingTokenDecimals));
    } catch (err: any) {
      console.error('Error fetching token info:', err);
    }
  }, [address, poolData, getProvider, poolAddress, stakingTokenDecimals]);

  // Approve staking tokens
  const approveStakingToken = useCallback(async (amount?: string) => {
    try {
      if (!address || !poolData || !sdk?.provider) {
        throw new Error('Not ready');
      }

      setIsLoading(true);
      setError(null);

      // Create fresh provider to avoid stale state
      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(poolData.stakingToken, ERC20ABI, signer);

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
      
      // Handle user rejection specifically
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Approval failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, poolData, sdk, poolAddress, fetchTokenInfo, stakingTokenDecimals]);

  // Stake tokens
  const stake = useCallback(async (amount: string) => {
    try {
      if (!address || !sdk?.provider) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      // Create fresh provider to avoid stale state
      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, signer);

      const amountWei = ethers.parseUnits(amount, stakingTokenDecimals);
      
      console.log('📥 Requesting stake transaction...');
      const tx = await contract.stake(amountWei);
      console.log('⏳ Stake transaction sent, waiting for confirmation...');
      await tx.wait();
      console.log('✅ Stake confirmed!');

      await Promise.all([
        fetchUserInfo(),
        fetchPoolData(),
        fetchTokenInfo()
      ]);
      
      return true;
    } catch (err: any) {
      console.error('❌ Error staking:', err);
      
      // Handle user rejection specifically
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Staking failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, sdk, poolAddress, fetchUserInfo, fetchPoolData, fetchTokenInfo, stakingTokenDecimals]);

  // Unstake tokens
  const unstake = useCallback(async (amount: string) => {
    try {
      if (!address || !sdk?.provider) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      // Create fresh provider to avoid stale state
      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, signer);

      const amountWei = ethers.parseUnits(amount, stakingTokenDecimals);
      
      console.log('📤 Requesting unstake transaction...');
      const tx = await contract.unstake(amountWei);
      console.log('⏳ Unstake transaction sent, waiting for confirmation...');
      await tx.wait();
      console.log('✅ Unstake confirmed!');

      await Promise.all([
        fetchUserInfo(),
        fetchPoolData(),
        fetchTokenInfo()
      ]);
      
      return true;
    } catch (err: any) {
      console.error('❌ Error unstaking:', err);
      
      // Handle user rejection specifically
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Unstaking failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, sdk, poolAddress, fetchUserInfo, fetchPoolData, fetchTokenInfo, stakingTokenDecimals]);

  // Claim rewards
  const claimRewards = useCallback(async () => {
    try {
      if (!address || !sdk?.provider) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      // Create fresh provider to avoid stale state
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
      
      // Handle user rejection specifically
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
  const emergencyWithdraw = useCallback(async () => {
    try {
      if (!address || !sdk?.provider) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      // Create fresh provider to avoid stale state
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
        fetchPoolData(),
        fetchTokenInfo()
      ]);
      
      return true;
    } catch (err: any) {
      console.error('❌ Error emergency withdraw:', err);
      
      // Handle user rejection specifically
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Emergency withdraw failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, sdk, poolAddress, fetchUserInfo, fetchPoolData, fetchTokenInfo]);

  // Load initial data
  useEffect(() => {
    if (isConnected && sdk && poolAddress) {
      fetchPoolData();
      fetchPoolMetadata();
    }
  }, [isConnected, sdk, poolAddress, fetchPoolData, fetchPoolMetadata]);

  // Fetch user-specific data when wallet connects or poolData changes
  useEffect(() => {
    if (poolData && address && isConnected) {
      fetchUserInfo();
      fetchTokenInfo();
    }
  }, [poolData, address, isConnected]); // Removed fetchUserInfo and fetchTokenInfo from dependencies

  // Recalculate stats when prices change
  useEffect(() => {
    if (poolData) {
      calculateStats(poolData);
    }
  }, [poolData, stakingTokenPrice, rewardTokenPrice, calculateStats]);

  return {
    // State
    poolData,
    poolMetadata,
    poolStats,
    userInfo,
    stakingTokenBalance,
    stakingTokenAllowance,
    stakingTokenPrice,
    rewardTokenPrice,
    isLoading,
    error,
    isConnected,
    address,
    
    // Functions
    fetchPoolData,
    fetchPoolMetadata,
    fetchUserInfo,
    fetchTokenInfo,
    setStakingTokenPrice,
    setRewardTokenPrice,
    approveStakingToken,
    stake,
    unstake,
    claimRewards,
    emergencyWithdraw
  };
};
