import { useEffect, useState } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

export interface OrderBalanceInfo {
  address: string;
  balance: string;
  isLoading: boolean;
  error?: string;
}

export function useOrderBalancesForAddresses(addresses: string[]) {
  const [balances, setBalances] = useState<OrderBalanceInfo[]>([]);
  const arenaData = useArenaSDK();

  useEffect(() => {
    let cancelled = false;
    async function fetchBalances() {
      if (!arenaData?.sdk?.provider) {
        setBalances(addresses.map(address => ({ address, balance: '0', isLoading: false, error: 'No provider' })));
        return;
      }
      setBalances(addresses.map(address => ({ address, balance: '0', isLoading: true })));
      const tokenAddress = CONTRACT_ADDRESSES.tokens.ORDER;
      const results: OrderBalanceInfo[] = await Promise.all(addresses.map(async (address) => {
        try {
          const data = '0x70a08231' + address.slice(2).padStart(64, '0');
          const result = await arenaData.sdk.provider.request({
            method: 'eth_call',
            params: [{ to: tokenAddress, data }, 'latest']
          });
          let balance = '0';
          if (result && result !== '0x' && typeof result === 'string') {
            const balanceWei = BigInt(result);
            balance = (Number(balanceWei) / 1e18).toFixed(4);
          }
          return { address, balance, isLoading: false };
        } catch (error: any) {
          return { address, balance: '0', isLoading: false, error: error?.message || 'Error' };
        }
      }));
      if (!cancelled) setBalances(results);
    }
    fetchBalances();
    return () => { cancelled = true; };
  }, [arenaData?.sdk?.provider, addresses.join(',')]);

  return balances;
}
