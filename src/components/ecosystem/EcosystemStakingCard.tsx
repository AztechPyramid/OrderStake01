'use client';

import React, { useState } from 'react';
import { useEcosystemStaking } from '@/hooks/useEcosystemStaking';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useSearchContext } from '@/contexts/SearchContext';
import { Loader2, User, Copy } from 'lucide-react';

interface EcosystemStakingCardProps {
  poolAddress: string;
  poolName?: string;
}

export const EcosystemStakingCard: React.FC<EcosystemStakingCardProps> = ({ 
  poolAddress, 
  poolName: initialPoolName = 'Staking Pool'
}) => {
  const { updatePoolSearchData } = useSearchContext();
  const {
    poolData,
    poolMetadata,
    poolStats,
    userInfo,
    stakingTokenBalance,
    stakingTokenAllowance,
    isLoading,
    error,
    isConnected,
    address,
    isInArena,
    fetchUserInfo,
    fetchTokenInfo,
    fetchPoolData,
    setError,
    approveStakingToken,
    stake,
    unstake,
    claimRewards
  } = useEcosystemStaking(poolAddress);

  // Get creator profile information
  const { profile: creatorProfile, isLoading: profileLoading } = useCreatorProfile(poolData?.creator);

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Update search context when data is available
  React.useEffect(() => {
    if (poolMetadata || creatorProfile || poolData?.creator) {
      updatePoolSearchData(poolAddress, {
        poolName: poolMetadata?.poolName,
        stakingSymbol: poolMetadata?.stakingSymbol,
        rewardSymbol: poolMetadata?.rewardSymbol,
        creatorUsername: creatorProfile?.username,
        creatorDisplayName: creatorProfile?.displayName,
        creatorAddress: poolData?.creator
      });
    }
  }, [poolAddress, poolMetadata, creatorProfile, poolData?.creator, updatePoolSearchData]);

  // Refresh user data when component becomes visible or wallet connects
  React.useEffect(() => {
    if (isConnected && address && poolData) {
      // Refresh user info and balance when page is revisited
      fetchUserInfo();
      fetchTokenInfo();
    }
  }, [isConnected, address, poolData]); // Intentionally not including fetch functions to avoid loops

  // Refresh data when page becomes visible (tab switching, navigation back)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isConnected && address && poolData) {
        console.log('🔄 Page visible, refreshing user data...');
        fetchUserInfo();
        fetchTokenInfo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh on window focus (when user returns to browser tab)
    const handleFocus = () => {
      if (isConnected && address && poolData) {
        console.log('🔄 Window focused, refreshing user data...');
        fetchUserInfo();
        fetchTokenInfo();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isConnected, address, poolData, fetchUserInfo, fetchTokenInfo]);

  const needsApproval = Number(stakingTokenAllowance) < Number(stakeAmount);

  // Copy address to clipboard function
  const copyToClipboard = async (address: string, type: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(type);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || Number(stakeAmount) <= 0) return;
    const success = await stake(stakeAmount);
    if (success) {
      setStakeAmount('');
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || Number(unstakeAmount) <= 0) return;
    const success = await unstake(unstakeAmount);
    if (success) {
      setUnstakeAmount('');
    }
  };

  const handleClaim = async () => {
    await claimRewards();
  };

  const handleApprove = async () => {
    await approveStakingToken();
  };

  if (isLoading || !poolData) {
    return (
      <div className="bg-gradient-surface border border-border-primary rounded-xl p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
          <span className="ml-2 text-text-secondary">Loading pool data...</span>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400 whitespace-pre-line">{error}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setError(null);
                  fetchPoolData();
                }}
                className="text-xs text-accent-primary hover:text-accent-secondary border border-accent-primary/30 px-3 py-1 rounded transition-colors"
              >
                Try Again
              </button>
              {error.includes('Wrong network') && (
                <button
                  onClick={async () => {
                    try {
                      // Request to switch to Avalanche
                      await window.ethereum?.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xa86a' }], // 43114 in hex
                      });
                    } catch (switchError: any) {
                      console.error('Failed to switch network:', switchError);
                    }
                  }}
                  className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-400/30 px-3 py-1 rounded transition-colors"
                >
                  Switch to Avalanche
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const poolName = poolMetadata?.poolName || initialPoolName;
  // Removed isActive check - always show as active for factory pools
  const hasEnded = poolStats?.hasEnded || false;

  return (
    <div className="bg-gradient-surface border border-border-primary rounded-xl p-6 shadow-card hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {poolMetadata?.stakingLogo && (
                <img 
                  src={poolMetadata.stakingLogo} 
                  alt={poolMetadata.stakingSymbol || 'Staking Token'} 
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              {poolMetadata?.rewardLogo && (
                <img 
                  src={poolMetadata.rewardLogo} 
                  alt={poolMetadata.rewardSymbol || 'Reward Token'} 
                  className="w-8 h-8 rounded-full object-cover -ml-3 border-2 border-surface-primary"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>
            <h3 className="text-xl font-bold text-text-primary">{poolName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              🟢 Active
            </span>
            {!isInArena && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" title="Using Avalanche RPC (outside Arena environment)">
                🌐 External
              </span>
            )}
          </div>
        </div>
        
        {/* Pool Description */}
        {poolMetadata?.poolDescription && (
          <div className="mt-3 p-4 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30 rounded-lg">
            <p className="text-sm text-text-primary leading-relaxed break-words overflow-wrap-anywhere">{poolMetadata.poolDescription}</p>
          </div>
        )}
        
        {/* Creator Info */}
        {creatorProfile && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-surface-secondary rounded-lg">
            <img 
              src={creatorProfile.avatar} 
              alt={creatorProfile.username}
              className="w-6 h-6 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${poolData?.creator}`;
              }}
            />
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-tertiary">Created by</span>
              {creatorProfile.userHandle ? (
                // Arena user - show username
                <span className="text-xs font-medium text-accent-primary">
                  @{creatorProfile.username}
                </span>
              ) : (
                // Non-Arena user - show full address with copy functionality
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(poolData?.creator || '');
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy:', err);
                      }
                    }}
                    className="text-xs font-medium text-accent-primary hover:text-accent-secondary cursor-pointer transition-colors flex items-center gap-1 group"
                    title="Click to copy address"
                  >
                    <span className="font-mono">{poolData?.creator}</span>
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  {isCopied && (
                    <span className="text-xs text-green-400 animate-fade-in">Copied!</span>
                  )}
                </div>
              )}
              {creatorProfile.isVerified && (
                <span className="text-xs">✅</span>
              )}
            </div>
          </div>
        )}

        {poolMetadata && (
          <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
            <span>Stake: {poolMetadata.stakingSymbol}</span>
            <span>•</span>
            <span>Earn: {poolMetadata.rewardSymbol}</span>
          </div>
        )}
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="text-xs text-text-tertiary mb-1">Total Staked</p>
          <p className="text-lg font-bold text-text-primary">
            {Number(poolData.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          {poolMetadata?.stakingSymbol && (
            <p className="text-xs text-text-tertiary">{poolMetadata.stakingSymbol}</p>
          )}
        </div>
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="text-xs text-text-tertiary mb-1">Reward/Block</p>
          <p className="text-lg font-bold text-accent-primary">
            {Number(poolData.rewardPerBlock).toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </p>
          {poolMetadata?.rewardSymbol && (
            <p className="text-xs text-text-tertiary">{poolMetadata.rewardSymbol}</p>
          )}
        </div>
      </div>

      {/* Extended Pool Stats */}
      {poolStats && (
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="bg-surface-secondary rounded-lg p-3">
            <p className="text-xs text-text-tertiary mb-1">Remaining Rewards</p>
            <p className="text-lg font-bold text-accent-primary">
              {Number(poolStats.remainingRewards).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            {poolMetadata?.rewardSymbol && (
              <p className="text-xs text-text-tertiary">{poolMetadata.rewardSymbol}</p>
            )}
          </div>
        </div>
      )}

      {/* Time Information */}
      {poolStats && (poolStats.startDate || poolStats.endDate) && (
        <div className="mb-6 p-3 bg-surface-secondary rounded-lg">
          <div className="grid grid-cols-1 gap-2 text-sm">
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

      {/* User Info */}
      {isConnected && userInfo && (
        <div className="bg-surface-secondary rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-tertiary mb-1">Your Stake</p>
              <p className="text-base font-semibold text-text-primary">
                {Number(userInfo.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Pending Rewards</p>
              <p className="text-base font-semibold text-accent-primary">
                {Number(userInfo.pendingRewards).toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </p>
            </div>
          </div>
          {Number(userInfo.pendingRewards) > 0 && (
            <button
              onClick={handleClaim}
              disabled={isLoading}
              className="w-full mt-4 bg-accent-primary hover:bg-accent-secondary text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Claiming...
                </span>
              ) : (
                'Claim Rewards'
              )}
            </button>
          )}
        </div>
      )}

      {/* Actions - Always show for connected users */}
      {isConnected && (
        <div>
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('stake')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'stake'
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              Stake
            </button>
            <button
              onClick={() => setActiveTab('unstake')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'unstake'
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              Unstake
            </button>
          </div>

          {/* Stake Tab */}
          {activeTab === 'stake' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-text-secondary">Amount to Stake</label>
                  <span className="text-xs text-text-tertiary">
                    Balance: {Number(stakingTokenBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                </div>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                />
                <button
                  onClick={() => setStakeAmount(stakingTokenBalance)}
                  className="text-xs text-accent-primary hover:text-accent-secondary mt-1"
                >
                  MAX
                </button>
              </div>

              {needsApproval ? (
                <button
                  onClick={handleApprove}
                  disabled={isLoading || !stakeAmount || Number(stakeAmount) <= 0}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
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
                  onClick={handleStake}
                  disabled={isLoading || !stakeAmount || Number(stakeAmount) <= 0 || Number(stakeAmount) > Number(stakingTokenBalance)}
                  className="w-full bg-accent-primary hover:bg-accent-secondary text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
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
          {activeTab === 'unstake' && userInfo && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-text-secondary">Amount to Unstake</label>
                  <span className="text-xs text-text-tertiary">
                    Staked: {Number(userInfo.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                </div>
                <input
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                />
                <button
                  onClick={() => setUnstakeAmount(userInfo.stakedAmount)}
                  className="text-xs text-accent-primary hover:text-accent-secondary mt-1"
                >
                  MAX
                </button>
              </div>

              <button
                onClick={handleUnstake}
                disabled={isLoading || !unstakeAmount || Number(unstakeAmount) <= 0 || Number(unstakeAmount) > Number(userInfo.stakedAmount)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
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
        </div>
      )}

      {!isConnected && (
        <div className="text-center py-4">
          <p className="text-text-secondary">Connect your wallet to interact</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Contract and Token Addresses */}
      <div className="mt-6 pt-6 border-t border-border-primary space-y-3">
        <h4 className="text-sm font-semibold text-text-secondary mb-3">Contract Information</h4>
        
        {/* Pool Contract Address */}
        <div className="bg-surface-secondary rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-tertiary">Pool Contract</span>
            <button
              onClick={() => copyToClipboard(poolAddress, 'pool')}
              className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-secondary transition-colors"
            >
              {copiedAddress === 'pool' ? (
                <>
                  <span className="text-green-400">✓ Copied!</span>
                </>
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
        {poolData && (
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
                onClick={() => copyToClipboard(poolData.stakingToken, 'staking')}
                className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-secondary transition-colors"
              >
                {copiedAddress === 'staking' ? (
                  <>
                    <span className="text-green-400">✓ Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs font-mono text-text-primary break-all">{poolData.stakingToken}</p>
          </div>
        )}

        {/* Reward Token Address */}
        {poolData && (
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
                onClick={() => copyToClipboard(poolData.rewardToken, 'reward')}
                className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-secondary transition-colors"
              >
                {copiedAddress === 'reward' ? (
                  <>
                    <span className="text-green-400">✓ Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs font-mono text-text-primary break-all">{poolData.rewardToken}</p>
          </div>
        )}
      </div>
    </div>
  );
};
