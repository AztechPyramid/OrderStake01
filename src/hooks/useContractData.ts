import { useState, useEffect } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
import { ArenaUserProfile } from 'arena-app-store-sdk';

type PoolType = 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA' | 'ALP_DUAL';

interface ContractData {
  totalSupply: string;
  userBalance: string;
  userStaked: string;
  pendingRewards: string;
  allowance: string;
  tvlAmount: string; // TVL from TVL contract
  remainingBalance: string; // Reward token balance in staking contract
  isLoading: boolean;
  error: string | null;
}

export const useContractData = (poolType: PoolType): ContractData => {
  const [data, setData] = useState<ContractData>({
    totalSupply: '0',
    userBalance: '0',
    userStaked: '0',
    pendingRewards: '0',
    allowance: '0',
    tvlAmount: '0',
    remainingBalance: '0',
    isLoading: true,
    error: null,
  });

  const arenaData = useArenaSDK();

  useEffect(() => {
    const fetchContractData = async () => {
      if (!arenaData?.sdk?.provider || !arenaData.isConnected) {
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        
        const userAddress = arenaData.sdk.provider.accounts[0];
        const stakingContract = CONTRACT_ADDRESSES.staking[poolType];
        const tvlContract = CONTRACT_ADDRESSES.tvl[poolType];
        const rewardPoolContract = CONTRACT_ADDRESSES.rewardPools[poolType];
        const orderToken = poolType === 'ALP_DUAL' ? CONTRACT_ADDRESSES.tokens.ALP : CONTRACT_ADDRESSES.tokens.ORDER;
        
        // Get reward token address and index based on pool type
        const getRewardTokenInfo = () => {
          switch(poolType) {
            case 'ORDER_ORDER': return { 
              token: CONTRACT_ADDRESSES.tokens.ORDER, 
              index: 0 
            };
            case 'ORDER_WITCH': return { 
              token: CONTRACT_ADDRESSES.tokens.WITCH, 
              index: 1 
            };
            case 'ORDER_KOKSAL': return { 
              token: CONTRACT_ADDRESSES.tokens.KOKSAL, 
              index: 2 
            };
            case 'ORDER_STANK': return { 
              token: CONTRACT_ADDRESSES.tokens.STANK, 
              index: 3 
            };
            case 'ORDER_xORDER': return { 
              token: CONTRACT_ADDRESSES.tokens.xORDER, 
              index: 4 
            };
            case 'ORDER_xARENA': return { 
              token: CONTRACT_ADDRESSES.tokens.xARENA, 
              index: 5 
            };
            case 'ALP_DUAL': return { 
              token: CONTRACT_ADDRESSES.tokens.xORDER, // Primary reward token for ALP
              index: 0 // xORDER is index 0 in ALP dual contract
            };
            default: return { 
              token: CONTRACT_ADDRESSES.tokens.ORDER, 
              index: 0 
            };
          }
        };
        const rewardTokenInfo = getRewardTokenInfo();
        const rewardToken = rewardTokenInfo.token;
        const rewardIndex = rewardTokenInfo.index;

        try {
          const userProfile = await arenaData.sdk.sendRequest('getUserProfile') as ArenaUserProfile;
          console.log(`✅ Profile: ${userProfile?.userHandle || 'Unknown'}`);
        } catch (profileError) {
          console.log(`Profile error: ${profileError}`);
        }

        console.log(`🔍 Contract Addresses for ${poolType}:`, {
          stakingContract,
          tvlContract, 
          rewardPoolContract,
          orderToken,
          rewardToken,
          userAddress
        });

        // Try direct Avalanche RPC if Arena provider fails
        const provider = arenaData.sdk.provider;
        const rpcUrl = 'https://api.avax.network/ext/bc/C/rpc';
        
        // Test if Arena provider works, fallback to direct RPC
        const makeCall = async (callData: { method: string; params: unknown[] }) => {
          try {
            return await provider.request(callData);
          } catch (error) {
            console.log(`Arena provider failed, using direct RPC: ${error}`);
            // Fallback to direct fetch
            const response = await fetch(rpcUrl, {
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

        // Parallelize contract calls for better performance with fallback
        const [
          totalSupplyResult,
          userBalanceResult,
          userStakedResult,
          pendingRewardsByTokenResult,
          pendingRewardsByIndexResult,
          allowanceResult,
          tvlAmountResult,
          remainingBalanceResult
        ] = await Promise.all([
          // Total supply from staking contract
          makeCall({
            method: 'eth_call',
            params: [{
              to: stakingContract,
              data: '0x18160ddd' // totalSupply()
            }, 'latest']
          }),
          
          // User ORDER token balance
          makeCall({
            method: 'eth_call',
            params: [{
              to: orderToken,
              data: '0x70a08231' + userAddress.slice(2).padStart(64, '0') // balanceOf(address)
            }, 'latest']
          }),
          
          // User staked amount in pool
          makeCall({
            method: 'eth_call',
            params: [{
              to: stakingContract,
              data: '0x70a08231' + userAddress.slice(2).padStart(64, '0') // balanceOf(address)
            }, 'latest']
          }),
          
          // Pending rewards by token address - getPendingRewardByToken(address user, address rewardToken)
          makeCall({
            method: 'eth_call',
            params: [{
              to: stakingContract,
              data: '0x00b68f08' + 
                    userAddress.slice(2).padStart(64, '0') + 
                    rewardToken.slice(2).padStart(64, '0') // getPendingRewardByToken(address, address)
            }, 'latest']
          }),
          
          // Pending rewards by index - getPendingReward(address user, uint256 index)
          makeCall({
            method: 'eth_call',
            params: [{
              to: stakingContract,
              data: '0x999ffd97' + 
                    userAddress.slice(2).padStart(64, '0') + 
                    rewardIndex.toString(16).padStart(64, '0') // getPendingReward(address, uint256)
            }, 'latest']
          }),
          
          // User allowance for staking contract
          makeCall({
            method: 'eth_call',
            params: [{
              to: orderToken,
              data: '0xdd62ed3e' + 
                    userAddress.slice(2).padStart(64, '0') +
                    stakingContract.slice(2).padStart(64, '0') // allowance(address, address)
            }, 'latest']
          }),
          
          // TVL Amount: ORDER balance in TVL contract
          makeCall({
            method: 'eth_call',
            params: [{
              to: orderToken,
              data: '0x70a08231' + tvlContract.slice(2).padStart(64, '0') // balanceOf(tvlContract)
            }, 'latest']
          }),
          
          // Remaining reward token balance in reward pool contract
          makeCall({
            method: 'eth_call',
            params: [{
              to: rewardToken,
              data: '0x70a08231' + rewardPoolContract.slice(2).padStart(64, '0') // balanceOf(rewardPoolContract)
            }, 'latest']
          })
        ]);

        console.log(`📊 Raw Contract Results for ${poolType}:`, {
          totalSupplyResult,
          userBalanceResult,
          userStakedResult,
          pendingRewardsByTokenResult,
          pendingRewardsByIndexResult,
          allowanceResult,
          tvlAmountResult,
          remainingBalanceResult,
          rewardToken,
          rewardIndex
        });

        // Convert hex results to readable numbers with detailed logging
        const totalSupply = totalSupplyResult ? parseInt(totalSupplyResult as string, 16) : 0;
        const userBalance = userBalanceResult ? parseInt(userBalanceResult as string, 16) : 0;
        const userStaked = userStakedResult ? parseInt(userStakedResult as string, 16) : 0;
        
        // Try both pending reward methods and use the one that returns a value > 0
        const pendingRewardsByToken = pendingRewardsByTokenResult ? parseInt(pendingRewardsByTokenResult as string, 16) : 0;
        const pendingRewardsByIndex = pendingRewardsByIndexResult ? parseInt(pendingRewardsByIndexResult as string, 16) : 0;
        
  // Use only real contract values for pending rewards
  let pendingRewards = Math.max(pendingRewardsByToken, pendingRewardsByIndex);
        
        const allowance = allowanceResult ? parseInt(allowanceResult as string, 16) : 0;
        const tvlAmount = tvlAmountResult ? parseInt(tvlAmountResult as string, 16) : 0;
        const remainingBalance = remainingBalanceResult ? parseInt(remainingBalanceResult as string, 16) : 0;

        console.log(`🔢 Parsed Numbers for ${poolType}:`, {
          totalSupply,
          userBalance,
          userStaked,
          pendingRewardsByToken,
          pendingRewardsByIndex,
          pendingRewards,
          allowance,
          tvlAmount,
          remainingBalance,
          rewardToken,
          rewardIndex
        });

        console.log(`🔍 Checking pending rewards for ${poolType}:`, {
          contractAddress: stakingContract,
          userAddress,
          rewardToken,
          rewardIndex,
          rawByToken: pendingRewardsByTokenResult,
          rawByIndex: pendingRewardsByIndexResult,
          parsedByToken: pendingRewardsByToken,
          parsedByIndex: pendingRewardsByIndex,
          finalPendingRewards: pendingRewards
        });

        setData({
          totalSupply: (totalSupply / 1e18).toFixed(12),
          userBalance: (userBalance / 1e18).toFixed(12),
          userStaked: (userStaked / 1e18).toFixed(12),
          pendingRewards: (pendingRewards / 1e18).toFixed(12),
          allowance: (allowance / 1e18).toFixed(12),
          tvlAmount: (tvlAmount / 1e18).toFixed(12),
          remainingBalance: (remainingBalance / 1e18).toFixed(12),
          isLoading: false,
          error: null,
        });

        console.log(`📊 Contract Data for ${poolType}:`, {
          totalSupply: (totalSupply / 1e18).toFixed(6),
          userBalance: (userBalance / 1e18).toFixed(6),
          userStaked: (userStaked / 1e18).toFixed(6),
          pendingRewards: (pendingRewards / 1e18).toFixed(6),
          allowance: (allowance / 1e18).toFixed(6),
          tvlAmount: (tvlAmount / 1e18).toFixed(6),
          remainingBalance: (remainingBalance / 1e18).toFixed(6),
        });

      } catch (error) {
        console.error(`❌ Error fetching contract data for ${poolType}:`, error);
        
        setData({
          totalSupply: '0',
          userBalance: '0', 
          userStaked: '0',
          pendingRewards: '0',
          allowance: '0',
          tvlAmount: '0', // Show real 0 if contract call fails
          remainingBalance: '0', // Show real 0 if contract call fails
          isLoading: false,
          error: error instanceof Error ? error.message : 'Contract call failed'
        });
      }
    };

    fetchContractData();
    
    // Auto-refresh contract data every 10 seconds
    const interval = setInterval(fetchContractData, 10000);
    return () => clearInterval(interval);
    
  }, [poolType, arenaData?.isConnected, arenaData?.sdk]);

  return data;
};
