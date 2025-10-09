'use client';

import React, { useState, useEffect } from 'react';
import { useEcosystemStaking } from '@/hooks/useEcosystemStaking';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { Loader2, X, Copy } from 'lucide-react';

interface EcosystemPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolAddress: string;
  poolName?: string;
}

export const EcosystemPoolModal: React.FC<EcosystemPoolModalProps> = ({
  isOpen,
  onClose,
  poolAddress,
  poolName: initialPoolName = 'Staking Pool'
}) => {
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
    fetchUserInfo,
    fetchTokenInfo,
    approveStakingToken,
    stake,
    unstake,
    claimRewards
  } = useEcosystemStaking(poolAddress);

  // Get creator profile information
  const { profile: creatorProfile } = useCreatorProfile(poolData?.creator);

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake' | 'claim'>('stake');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Clear inputs when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStakeAmount('');
      setUnstakeAmount('');
      setActiveTab('stake');
      setCopiedAddress(null);
    }
  }, [isOpen]);

  // Refresh user data when modal opens
  useEffect(() => {
    if (isOpen && isConnected && address && poolData) {
      fetchUserInfo();
      fetchTokenInfo();
    }
  }, [isOpen, isConnected, address, poolData]);

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

  if (!isOpen) return null;

  const poolName = poolMetadata?.poolName || initialPoolName;
  const hasEnded = poolStats?.hasEnded || false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-surface-primary border border-border-primary rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
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
            <div>
              <h2 className="text-xl font-bold text-text-primary">{poolName}</h2>
              {poolMetadata && (
                <p className="text-sm text-text-tertiary">
                  Stake: {poolMetadata.stakingSymbol} • Earn: {poolMetadata.rewardSymbol}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!poolData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
            </div>
          ) : (
            <>
              {/* Pool Description */}
              {poolMetadata?.poolDescription && (
                <div className="mb-6 p-4 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30 rounded-lg">
                  <p className="text-sm text-text-primary leading-relaxed break-words overflow-wrap-anywhere">
                    {poolMetadata.poolDescription}
                  </p>
                </div>
              )}

              {/* Creator Info */}
              {creatorProfile && (
                <div className="flex items-center gap-2 mb-6 p-3 bg-surface-secondary rounded-lg">
                  <img 
                    src={creatorProfile.avatar} 
                    alt={creatorProfile.username}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${poolData?.creator}`;
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-tertiary">Created by</span>
                    {creatorProfile.userHandle ? (
                      <span className="text-sm font-medium text-accent-primary">
                        @{creatorProfile.username}
                      </span>
                    ) : (
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
                          className="text-sm font-medium text-accent-primary hover:text-accent-secondary cursor-pointer transition-colors flex items-center gap-1 group"
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
                      <span className="text-sm">✅</span>
                    )}
                  </div>
                </div>
              )}

              {/* Pool Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-secondary rounded-lg p-4">
                  <p className="text-sm text-text-tertiary mb-1">Total Staked</p>
                  <p className="text-xl font-bold text-text-primary">
                    {Number(poolData.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  {poolMetadata?.stakingSymbol && (
                    <p className="text-xs text-text-tertiary">{poolMetadata.stakingSymbol}</p>
                  )}
                </div>
                <div className="bg-surface-secondary rounded-lg p-4">
                  <p className="text-sm text-text-tertiary mb-1">Reward/Block</p>
                  <p className="text-xl font-bold text-accent-primary">
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
                  <div className="bg-surface-secondary rounded-lg p-4">
                    <p className="text-sm text-text-tertiary mb-1">Remaining Rewards</p>
                    <p className="text-xl font-bold text-accent-primary">
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
                <div className="mb-6 p-4 bg-surface-secondary rounded-lg">
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

              {/* User Info */}
              {isConnected && userInfo && (
                <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-lg p-4 mb-6 border border-accent-primary/30">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Your Position</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-text-tertiary mb-1">Your Stake</p>
                      <p className="text-lg font-semibold text-text-primary">
                        {Number(userInfo.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                      {poolMetadata?.stakingSymbol && (
                        <p className="text-xs text-text-tertiary">{poolMetadata.stakingSymbol}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary mb-1">Pending Rewards</p>
                      <p className="text-lg font-semibold text-accent-primary">
                        {Number(userInfo.pendingRewards).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </p>
                      {poolMetadata?.rewardSymbol && (
                        <p className="text-xs text-text-tertiary">{poolMetadata.rewardSymbol}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions - Connected Users */}
              {isConnected && (
                <div>
                  {/* Action Tabs */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setActiveTab('stake')}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        activeTab === 'stake'
                          ? 'bg-accent-primary text-white'
                          : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Stake
                    </button>
                    <button
                      onClick={() => setActiveTab('unstake')}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        activeTab === 'unstake'
                          ? 'bg-accent-primary text-white'
                          : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Unstake
                    </button>
                    {userInfo && Number(userInfo.pendingRewards) > 0 && (
                      <button
                        onClick={() => setActiveTab('claim')}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
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
                    <div className="space-y-4">
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
                    <div className="space-y-4">
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

                  {/* Claim Tab */}
                  {activeTab === 'claim' && userInfo && Number(userInfo.pendingRewards) > 0 && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-4">
                        <p className="text-sm text-text-secondary mb-2">Available Rewards</p>
                        <p className="text-2xl font-bold text-green-400">
                          {Number(userInfo.pendingRewards).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </p>
                        {poolMetadata?.rewardSymbol && (
                          <p className="text-xs text-text-tertiary">{poolMetadata.rewardSymbol}</p>
                        )}
                      </div>

                      <button
                        onClick={handleClaim}
                        disabled={isLoading}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </div>
                  )}
                </div>
              )}

              {!isConnected && (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">Connect your wallet to interact with this pool</p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Contract Information */}
              <div className="mt-8 pt-6 border-t border-border-primary space-y-3">
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
                          <span className="text-green-400">✓ Copied!</span>
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
                          <span className="text-green-400">✓ Copied!</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};