'use client';

import React, { useState } from 'react';
import { useEcosystemStakingGitHub } from '@/hooks/useEcosystemStakingGitHub';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useSearchContext } from '@/contexts/SearchContext';
import { Loader2, Copy, ExternalLink } from 'lucide-react';
import { EcosystemPoolModal } from './EcosystemPoolModal';
import { ethers } from 'ethers';

interface EcosystemStakingCardSimplifiedProps {
  poolAddress: string;
  poolName?: string;
}

export const EcosystemStakingCardSimplified: React.FC<EcosystemStakingCardSimplifiedProps> = ({ 
  poolAddress, 
  poolName: initialPoolName = 'Staking Pool'
}) => {
  const { updatePoolSearchData } = useSearchContext();
  const {
    poolData,
    userInfo,
    stakingTokenBalance,
    stakingTokenAllowance,
    isLoading,
    error,
    isConnected,
    refreshData
  } = useEcosystemStakingGitHub(poolAddress);

  // Get creator profile information
  const { profile: creatorProfile, isLoading: profileLoading } = useCreatorProfile(poolData?.creatorProfile.address);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Update search context when data is available
  React.useEffect(() => {
    if (poolData?.poolMetadata || creatorProfile || poolData?.creatorProfile.address) {
      updatePoolSearchData(poolAddress, {
        poolName: poolData?.poolMetadata?.poolName,
        stakingSymbol: poolData?.poolMetadata?.stakingSymbol,
        rewardSymbol: poolData?.poolMetadata?.rewardSymbol,
        creatorUsername: creatorProfile?.username,
        creatorDisplayName: creatorProfile?.displayName,
        creatorAddress: poolData?.creatorProfile.address
      });
    }
  }, [poolAddress, poolData?.poolMetadata, creatorProfile, poolData?.creatorProfile.address, updatePoolSearchData]);

  // Copy address to clipboard function
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  if (!poolData) {
    return (
      <div className="bg-gradient-surface border border-border-primary rounded-xl p-6 animate-pulse">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
        </div>
      </div>
    );
  }

  const poolName = poolData?.poolMetadata?.poolName || initialPoolName;
  const hasUserStake = userInfo && Number(userInfo.stakedAmount) > 0;
  const hasPendingRewards = userInfo && Number(userInfo.pendingRewards) > 0;

  return (
    <>
      {/* Simplified Card - Clickable */}
      <div 
        onClick={handleCardClick}
        className="bg-gradient-surface border border-border-primary rounded-xl p-6 shadow-card hover:shadow-lg hover:border-accent-primary/50 transition-all duration-200 cursor-pointer group"
      >
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {poolData?.poolMetadata?.stakingLogo && (
                  <img 
                    src={poolData.poolMetadata.stakingLogo} 
                    alt={poolData.poolMetadata.stakingSymbol || 'Staking Token'} 
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {poolData?.poolMetadata?.rewardLogo && (
                  <img 
                    src={poolData.poolMetadata.rewardLogo} 
                    alt={poolData.poolMetadata.rewardSymbol || 'Reward Token'} 
                    className="w-8 h-8 rounded-full object-cover -ml-3 border-2 border-surface-primary"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <h3 className="text-lg font-bold text-text-primary truncate group-hover:text-accent-primary transition-colors">
                {poolName}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              🟢 Active
            </span>
          </div>
          
          {/* Creator Info */}
          {creatorProfile && (
            <div className="flex items-center gap-2 p-2 bg-surface-secondary rounded-lg">
              <img 
                src={creatorProfile.avatar} 
                alt={creatorProfile.username}
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${poolData?.creatorProfile.address}`;
                }}
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-tertiary">by</span>
                {creatorProfile.userHandle ? (
                  <span className="text-xs font-medium text-accent-primary">
                    @{creatorProfile.username}
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(poolData?.creatorProfile.address || '');
                    }}
                    className="text-xs font-medium text-accent-primary hover:text-accent-secondary cursor-pointer transition-colors flex items-center gap-1 group/copy"
                    title="Click to copy address"
                  >
                    <span className="font-mono">
                      {poolData?.creatorProfile.address ? `${poolData.creatorProfile.address.slice(0, 6)}...${poolData.creatorProfile.address.slice(-4)}` : ''}
                    </span>
                    <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                  </button>
                )}
                {creatorProfile.isVerified && (
                  <span className="text-xs">✅</span>
                )}
                {isCopied && (
                  <span className="text-xs text-green-400 animate-fade-in">Copied!</span>
                )}
              </div>
            </div>
          )}

          {poolData?.poolMetadata && (
            <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
              <span>Stake: {poolData.poolMetadata.stakingSymbol}</span>
              <span>•</span>
              <span>Earn: {poolData.poolMetadata.rewardSymbol}</span>
            </div>
          )}
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-surface-secondary rounded-lg p-3">
            <p className="text-xs text-text-tertiary mb-1">Total Staked</p>
            <p className="text-base font-bold text-text-primary">
              {(() => {
                try {
                  const totalStaked = poolData?.poolData?.totalStaked || '0';
                  const decimals = poolData?.tokenInfo?.stakingToken?.decimals || 18;
                  const formatted = ethers.formatUnits(totalStaked, decimals);
                  return Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 });
                } catch (e) {
                  return '0';
                }
              })()}
            </p>
            {poolData?.poolMetadata?.stakingSymbol && (
              <p className="text-xs text-text-tertiary">{poolData.poolMetadata.stakingSymbol}</p>
            )}
          </div>
          <div className="bg-surface-secondary rounded-lg p-3">
            <p className="text-xs text-text-tertiary mb-1">Reward/Block</p>
            <p className="text-base font-bold text-accent-primary">
              {(() => {
                try {
                  const rewardPerBlock = poolData?.poolData?.rewardPerBlock || '0';
                  const decimals = poolData?.tokenInfo?.rewardToken?.decimals || 18;
                  const formatted = ethers.formatUnits(rewardPerBlock, decimals);
                  return Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 6 });
                } catch (e) {
                  return '0';
                }
              })()}
            </p>
            {poolData?.poolMetadata?.rewardSymbol && (
              <p className="text-xs text-text-tertiary">{poolData.poolMetadata.rewardSymbol}</p>
            )}
          </div>
        </div>

        {/* User Position (if has stake) */}
        {isConnected && hasUserStake && userInfo && (
          <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-lg p-3 mb-4 border border-accent-primary/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Your Stake</p>
                <p className="text-sm font-semibold text-text-primary">
                  {Number(userInfo.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Pending Rewards</p>
                <p className="text-sm font-semibold text-accent-primary">
                  {Number(userInfo.pendingRewards).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Click to view more indicator */}
        <div className="flex items-center justify-between pt-4 border-t border-border-primary">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <ExternalLink className="w-3 h-3" />
            <span>Click to view details & interact</span>
          </div>
          {hasUserStake && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse"></div>
              <span className="text-xs text-accent-primary font-medium">Active Position</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <EcosystemPoolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        poolAddress={poolAddress}
        poolName={poolName}
      />
    </>
  );
};