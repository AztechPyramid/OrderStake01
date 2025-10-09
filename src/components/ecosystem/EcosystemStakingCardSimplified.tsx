'use client';

import React, { useState, useEffect } from 'react';
import { useEcosystemStakingGitHub } from '@/hooks/useEcosystemStakingGitHub';
import { useEcosystemStaking } from '@/hooks/useEcosystemStaking';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useSearchContext } from '@/contexts/SearchContext';
import { Loader2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
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
  
  // GitHub hook for basic pool data
  const {
    poolData,
    userInfo: githubUserInfo,
    stakingTokenBalance,
    stakingTokenAllowance,
    isLoading: githubLoading,
    error: githubError,
    isConnected,
    refreshData
  } = useEcosystemStakingGitHub(poolAddress);

  // Ecosystem hook for staking operations
  const {
    poolData: stakingPoolData,
    poolMetadata,
    poolStats,
    userInfo: stakingUserInfo,
    stakingTokenBalance: stakingBalance,
    stakingTokenAllowance: stakingAllowance,
    isLoading: stakingLoading,
    error: stakingError,
    isConnected: stakingConnected,
    address,
    fetchUserInfo,
    fetchTokenInfo,
    approveStakingToken,
    stake,
    unstake,
    claimRewards
  } = useEcosystemStaking(poolAddress);

  // Get creator profile information
  const { profile: creatorProfile, isLoading: profileLoading } = useCreatorProfile(poolData?.creatorProfile.address);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake' | 'claim'>('stake');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Update search context when data is available
  useEffect(() => {
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

  // Clear inputs when card collapses
  useEffect(() => {
    if (!isExpanded) {
      setStakeAmount('');
      setUnstakeAmount('');
      setActiveTab('stake');
      setCopiedAddress(null);
    }
  }, [isExpanded]);

  // Refresh user data when card expands
  useEffect(() => {
    if (isExpanded && stakingConnected && address && stakingPoolData) {
      fetchUserInfo();
      fetchTokenInfo();
    }
  }, [isExpanded, stakingConnected, address, stakingPoolData]);

  // Copy address to clipboard function
  const copyToClipboard = async (address: string, type?: string) => {
    try {
      await navigator.clipboard.writeText(address);
      if (type) {
        setCopiedAddress(type);
        setTimeout(() => setCopiedAddress(null), 2000);
      } else {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  // Use github user info for basic display, staking user info for detailed operations
  const userInfo = isExpanded && stakingUserInfo ? stakingUserInfo : githubUserInfo;
  const isLoading = githubLoading || stakingLoading;
  const error = githubError || stakingError;
  
  // Staking operations handlers
  const needsApproval = Number(stakingAllowance || stakingTokenAllowance) < Number(stakeAmount);

  const handleStake = async () => {
    if (!stakeAmount || Number(stakeAmount) <= 0) return;
    const success = await stake(stakeAmount);
    if (success) {
      setStakeAmount('');
      refreshData(); // Refresh github data as well
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || Number(unstakeAmount) <= 0) return;
    const success = await unstake(unstakeAmount);
    if (success) {
      setUnstakeAmount('');
      refreshData(); // Refresh github data as well
    }
  };

  const handleClaim = async () => {
    const success = await claimRewards();
    if (success) {
      refreshData(); // Refresh github data as well
    }
  };

  const handleApprove = async () => {
    await approveStakingToken();
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

        {/* Click to expand indicator */}
        <div className="flex items-center justify-between pt-4 border-t border-border-primary">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{isExpanded ? 'Click to collapse' : 'Click to expand & interact'}</span>
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

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-border-primary space-y-4">
            {/* Pool Description */}
            {poolMetadata?.poolDescription && (
              <div className="p-4 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30 rounded-lg">
                <p className="text-sm text-text-primary leading-relaxed break-words overflow-wrap-anywhere">
                  {poolMetadata.poolDescription}
                </p>
              </div>
            )}

            {/* Extended Pool Stats */}
            {(poolStats || stakingPoolData) && (
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-surface-secondary rounded-lg p-4">
                  <p className="text-sm text-text-tertiary mb-1">Remaining Rewards</p>
                  <p className="text-xl font-bold text-accent-primary">
                    {poolStats?.remainingRewards 
                      ? Number(poolStats.remainingRewards).toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : 'Loading...'
                    }
                  </p>
                  {poolMetadata?.rewardSymbol && (
                    <p className="text-xs text-text-tertiary">{poolMetadata.rewardSymbol}</p>
                  )}
                </div>
              </div>
            )}

            {/* Time Information */}
            {poolStats && (poolStats.startDate || poolStats.endDate) && (
              <div className="p-4 bg-surface-secondary rounded-lg">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {poolStats.startDate && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Start:</span>
                      <span className="text-text-primary">{poolStats.startDate.toLocaleString()}</span>
                    </div>
                  )}
                  {poolStats.endDate && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">End:</span>
                      <span className="text-text-primary">{poolStats.endDate.toLocaleString()}</span>
                    </div>
                  )}
                  {!poolStats.hasEnded && poolStats.timeRemaining && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Time Left:</span>
                      <span className="text-accent-primary font-medium">{poolStats.timeRemaining}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed User Position */}
            {stakingConnected && stakingUserInfo && (
              <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-lg p-4 border border-accent-primary/30">
                <h3 className="text-lg font-semibold text-text-primary mb-3">Your Position</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Your Stake</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {Number(stakingUserInfo.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                    {poolMetadata?.stakingSymbol && (
                      <p className="text-xs text-text-tertiary">{poolMetadata.stakingSymbol}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary mb-1">Pending Rewards</p>
                    <p className="text-lg font-semibold text-accent-primary">
                      {Number(stakingUserInfo.pendingRewards).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </p>
                    {poolMetadata?.rewardSymbol && (
                      <p className="text-xs text-text-tertiary">{poolMetadata.rewardSymbol}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Staking Actions */}
            {stakingConnected && (
              <div>
                {/* Action Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('stake');
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                      activeTab === 'stake'
                        ? 'bg-accent-primary text-white'
                        : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Stake
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('unstake');
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                      activeTab === 'unstake'
                        ? 'bg-accent-primary text-white'
                        : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Unstake
                  </button>
                  {stakingUserInfo && Number(stakingUserInfo.pendingRewards) > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('claim');
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                        activeTab === 'claim'
                          ? 'bg-accent-primary text-white'
                          : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Claim
                    </button>
                  )}
                </div>

                {/* Stake Tab */}
                {activeTab === 'stake' && (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm text-text-secondary">Amount to Stake</label>
                        <span className="text-xs text-text-tertiary">
                          Balance: {Number(stakingBalance || stakingTokenBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0.0"
                        className="w-full bg-surface-secondary border border-border-primary rounded-lg px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 text-sm"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStakeAmount(stakingBalance || stakingTokenBalance);
                        }}
                        className="text-xs text-accent-primary hover:text-accent-secondary mt-1"
                      >
                        MAX
                      </button>
                    </div>

                    {needsApproval ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove();
                        }}
                        disabled={stakingLoading || !stakeAmount || Number(stakeAmount) <= 0}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {stakingLoading ? (
                          <span className="flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Approving...
                          </span>
                        ) : (
                          'Approve Token'
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStake();
                        }}
                        disabled={stakingLoading || !stakeAmount || Number(stakeAmount) <= 0 || Number(stakeAmount) > Number(stakingBalance || stakingTokenBalance)}
                        className="w-full bg-accent-primary hover:bg-accent-secondary text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {stakingLoading ? (
                          <span className="flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Staking...
                          </span>
                        ) : (
                          'Stake'
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Unstake Tab */}
                {activeTab === 'unstake' && stakingUserInfo && (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm text-text-secondary">Amount to Unstake</label>
                        <span className="text-xs text-text-tertiary">
                          Staked: {Number(stakingUserInfo.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0.0"
                        className="w-full bg-surface-secondary border border-border-primary rounded-lg px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 text-sm"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnstakeAmount(stakingUserInfo.stakedAmount);
                        }}
                        className="text-xs text-accent-primary hover:text-accent-secondary mt-1"
                      >
                        MAX
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnstake();
                      }}
                      disabled={stakingLoading || !unstakeAmount || Number(unstakeAmount) <= 0 || Number(unstakeAmount) > Number(stakingUserInfo.stakedAmount)}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {stakingLoading ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Unstaking...
                        </span>
                      ) : (
                        'Unstake'
                      )}
                    </button>
                  </div>
                )}

                {/* Claim Tab */}
                {activeTab === 'claim' && stakingUserInfo && Number(stakingUserInfo.pendingRewards) > 0 && (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-3">
                      <p className="text-sm text-text-secondary mb-2">Available Rewards</p>
                      <p className="text-xl font-bold text-green-400">
                        {Number(stakingUserInfo.pendingRewards).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </p>
                      {poolMetadata?.rewardSymbol && (
                        <p className="text-xs text-text-tertiary">{poolMetadata.rewardSymbol}</p>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaim();
                      }}
                      disabled={stakingLoading}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {stakingLoading ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Claiming...
                        </span>
                      ) : (
                        'Claim Rewards'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!stakingConnected && (
              <div className="text-center py-6">
                <p className="text-text-secondary mb-4">Connect your wallet to interact with this pool</p>
              </div>
            )}

            {/* Contract Information */}
            <div className="pt-4 border-t border-border-primary space-y-3" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-sm font-semibold text-text-secondary mb-3">Contract Information</h4>
              
              {/* Pool Contract Address */}
              <div className="bg-surface-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-tertiary">Pool Contract</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(poolAddress, 'pool');
                    }}
                    className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-secondary transition-colors"
                  >
                    {copiedAddress === 'pool' ? (
                      <span className="text-green-400">✓ Copied!</span>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-mono text-text-primary break-all">{poolAddress}</p>
              </div>

              {/* Staking Token Address */}
              {(stakingPoolData || poolData?.poolData) && (
                <div className="bg-surface-secondary rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {poolMetadata?.stakingLogo && (
                        <img 
                          src={poolMetadata.stakingLogo} 
                          alt={poolMetadata.stakingSymbol || 'Staking Token'} 
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-xs text-text-tertiary">
                        Stake Token {poolMetadata?.stakingSymbol && `(${poolMetadata.stakingSymbol})`}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard((stakingPoolData || poolData?.poolData)?.stakingToken, 'staking');
                      }}
                      className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-secondary transition-colors"
                    >
                      {copiedAddress === 'staking' ? (
                        <span className="text-green-400">✓ Copied!</span>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-text-primary break-all">{(stakingPoolData || poolData?.poolData)?.stakingToken}</p>
                </div>
              )}

              {/* Reward Token Address */}
              {(stakingPoolData || poolData?.poolData) && (
                <div className="bg-surface-secondary rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {poolMetadata?.rewardLogo && (
                        <img 
                          src={poolMetadata.rewardLogo} 
                          alt={poolMetadata.rewardSymbol || 'Reward Token'} 
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-xs text-text-tertiary">
                        Reward Token {poolMetadata?.rewardSymbol && `(${poolMetadata.rewardSymbol})`}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard((stakingPoolData || poolData?.poolData)?.rewardToken, 'reward');
                      }}
                      className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-secondary transition-colors"
                    >
                      {copiedAddress === 'reward' ? (
                        <span className="text-green-400">✓ Copied!</span>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-text-primary break-all">{(stakingPoolData || poolData?.poolData)?.rewardToken}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};