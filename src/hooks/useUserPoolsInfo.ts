import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { useArenaSDK } from './useArenaSDK';
import { ECOSYSTEM_STAKING_ABI } from '@/contracts/EcosystemStakingABI';

export interface UserPoolInfo {
  poolAddress: string;
  stakedAmount: string;
  hasStake: boolean;
}

/**
 * Hook to get information about which pools a user has staked in
 */
export const useUserPoolsInfo = (poolAddresses: string[]) => {
  const { address, sdk, isConnected } = useArenaSDK();
  const [userPoolsInfo, setUserPoolsInfo] = useState<Map<string, UserPoolInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const getProvider = useCallback(() => {
    if (!sdk?.provider) return null;
    return new BrowserProvider(sdk.provider);
  }, [sdk]);

  const fetchUserPoolsInfo = useCallback(async () => {
    if (!isConnected || !address || poolAddresses.length === 0) {
      setUserPoolsInfo(new Map());
      return;
    }

    setIsLoading(true);
    try {
      const provider = getProvider();
      if (!provider) return;

      const infoMap = new Map<string, UserPoolInfo>();

      // Fetch user info for each pool in parallel
      await Promise.all(
        poolAddresses.map(async (poolAddress) => {
          try {
            const contract = new Contract(poolAddress, ECOSYSTEM_STAKING_ABI, provider);
            const userInfo = await contract.userInfo(address);
            
            const stakedAmount = ethers.formatEther(userInfo.amount || 0n);
            const hasStake = Number(stakedAmount) > 0;

            infoMap.set(poolAddress, {
              poolAddress,
              stakedAmount,
              hasStake
            });
          } catch (err) {
            console.error(`Error fetching info for pool ${poolAddress}:`, err);
            infoMap.set(poolAddress, {
              poolAddress,
              stakedAmount: '0',
              hasStake: false
            });
          }
        })
      );

      setUserPoolsInfo(infoMap);
      
      console.log('🎯 [USER_POOLS_INFO] Updated user pools info:', {
        address,
        poolsChecked: poolAddresses.length,
        userInfoCount: infoMap.size,
        stakesFound: Array.from(infoMap.values()).filter(info => info.hasStake).length,
        stakeDetails: Array.from(infoMap.entries()).map(([addr, info]) => ({
          address: addr.slice(0, 10) + '...',
          hasStake: info.hasStake,
          stakedAmount: info.stakedAmount
        }))
      });
    } catch (err) {
      console.error('Error fetching user pools info:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, poolAddresses, getProvider]);

  useEffect(() => {
    fetchUserPoolsInfo();
  }, [fetchUserPoolsInfo]);

  return {
    userPoolsInfo,
    isLoading,
    refetch: fetchUserPoolsInfo
  };
};
