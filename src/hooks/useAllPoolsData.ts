import { usePoolData } from './usePoolData';
import { useDexScreener } from './useDexScreener';

export const useAllPoolsData = () => {
  const orderOrderData = usePoolData('ORDER_ORDER');
  const orderWitchData = usePoolData('ORDER_WITCH');
  const orderKoksalData = usePoolData('ORDER_KOKSAL');
  const orderStankData = usePoolData('ORDER_STANK');
  const orderXOrderData = usePoolData('ORDER_xORDER');
  const orderXArenaData = usePoolData('ORDER_xARENA');

  const { getTokenPrice, TOKEN_ADDRESSES, isLoading } = useDexScreener();
  const orderPrice = getTokenPrice(TOKEN_ADDRESSES.ORDER) || 0.0012; // Fallback price from Rules.md

  const pools = [
    {
      pool: 'ORDER → ORDER',
      stakingToken: 'ORDER',
      rewardToken: 'ORDER',
      tvlOrderAmount: orderOrderData.tvlOrderAmount,
      tvlUsd: orderOrderData.tvlOrderAmount * orderPrice,
      apy: orderOrderData.apy,
    },
    {
      pool: 'ORDER → WITCH',
      stakingToken: 'ORDER',
      rewardToken: 'WITCH',
      tvlOrderAmount: orderWitchData.tvlOrderAmount,
      tvlUsd: orderWitchData.tvlOrderAmount * orderPrice,
      apy: orderWitchData.apy,
    },
    {
      pool: 'ORDER → KOKSAL',
      stakingToken: 'ORDER',
      rewardToken: 'KOKSAL',
      tvlOrderAmount: orderKoksalData.tvlOrderAmount,
      tvlUsd: orderKoksalData.tvlOrderAmount * orderPrice,
      apy: orderKoksalData.apy,
    },
    {
      pool: 'ORDER → STANK',
      stakingToken: 'ORDER',
      rewardToken: 'STANK',
      tvlOrderAmount: orderStankData.tvlOrderAmount,
      tvlUsd: orderStankData.tvlOrderAmount * orderPrice,
      apy: orderStankData.apy,
    },
    {
      pool: 'ORDER → xORDER',
      stakingToken: 'ORDER',
      rewardToken: 'xORDER',
      tvlOrderAmount: orderXOrderData.tvlOrderAmount,
      tvlUsd: orderXOrderData.tvlOrderAmount * orderPrice,
      apy: orderXOrderData.apy,
    },
    {
      pool: 'ORDER → xARENA',
      stakingToken: 'ORDER',
      rewardToken: 'xARENA',
      tvlOrderAmount: orderXArenaData.tvlOrderAmount,
      tvlUsd: orderXArenaData.tvlOrderAmount * orderPrice,
      apy: orderXArenaData.apy,
    },
  ];

  const totalTVLUsd = pools.reduce((sum, pool) => sum + pool.tvlUsd, 0);

  return {
    pools,
    totalTVLUsd,
    orderPrice,
    isLoading,
  };
};
