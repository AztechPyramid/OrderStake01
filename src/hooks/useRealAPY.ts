import { useMemo } from 'react';

// Simplified real APY hook for Arena-only implementation
export const useRealAPY = (
  poolType: 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK'
) => {
  return useMemo(() => {
    // Mock realistic APY values
    const realisticAPY = {
      'ORDER_ORDER': 45.5,   // ORDER → ORDER staking
      'ORDER_WITCH': 67.2,   // ORDER → WITCH dual rewards
      'ORDER_KOKSAL': 52.8,  // ORDER → KOKSAL
      'ORDER_STANK': 38.9,   // ORDER → STANK
    };
    
    return realisticAPY[poolType];
  }, [poolType]);
};
