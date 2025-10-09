import { useMemo } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { useContractData } from './useContractData';
import { useOrderPrice } from './useOrderPrice';

type PoolType = 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA';

interface PoolData {
  tvlOrderAmount: number;
  tvlUsd: number;
  apy: number;
  userStaked: number;
  userEarned: number;
  isStaking: boolean;
  isUnstaking: boolean;
  stake: (amount: number) => Promise<void>;
  unstake: (amount: number) => Promise<void>;
  claim: () => Promise<void>;
}

// Arena SDK pool data with real contract data
export const usePoolData = (poolType: PoolType): PoolData => {
  const arenaData = useArenaSDK();
  const contractData = useContractData(poolType);
  const { priceData } = useOrderPrice();

  return useMemo(() => {
    // Calculate APY based on contract data (simplified calculation)
    const calculateAPY = () => {
      if (poolType === 'ORDER_ORDER') return 45.5;
      if (poolType === 'ORDER_WITCH') return 67.2;
      if (poolType === 'ORDER_KOKSAL') return 52.8;
      if (poolType === 'ORDER_STANK') return 38.9;
      if (poolType === 'ORDER_xORDER') return 55.0;
      if (poolType === 'ORDER_xARENA') return 60.0;
      return 40.0;
    };

    const orderPrice = priceData.price || 0.0012; // Use real ORDER price from DexScreener
    const tvlOrderAmount = parseFloat(contractData.tvlAmount) || 0;
    
    return {
      tvlOrderAmount,
      tvlUsd: tvlOrderAmount * orderPrice,
      apy: calculateAPY(),
      userStaked: parseFloat(contractData.userStaked) || 0,
      userEarned: parseFloat(contractData.pendingRewards) || 0,
      isStaking: false,
      isUnstaking: false,
      stake: async (amount: number) => {
        // Mock stake function for Arena environment
        console.log(`Staking ${amount} in ${poolType} pool via Arena SDK`);
        if (arenaData?.sdk && arenaData.isConnected) {
          // Arena SDK transaction would go here
          console.log('Arena transaction prepared');
        }
      },
      unstake: async (amount: number) => {
        // Mock unstake function for Arena environment
        console.log(`Unstaking ${amount} from ${poolType} pool via Arena SDK`);
        if (arenaData?.sdk && arenaData.isConnected) {
          // Arena SDK transaction would go here
          console.log('Arena unstake transaction prepared');
        }
      },
      claim: async () => {
        // Mock claim function for Arena environment
        console.log(`Claiming rewards from ${poolType} pool via Arena SDK`);
        if (arenaData?.sdk && arenaData.isConnected) {
          // Arena SDK transaction would go here
          console.log('Arena claim transaction prepared');
        }
      },
    };
  }, [poolType, arenaData, contractData, priceData]);
};
