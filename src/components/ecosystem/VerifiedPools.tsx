import React, { useState } from 'react';
import { CheckCircle, Search, FileText } from 'lucide-react';
import { StakingCard } from '@/components/staking/StakingCard';
import { VerifiedFactoryCard } from './VerifiedFactoryCard';
import { VerifiedPoolApplicationForm } from './VerifiedPoolApplicationForm';
import { useDexScreener } from '@/hooks/useDexScreener';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

// Verified factory contract that has been reviewed and approved
const VERIFIED_FACTORY_CONTRACT = '0xF8143DF771920052151c2bbaA3cA2dE0955D46e6';

interface VerifiedPool {
  id: string;
  name: string;
  stakingToken: string;
  rewardToken: string;
  stakingTokenLogo: string;
  rewardTokenLogo: string;
  poolType: 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA';
  stakingContract: string;
  tvlContract: string;
  description: string;
}

const verifiedPools: VerifiedPool[] = [
  {
    id: 'order-witch',
    name: 'ORDER/WITCH Pool',
    poolType: 'ORDER_WITCH',
    stakingToken: 'ORDER',
    rewardToken: 'WITCH',
    stakingTokenLogo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    rewardTokenLogo: '/assets/witch.png',
    stakingContract: CONTRACT_ADDRESSES.staking.ORDER_WITCH,
    tvlContract: CONTRACT_ADDRESSES.staking.ORDER_WITCH,
    description: 'Community token - legitimacy verified through team communication'
  },
  {
    id: 'order-koksal',
    name: 'ORDER/KOKSAL Pool',
    poolType: 'ORDER_KOKSAL',
    stakingToken: 'ORDER',
    rewardToken: 'KOKSAL',
    stakingTokenLogo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    rewardTokenLogo: '/assets/koksal.png',
    stakingContract: CONTRACT_ADDRESSES.staking.ORDER_KOKSAL,
    tvlContract: CONTRACT_ADDRESSES.staking.ORDER_KOKSAL,
    description: 'Community token - legitimacy verified through team communication'
  },
  {
    id: 'order-stank',
    name: 'ORDER/STANK Pool',
    poolType: 'ORDER_STANK',
    stakingToken: 'ORDER',
    rewardToken: 'STANK',
    stakingTokenLogo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    rewardTokenLogo: '/assets/stank.png',
    stakingContract: CONTRACT_ADDRESSES.staking.ORDER_STANK,
    tvlContract: CONTRACT_ADDRESSES.staking.ORDER_STANK,
    description: 'Community token - legitimacy verified through team communication'
  }
];

// Export total count for tab display
export const VERIFIED_POOLS_COUNT = verifiedPools.length + 1; // +1 for verified factory contract

export const VerifiedPools: React.FC = () => {
  const { getTokenPrice, TOKEN_ADDRESSES } = useDexScreener();
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);

  // Filter pools based on search query
  const filteredPools = verifiedPools.filter(pool => 
    pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.stakingToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.rewardToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.poolType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if factory pool should be shown
  const showFactoryPool = searchQuery === '' || 
    'ayne'.includes(searchQuery.toLowerCase()) ||
    'order'.includes(searchQuery.toLowerCase()) ||
    'factory'.includes(searchQuery.toLowerCase()) ||
    'thememetist'.includes(searchQuery.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-blue-400">Verified Pools</h2>
              <p className="text-text-secondary">Community pools reviewed by Order Protocol team for legitimacy</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search pools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-surface-primary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:border-blue-400 focus:outline-none min-w-[250px]"
              />
            </div>

            {/* Apply Button */}
            <button
              onClick={() => setIsApplicationFormOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-lg text-background-primary font-semibold hover:shadow-glow transition-all whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              Apply for Verification
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-400" />
            <span className="text-text-secondary">Team Communication Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-400" />
            <span className="text-text-secondary">Token Legitimacy Checked</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-400" />
            <span className="text-text-secondary">Community Approved</span>
          </div>
        </div>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Verified Factory Contract - Show if matches search */}
        {showFactoryPool && (
          <VerifiedFactoryCard 
            poolAddress={VERIFIED_FACTORY_CONTRACT}
            creator={{
              username: 'thememetist',
              profileImage: 'https://static.starsarena.com/uploads/08a88d72-a23f-ac94-f145-31c0edc386e61750124536166.png',
              arenaHandle: 'thememetist'
            }}
            tokens={{
              staking: {
                logo: 'https://static.starsarena.com/uploads/201b59de-9e2e-e9c0-8724-06f8295640951749078553045.jpeg',
                communityUrl: 'https://arena.social/community/0xeA325Ccc2b98DD04d947a9E68C27C8daE6ad0F7E'
              },
              reward: {
                logo: 'https://static.starsarena.com/uploads/a99c28dd-fd47-42da-b424-8e59a3f33aa11746667360123.jpeg',
                communityUrl: 'https://arena.social/community/PyramidLiquidity'
              }
            }}
          />
        )}

        {/* Order Partnership Pools - Filtered */}
        {filteredPools.map((pool) => (
          <div key={pool.id} className="relative">
            {/* Verified Badge */}
            <div className="absolute -top-2 -right-2 z-10 bg-blue-500 text-white rounded-full p-2 shadow-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
            
            {/* Staking Card */}
            <div className="border-2 border-blue-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
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
                openStakeCard={null}
              />
            </div>
          </div>
        ))}
      </div>

      {/* No Results Message */}
      {searchQuery && !showFactoryPool && filteredPools.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">No pools found</h3>
          <p className="text-text-tertiary">
            No verified pools match your search "{searchQuery}". Try searching for ORDER, WITCH, KOKSAL, STANK, or AYNE.
          </p>
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-surface-secondary border border-border-primary rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary">
            <p className="font-medium text-text-primary mb-1">About Verified Pools</p>
            <p>
              Verified pools contain tokens from teams who have contacted Order Protocol directly. 
              We have verified team legitimacy and token authenticity but this does not constitute financial advice. 
              Always DYOR before participating in any staking pool.
            </p>
          </div>
        </div>
      </div>

      {/* Application Form Modal */}
      <VerifiedPoolApplicationForm 
        isOpen={isApplicationFormOpen}
        onClose={() => setIsApplicationFormOpen(false)}
      />
    </div>
  );
};