import { usePoolData } from './usePoolData';
import { useMemo } from 'react';

type PoolType = 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA';

export const useAllPoolsTVL = () => {
  // Call hooks at top level
  const orderOrder = usePoolData('ORDER_ORDER');
  const orderWitch = usePoolData('ORDER_WITCH');
  const orderKoksal = usePoolData('ORDER_KOKSAL');
  const orderStank = usePoolData('ORDER_STANK');
  const orderXOrder = usePoolData('ORDER_xORDER');
  const orderXArena = usePoolData('ORDER_xARENA');

  return useMemo(() => ({
    ORDER_ORDER: orderOrder.tvlOrderAmount,
    ORDER_WITCH: orderWitch.tvlOrderAmount,
    ORDER_KOKSAL: orderKoksal.tvlOrderAmount,
    ORDER_STANK: orderStank.tvlOrderAmount,
    ORDER_xORDER: orderXOrder.tvlOrderAmount,
    ORDER_xARENA: orderXArena.tvlOrderAmount,
  }), [orderOrder.tvlOrderAmount, orderWitch.tvlOrderAmount, orderKoksal.tvlOrderAmount, orderStank.tvlOrderAmount, orderXOrder.tvlOrderAmount, orderXArena.tvlOrderAmount]);
};
