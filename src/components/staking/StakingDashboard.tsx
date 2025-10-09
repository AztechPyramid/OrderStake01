import { StakingCard } from './StakingCard';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
import { useDexScreener } from '@/hooks/useDexScreener';


interface Pool {
  id: string;
  stakingToken: string;
  rewardToken: string;
  stakingTokenLogo: string;
  rewardTokenLogo: string;
  poolType: 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA';
  apy: string;
  totalStaked: string;
  earned: string;
  contractAddress: string;
  stakingContract: string;
  tvlContract: string;
}

const StakingPool = ({ 
  pool, 
  getTokenPrice, 
  TOKEN_ADDRESSES, 
  openStakeCard 
}: { 
  pool: Pool; 
  getTokenPrice: (address: string) => number; 
  TOKEN_ADDRESSES: Record<string, string>;
  openStakeCard?: string | null;
}) => {
  return (
    <StakingCard
      stakingToken={pool.stakingToken}
      rewardToken={pool.rewardToken}
      stakingTokenLogo={pool.stakingTokenLogo}
      rewardTokenLogo={pool.rewardTokenLogo}
      stakingContract={pool.stakingContract}
      tvlContract={pool.tvlContract}
      poolType={pool.poolType}
      getTokenPrice={getTokenPrice}
      TOKEN_ADDRESSES={TOKEN_ADDRESSES}
      openStakeCard={openStakeCard}
    />
  );
};

const stakingPools = [
  {
    id: 'order-order',
    poolType: 'ORDER_ORDER' as const,
    stakingToken: 'ORDER',
    rewardToken: 'ORDER',
    stakingTokenLogo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    rewardTokenLogo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    stakingContract: CONTRACT_ADDRESSES.staking.ORDER_ORDER,
    tvlContract: CONTRACT_ADDRESSES.tvl.ORDER_ORDER,
    apy: '45.5%',
    totalStaked: '0',
    earned: '0',
    contractAddress: CONTRACT_ADDRESSES.staking.ORDER_ORDER,
  },
  {
    id: 'order-xorder',
    poolType: 'ORDER_xORDER' as const,
    stakingToken: 'ORDER',
    rewardToken: 'xORDER',
    stakingTokenLogo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    rewardTokenLogo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    stakingContract: CONTRACT_ADDRESSES.staking.ORDER_xORDER,
    tvlContract: CONTRACT_ADDRESSES.tvl.ORDER_xORDER,
    apy: '55.0%',
    totalStaked: '0',
    earned: '0',
    contractAddress: CONTRACT_ADDRESSES.staking.ORDER_xORDER,
  },
  {
    id: 'order-xarena',
    poolType: 'ORDER_xARENA' as const,
    stakingToken: 'ORDER',
    rewardToken: 'xARENA',
    stakingTokenLogo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    rewardTokenLogo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F3c461417-92b8-04bb-841c-945306c77c2b1749435408088.jpeg&w=96&q=75',
    stakingContract: CONTRACT_ADDRESSES.staking.ORDER_xARENA,
    tvlContract: CONTRACT_ADDRESSES.tvl.ORDER_xARENA,
    apy: '60.0%',
    totalStaked: '0',
    earned: '0',
    contractAddress: CONTRACT_ADDRESSES.staking.ORDER_xARENA,
  }
];


interface StakingDashboardProps {
  searchQuery?: string;
  openStakeCard?: string | null;
}


export const StakingDashboard = ({ searchQuery = '', openStakeCard }: StakingDashboardProps) => {
  const { getTokenPrice, TOKEN_ADDRESSES } = useDexScreener();

  // Filter pools based on search query
  let filteredPools = stakingPools.filter(pool => 
    pool.stakingToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.rewardToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {searchQuery && (
        <div className="text-center">
          <p className="text-sm text-primary">
            Showing {filteredPools.length} staking pool(s) matching &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Staking Pools */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredPools.map((pool) => (
          <StakingPool 
            key={pool.id} 
            pool={pool} 
            getTokenPrice={getTokenPrice} 
            TOKEN_ADDRESSES={TOKEN_ADDRESSES} 
            openStakeCard={openStakeCard}
          />
        ))}
      </div>
    </div>
  );
};
