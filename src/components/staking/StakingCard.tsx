import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
// Copy to clipboard helper
const copyToClipboard = (text: string) => {
  if (navigator && navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};
import { PlatformCard } from '@/components/common/PlatformCard';
// Platform data (copy from PlatformsDashboard)
const platforms = [
  {
    title: 'OrderStake Global',
    description: 'Global version with external wallet support (MetaMask, WalletConnect, Coinbase).',
    url: 'https://externalwallet-orderstake.netlify.app/',
    logo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    category: 'Staking Platform',
    isNative: false
  },
  {
    title: 'WitchTarot Mystical',
    description: 'Mystical WITCH tarot readings and spiritual guidance with multiple spread options.',
    url: 'https://witchtarot.netlify.app/',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F2b4039e7-40aa-43f4-5328-be3b27fb90371746910733471.jpeg&w=96&q=75',
    category: 'Spiritual & Mystical',
    isNative: false
  },
  {
    title: 'StankApp NFT',
    description: 'Advanced STANK NFT collection platform with trading and portfolio management.',
    url: 'https://stanknftcollection.netlify.app/',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2Fe6746c46-5124-de74-f0e2-4ce94df1a3a71746580775916.jpeg&w=96&q=75',
    category: 'NFT Platform',
    isNative: false
  },
  {
    title: 'KoksalNFT Marketplace',
    description: 'Premium KOKSAL NFT marketplace with filtering, auctions, and collection management.',
    url: 'https://koksalnft.netlify.app/',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2Fbfa8b7d1-a4d1-4fa1-e276-32e4a8505b1c1753997742607.jpeg&w=96&q=75',
    category: 'NFT Marketplace',
    isNative: false
  },
  {
    title: 'OrderSlot Games',
    description: 'Interactive gaming platform with slot games and betting features.',
    url: 'https://orderslot.netlify.app/',
    logo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    category: 'Gaming Platform',
    isNative: false
  },
  {
    title: 'RangeOrder Analytics',
    description: 'Advanced trading analytics and range order management tools.',
    url: 'https://rangeorder.netlify.app/',
    logo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    category: 'Analytics Platform',
    isNative: false
  }
];
import SuccessPopup from './SuccessPopup';
import { formatNumber, formatUSD, formatCompactNumber } from '@/utils/formatters';
import { StakingModal } from './StakingModal';
import { useArenaSDK } from '@/hooks/useArenaSDK';
import { usePoolData } from '@/hooks/usePoolData';
import { useStakingContract } from '@/hooks/useStakingContract';
import { useDexScreener } from '@/hooks/useDexScreener';
import { XOrderLogo } from '@/components/common/XOrderLogo';

interface StakingCardProps {
  stakingToken: string;
  rewardToken: string;
  stakingTokenLogo: string;
  rewardTokenLogo: string;
  stakingContract: string;
  tvlContract: string;
  poolType: 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA';
  getTokenPrice: (address: string) => number;
  TOKEN_ADDRESSES: Record<string, string>;
  openStakeCard?: string | null;
}

export const StakingCard = ({
  stakingToken,
  rewardToken,
  stakingTokenLogo,
  rewardTokenLogo,
  stakingContract,
  tvlContract,
  poolType,
  getTokenPrice,
  TOKEN_ADDRESSES,
  openStakeCard
}: StakingCardProps) => {
  // For USD values, use live prices from useDexScreener
  const { getTokenPrice: getLiveTokenPrice, TOKEN_ADDRESSES: LIVE_TOKEN_ADDRESSES } = useDexScreener();
  const [isExpanded, setIsExpanded] = useState(false);
  const [modalType, setModalType] = useState<'stake' | 'unstake' | 'claim' | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successType, setSuccessType] = useState<'stake' | 'unstake' | 'claim'>('stake');
  const [showSwapGuidePopup, setShowSwapGuidePopup] = useState(false);
  // For claim popup, show the correct logo
  const rewardLogos: Record<string, string> = {
    ORDER: '/order-logo.jpg',
    WITCH: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F2b4039e7-40aa-43f4-5328-be3b27fb90371746910733471.jpeg&w=96&q=75',
    KOKSAL: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2Fbfa8b7d1-a4d1-4fa1-e276-32e4a8505b1c1753997742607.jpeg&w=96&q=75',
    STANK: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2Fe6746c46-5124-de74-f0e2-4ce94df1a3a71746580775916.jpeg&w=96&q=75',
    xORDER: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    xARENA: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F3c461417-92b8-04bb-841c-945306c77c2b1749435408088.jpeg&w=96&q=75',
  };
  const [pendingSuccessType, setPendingSuccessType] = useState<null | 'stake' | 'unstake' | 'claim'>(null);
  const arenaData = useArenaSDK();
  const poolData = usePoolData(poolType);
  const stakingData = useStakingContract(poolType);

  // End times for each poolType
  const END_TIMES: Record<string, string> = {
    ORDER_KOKSAL: '2025-09-01 00:00:25',
    ORDER_STANK: '2030-12-25 00:00:22',
    ORDER_WITCH: '2030-03-20 05:17:52',
    ORDER_ORDER: '2030-01-19 06:20:27',
    ORDER_xORDER: '2098-12-31 19:00:00',
    ORDER_xARENA: '2098-12-31 19:00:00',
  };

  // Get end time for this pool
  const endTimeStr = END_TIMES[poolType];
  const endTime = endTimeStr ? new Date(endTimeStr.replace(' ', 'T') + 'Z') : null;
  const [remainingTime, setRemainingTime] = useState('');

  // Update countdown every second with years, months, weeks, days, hours, minutes, seconds
  useEffect(() => {
    if (!endTime) return;
    const update = () => {
      const now = new Date();
      let diff = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      let years = Math.floor(diff / (365 * 24 * 3600));
      diff %= 365 * 24 * 3600;
      let months = Math.floor(diff / (30 * 24 * 3600));
      diff %= 30 * 24 * 3600;
      let weeks = Math.floor(diff / (7 * 24 * 3600));
      diff %= 7 * 24 * 3600;
      let days = Math.floor(diff / 86400);
      diff %= 86400;
      let hours = Math.floor(diff / 3600);
      diff %= 3600;
      let minutes = Math.floor(diff / 60);
      let seconds = diff % 60;
      let str = '';
      if (years > 0) str += `${years}y `;
      if (months > 0) str += `${months}mo `;
      if (weeks > 0) str += `${weeks}w `;
      if (days > 0) str += `${days}d `;
      if (years > 0 || months > 0 || weeks > 0 || days > 0 || hours > 0) str += `${hours}h `;
      if (years > 0 || months > 0 || weeks > 0 || days > 0 || hours > 0 || minutes > 0) str += `${minutes}m `;
      str += `${seconds}s`;
      setRemainingTime(str.trim());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTimeStr]);

  // Show Unstake/Claim buttons when user is connected AND not loading
  const showUnstakeClaimButtons = arenaData?.isConnected && !arenaData?.isLoading && arenaData?.address;
  
  // Enhanced debugging for button visibility
  console.log(`🎯 StakingCard Debug for ${poolType}:`, {
    arenaConnected: arenaData?.isConnected,
    arenaLoading: arenaData?.isLoading,
    arenaAddress: arenaData?.address,
    showButtons: showUnstakeClaimButtons,
    tvlAmount: poolData.tvlOrderAmount,
    userStaked: poolData.userStaked,
    remainingBalance: stakingData.remainingBalance,
    // Additional context
    poolDataLoaded: !!poolData,
    stakingDataLoaded: !!stakingData,
    bothDataLoaded: !!(poolData && stakingData),
    walletState: {
      connected: arenaData?.isConnected,
      loading: arenaData?.isLoading,
      hasAddress: !!arenaData?.address
    }
  });

  // Auto-expand card if openStakeCard matches this pool type
  useEffect(() => {
    if (openStakeCard === poolType) {
      setIsExpanded(true);
    }
  }, [openStakeCard, poolType]);

  // Show popup after modal closes and a success is pending
  useEffect(() => {
    if (!modalType && pendingSuccessType !== null) {
      setSuccessType(pendingSuccessType);
      setShowSuccessPopup(true);
  setTimeout(() => setShowSuccessPopup(false), 6000);
      setPendingSuccessType(null);
    }
  }, [modalType, pendingSuccessType]);

  // Extract reward token color class for pending rewards
  const getRewardTokenColor = (token: string) => {
    switch (token) {
      case 'ORDER': return 'text-orange-400';
      case 'WITCH': return 'text-purple-400';
      case 'KOKSAL': return 'text-blue-400';
      case 'STANK': return 'text-orange-400';
      case 'xORDER': return 'text-green-400';
      case 'xARENA': return 'text-cyan-400';
      default: return 'text-green-400';
    }
  };

  // APY calculation for all pools
  let apy: number | null = null;
  let isEnded = false;
  const now = new Date();
  const secondsInYear = 365 * 24 * 60 * 60;
  
  // Check if the pool has ended
  if (endTime && now >= endTime) {
    isEnded = true;
    apy = 0; // Set APY to 0 for ended pools
  } else if (endTime) {
    const secondsRemaining = Math.max(1, Math.floor((endTime.getTime() - now.getTime()) / 1000));
    if (poolType === 'ORDER_ORDER' && poolData.tvlOrderAmount > 0 && stakingData.remainingBalance) {
      // ORDER > ORDER: use token amounts
      const remainingReward = parseFloat(stakingData.remainingBalance);
      const tvl = poolData.tvlOrderAmount;
      apy = (remainingReward / tvl) * (secondsInYear / secondsRemaining) * 100;
    } else if (
      (poolType === 'ORDER_WITCH' || poolType === 'ORDER_STANK' || poolType === 'ORDER_KOKSAL' || poolType === 'ORDER_xORDER' || poolType === 'ORDER_xARENA') &&
      poolData.tvlUsd > 0 && stakingData.remainingBalance
    ) {
      // Other pools: use USD values, but only if both TVL and reward are > 0
      const tokenAddress = TOKEN_ADDRESSES[rewardToken];
      const price = getTokenPrice(tokenAddress);
      const pendingRewardUsd = parseFloat(stakingData.remainingBalance) * price;
      const tvlUsd = poolData.tvlUsd;
      if (pendingRewardUsd > 0 && tvlUsd > 0) {
        apy = (pendingRewardUsd / tvlUsd) * (secondsInYear / secondsRemaining) * 100;
      } else {
        apy = 0;
      }
    }
  }

  // Determine if this is the ORDER>ORDER card for special styling
  const isOrderOrderCard = poolType === 'ORDER_ORDER';

  return (
    <div className={`bg-gradient-surface border border-border-primary rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-card transition-all duration-300 hover:border-accent-primary/50 ${
      isOrderOrderCard 
        ? 'hover:shadow-status-success/10' 
        : 'hover:shadow-accent-primary/10'
    }`}>
      {/* Accordion Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="show-details w-full text-left rounded-lg transition-all duration-200 hover:bg-surface-secondary/50 p-2 sm:p-3"
        style={{
          outline: 'none'
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = '0 0 0 2px rgba(79, 255, 223, 0.3)';
          e.target.style.borderRadius = '12px';
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = 'none';
        }}
        aria-expanded={isExpanded}
        aria-controls={`staking-content-${poolType}`}
      >
        <div className="flex flex-col space-y-3 sm:space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          {/* Left side - Token info */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex -space-x-1 sm:-space-x-2">
              <img 
                src={stakingTokenLogo} 
                alt={stakingToken}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 shadow-lg ${
                  isOrderOrderCard 
                    ? 'border-status-success/50 shadow-status-success/20' 
                    : 'border-accent-primary/50 shadow-accent-primary/20'
                }`}
              />
              {rewardToken === 'xORDER' ? (
                <XOrderLogo size={40} className={`sm:w-12 sm:h-12 border-2 rounded-full shadow-lg ${
                  isOrderOrderCard 
                    ? 'border-status-success/50 shadow-status-success/20' 
                    : 'border-accent-primary/50 shadow-accent-primary/20'
                }`} />
              ) : (
                <img 
                  src={rewardTokenLogo} 
                  alt={rewardToken}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 shadow-lg ${
                    isOrderOrderCard 
                      ? 'border-status-success/50 shadow-status-success/20' 
                      : 'border-accent-primary/50 shadow-accent-primary/20'
                  }`}
                />
              )}
            </div>
            <div className="flex flex-col space-y-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
                <h3 className="text-text-primary font-bold text-base sm:text-lg truncate">
                  {stakingToken} → {rewardToken}
                </h3>
                {/* Special DAO message for ORDER>ORDER card */}
                {isOrderOrderCard && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-status-success/20 to-accent-primary/20 border border-status-success/30 backdrop-blur-sm">
                    <span className="text-xs sm:text-sm font-semibold text-status-success animate-pulse">
                      🏛️ Stake for The DAO here.
                    </span>
                  </div>
                )}
                {/* APY badge */}
                {(poolType === 'ORDER_ORDER' || poolType === 'ORDER_WITCH' || poolType === 'ORDER_STANK' || poolType === 'ORDER_KOKSAL' || poolType === 'ORDER_xORDER' || poolType === 'ORDER_xARENA') && apy !== null && (
                  <span className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-bold shadow-lg border transition-all duration-200 ${
                    isEnded 
                      ? 'bg-gradient-to-r from-status-error to-status-error/80 text-white border-status-error/30' 
                      : 'bg-gradient-to-r from-status-success to-status-success/80 text-white border-status-success/30 animate-pulse'
                  }`}>
                    APY {apy.toLocaleString('en-US', { maximumFractionDigits: 2 })}%{isEnded ? ' Ended' : ''}
                  </span>
                )}
                <span className="text-xs sm:text-sm text-text-secondary">
                  TVL: <span className="text-text-primary font-semibold">{formatCompactNumber(poolData.tvlOrderAmount)} {stakingToken}</span>
                  <span className="text-text-tertiary text-xs ml-1">({formatUSD(poolData.tvlUsd)})</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Right side - Show/Hide button */}
          <div className="flex items-center justify-end space-x-2 flex-shrink-0">
            <span className={`text-xs sm:text-sm font-medium transition-colors ${
              isExpanded ? 'text-accent-primary' : 'text-text-tertiary'
            }`}>
              {isExpanded ? 'Hide' : 'Show'} Details
            </span>
            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <svg 
              className={`w-5 h-5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              } ${isExpanded ? 'text-blue-400' : 'text-gray-400'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expandable Content - Modern Design */}
      <div 
        id={`staking-content-${poolType}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100 mt-4 sm:mt-6' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isExpanded}
      >
        <div className="border-t border-border-muted pt-4 sm:pt-6">
          {/* User Stats */}
          {poolData.userStaked > 0 && (
          (() => {
            // Try to match staking/reward token to known addresses (by symbol)
            // Map token symbol to known keys for address lookup
            const symbolToKey = (symbol: string) => {
              const upper = symbol?.toUpperCase?.();
              if (["ORDER", "WITCH", "KOKSAL", "STANK"].includes(upper)) return upper as keyof typeof LIVE_TOKEN_ADDRESSES;
              return "ORDER" as keyof typeof LIVE_TOKEN_ADDRESSES;
            };
            const stakingTokenAddress = LIVE_TOKEN_ADDRESSES[symbolToKey(stakingToken)];
            const rewardTokenAddress = LIVE_TOKEN_ADDRESSES[symbolToKey(rewardToken)];
            const stakedUsd = poolData.userStaked * getLiveTokenPrice(stakingTokenAddress);
            const pendingUsd = poolData.userEarned * getLiveTokenPrice(rewardTokenAddress);
            return (
              <div className={`bg-gradient-to-r rounded-lg p-3 md:p-4 mb-4 border ${
                isOrderOrderCard 
                  ? 'from-green-900/20 to-gray-900 border-green-600/30' 
                  : 'from-orange-900/20 to-gray-900 border-orange-600/30'
              }`}>
                <div className="flex flex-row justify-between items-center mb-2">
                  <span className={`flex items-center gap-1 text-sm ${
                    isOrderOrderCard ? 'text-green-200/80' : 'text-orange-200/80'
                  }`}>
                    Your Staked:
                    <img src={stakingTokenLogo} alt={stakingToken} className={`w-4 h-4 rounded-full border ${
                      isOrderOrderCard ? 'border-green-400' : 'border-orange-400'
                    } ml-1`} />
                  </span>
                  <span className="text-white font-semibold flex items-center gap-1 text-sm">
                    {formatNumber(poolData.userStaked, 4)} {stakingToken}
                    <img src={stakingTokenLogo} alt={stakingToken} className={`w-5 h-5 rounded-full border ${
                      isOrderOrderCard ? 'border-green-400' : 'border-orange-400'
                    } ml-1`} />
                    <span className="text-green-300 text-xs font-bold ml-2">{formatUSD(stakedUsd)}</span>
                  </span>
                </div>
                {/* Pending Rewards */}
                <div className="flex flex-row justify-between items-center mb-1">
                  <span className={`flex items-center gap-1 text-sm ${
                    isOrderOrderCard ? 'text-green-200/80' : 'text-orange-200/80'
                  }`}>
                    Pending {rewardToken}:
                    {rewardToken === 'xORDER' ? (
                      <XOrderLogo size={16} className="ml-1" />
                    ) : (
                      <img src={rewardTokenLogo} alt={rewardToken} className={`w-4 h-4 rounded-full border ${
                        isOrderOrderCard ? 'border-green-400' : 'border-orange-400'
                      } ml-1`} />
                    )}
                  </span>
                  <span className={`font-semibold ${getRewardTokenColor(rewardToken)} flex items-center gap-1 text-sm`}>
                    {formatNumber(poolData.userEarned, 4)} {rewardToken}
                    {rewardToken === 'xORDER' ? (
                      <XOrderLogo size={20} className="ml-1" />
                    ) : (
                      <img src={rewardTokenLogo} alt={rewardToken} className={`w-5 h-5 rounded-full border ${
                        isOrderOrderCard ? 'border-green-400' : 'border-orange-400'
                      } ml-1`} />
                    )}
                    <span className="text-green-300 text-xs font-bold ml-2">{formatUSD(pendingUsd)}</span>
                  </span>
                </div>
              </div>
            );
          })()
        )}

            {/* Information Note for xORDER and xARENA */}
            {(poolType === 'ORDER_xORDER' || poolType === 'ORDER_xARENA') && (
              <div className="mb-4 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSwapGuidePopup(true)}
                    className="relative group focus:outline-none transition-all duration-300 hover:scale-110"
                  >
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-blue-400 shadow-lg shadow-blue-400/40 group-hover:shadow-blue-300/80 group-hover:border-blue-300">
                      {/* Blurred logo background */}
                      <img
                        src={rewardToken === 'xORDER' ? '/order-logo.jpg' : 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F3c461417-92b8-04bb-841c-945306c77c2b1749435408088.jpeg&w=96&q=75'}
                        alt={rewardToken}
                        className="w-full h-full object-cover"
                        style={{ filter: 'blur(3px) brightness(0.7)' }}
                      />
                      {/* Question mark overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xl font-bold drop-shadow-lg">?</span>
                      </div>
                    </div>
                  </button>
                  <div className="text-blue-200 text-sm">
                    Click to see <strong className="text-blue-100">How to swap {rewardToken}</strong> guide
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons - Always Side by Side */}
            <div className="flex flex-row space-x-2 mb-6">
              <button
                onClick={() => setModalType('stake')}
                className={`flex-1 bg-gradient-to-r font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg border text-sm ${
                  isOrderOrderCard 
                    ? 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-600/20 hover:shadow-green-600/40 border-green-500/30'
                    : 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-orange-600/20 hover:shadow-orange-600/40 border-orange-500/30'
                }`}
              >
                ⚔️ Stake
              </button>
              
              {arenaData?.isLoading && (
                <div className="flex-1 bg-gray-600/50 text-gray-300 font-bold py-3 px-4 rounded-lg border border-gray-500/30 text-sm flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading...
                </div>
              )}
              
              {showUnstakeClaimButtons && !arenaData?.isLoading && (
                <>
                  <button
                    onClick={() => setModalType('claim')}
                    className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-amber-600/20 hover:shadow-amber-600/40 border border-amber-500/30 text-sm"
                  >
                    🏆 Claim
                  </button>
                  <button
                    onClick={() => setModalType('unstake')}
                    className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-gray-600/20 hover:shadow-gray-600/40 border border-gray-500/30 text-sm"
                  >
                    🛡️ Unstake
                  </button>
                </>
              )}
              
              {!showUnstakeClaimButtons && !arenaData?.isLoading && arenaData?.isConnected && (
                <div className="flex-1 bg-blue-600/20 text-blue-200 font-medium py-3 px-4 rounded-lg border border-blue-500/30 text-sm flex items-center justify-center">
                  🔄 Loading wallet data...
                </div>
              )}
              
              {!arenaData?.isConnected && !arenaData?.isLoading && (
                <div className="flex-1 bg-orange-600/20 text-orange-200 font-medium py-3 px-4 rounded-lg border border-orange-500/30 text-sm flex items-center justify-center">
                  🔗 Wallet not connected
                </div>
              )}
            </div>

            {/* Remaining Balance Section - Mobile Optimized */}
            <div className={`pt-4 md:pt-6 border-t-2 ${
              isOrderOrderCard ? 'border-green-600/40' : 'border-orange-600/40'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
                <div className="relative flex-shrink-0 self-center sm:self-auto">
                  <span className={`w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg flex items-center justify-center ring-4 animate-pulse-slow ${
                    isOrderOrderCard 
                      ? 'bg-gradient-to-br from-green-600 via-green-400 to-green-300 shadow-green-500/40 ring-green-400/40'
                      : 'bg-gradient-to-br from-orange-600 via-orange-400 to-yellow-300 shadow-orange-500/40 ring-orange-400/40'
                  }`}>
                    {rewardToken === 'xORDER' ? (
                      <XOrderLogo size={32} className="md:w-10 md:h-10 border-2 border-white rounded-full shadow-md" />
                    ) : (
                      <img
                        src={rewardTokenLogo}
                        alt={rewardToken}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white shadow-md object-cover"
                        style={{background:'#fff'}}
                      />
                    )}
                  </span>
                  <style>{`
                    @keyframes pulse-slow { 0%,100%{box-shadow:0 0 0 0 #f59e42cc;} 50%{box-shadow:0 0 24px 8px #f59e42cc;} }
                    .animate-pulse-slow { animation: pulse-slow 2.5s infinite; }
                  `}</style>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className={`text-base md:text-lg font-bold tracking-wide ${
                      isOrderOrderCard ? 'text-green-200/90' : 'text-orange-200/90'
                    }`}>Remaining {rewardToken}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mt-1">
                    <span className="text-lg md:text-xl font-extrabold text-white">
                      {formatNumber(parseFloat(stakingData.remainingBalance || '0'))}
                    </span>
                    <span className={`text-base md:text-lg font-bold ${
                      isOrderOrderCard ? 'text-green-200/80' : 'text-orange-200/80'
                    }`}>{rewardToken}</span>
                    <span className={`text-sm md:text-base font-mono ${
                      isOrderOrderCard ? 'text-green-200/60' : 'text-orange-200/60'
                    }`}>
                      {(() => {
                        // Show USD value of remaining tokens
                        const remaining = parseFloat(stakingData.remainingBalance || '0');
                        const tokenAddress = TOKEN_ADDRESSES[rewardToken];
                        const price = getTokenPrice(tokenAddress);
                        const usdValue = remaining * price;
                        if (!price || isNaN(price) || !isFinite(usdValue) || isNaN(usdValue)) {
                          return '≈ N/A';
                        }
                        return `≈ ${formatUSD(usdValue)}`;
                      })()}
                    </span>
                  </div>
                  {/* End Time and Countdown + Status Button */}
                  {endTimeStr && (
                    <div className={`mt-2 text-sm md:text-base font-bold flex flex-col gap-1 ${
                      isOrderOrderCard ? 'text-green-300/90' : 'text-orange-300/90'
                    }`}>
                      <span>End Time: <span className={`font-mono text-xs md:text-sm ${
                        isOrderOrderCard ? 'text-green-100/90' : 'text-orange-100/90'
                      }`}>{endTimeStr}</span></span>
                      <span>Remaining: <span className={`font-mono text-xs md:text-sm ${
                        isOrderOrderCard ? 'text-green-200/90' : 'text-orange-200/90'
                      }`}>{remainingTime}</span></span>
                      <span className="flex justify-center sm:justify-start">
                        {(() => {
                          const now = new Date();
                          const ended = endTime && now >= endTime;
                          return ended ? (
                            <span className="inline-block mt-2 px-3 py-1 md:px-4 md:py-1 rounded-full bg-gradient-to-r from-red-600 to-red-400 text-white font-bold text-sm md:text-base shadow border-2 border-red-200 animate-pulse">END</span>
                          ) : (
                            <span className="inline-block mt-2 px-3 py-1 md:px-4 md:py-1 rounded-full bg-gradient-to-r from-green-500 to-green-400 text-white font-bold text-sm md:text-base shadow border-2 border-green-200 animate-pulse">ACTIVE</span>
                          );
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Remaining as % of total supply info - more prominent */}
              <div className={`mt-2 text-sm font-semibold italic text-right ${
                isOrderOrderCard ? 'text-green-100/80' : 'text-orange-100/80'
              }`}>
                {(() => {
                  // xORDER ve xARENA: 100 milyar, diğerleri: 10 milyar
                  const totalSupply = (rewardToken === 'xORDER' || rewardToken === 'xARENA') ? 100_000_000_000 : 10_000_000_000;
                  const remaining = parseFloat(stakingData.remainingBalance || '0');
                  const percent = totalSupply > 0 ? (remaining / totalSupply) * 100 : 0;
                  let tokenName = rewardToken;
                  if (tokenName === 'ORDER') tokenName = 'Order';
                  if (tokenName === 'WITCH') tokenName = 'Witch';
                  if (tokenName === 'KOKSAL') tokenName = 'Koksal';
                  if (tokenName === 'STANK') tokenName = 'Stank';
                  if (tokenName === 'xORDER') tokenName = 'xOrder';
                  if (tokenName === 'xARENA') tokenName = 'xArena';
                  return `This represents the remaining reward. ${percent.toLocaleString('en-US', { maximumFractionDigits: 6 })}% of the total ${tokenName} token supply can still be earned via Order Stake.`;
                })()}
              </div>
            </div>

            {/* Expanded Info - Contract Addresses - Mobile Optimized */}
            <div className={`mt-4 pt-4 border-t ${
              isOrderOrderCard ? 'border-green-600/30' : 'border-orange-600/30'
            }`}>
              <div className="space-y-3 text-xs md:text-sm mb-4">
                {/* Staking Contract */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className={isOrderOrderCard ? 'text-green-200/80' : 'text-orange-200/80'}>Staking Contract:</span>
                  <div className="flex items-center gap-1 break-all">
                    <span className={`font-mono text-xs ${
                      isOrderOrderCard ? 'text-green-100' : 'text-orange-100'
                    }`}>{stakingContract}</span>
                    <button
                      className={`ml-1 px-2 py-1 text-xs bg-gray-800 border rounded transition-colors flex-shrink-0 ${
                        isOrderOrderCard 
                          ? 'border-green-500 hover:bg-green-500 hover:text-white'
                          : 'border-orange-500 hover:bg-orange-500 hover:text-white'
                      }`}
                      onClick={() => copyToClipboard(stakingContract)}
                      title="Copy address"
                    >📋</button>
                  </div>
                </div>
                {/* TVL Contract */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-gray-400">TVL Contract:</span>
                  <div className="flex items-center gap-1 break-all">
                    <span className="text-gray-300 font-mono text-xs">{tvlContract}</span>
                    <button
                      className={`ml-1 px-2 py-1 text-xs bg-gray-800 border rounded transition-colors flex-shrink-0 ${
                        isOrderOrderCard 
                          ? 'border-green-500 hover:bg-green-500 hover:text-white'
                          : 'border-orange-500 hover:bg-orange-500 hover:text-white'
                      }`}
                      onClick={() => copyToClipboard(tvlContract)}
                      title="Copy address"
                    >📋</button>
                  </div>
                </div>
                {/* Staking Token Address */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className={isOrderOrderCard ? 'text-green-200/80' : 'text-orange-200/80'}>{stakingToken} Token:</span>
                  <div className="flex items-center gap-1 break-all">
                    <span className={`font-mono text-xs ${
                      isOrderOrderCard ? 'text-green-100' : 'text-orange-100'
                    }`}>{CONTRACT_ADDRESSES.tokens[stakingToken as keyof typeof CONTRACT_ADDRESSES.tokens]}</span>
                    <button
                      className={`ml-1 px-2 py-1 text-xs bg-gray-800 border rounded transition-colors flex-shrink-0 ${
                        isOrderOrderCard 
                          ? 'border-green-500 hover:bg-green-500 hover:text-white'
                          : 'border-orange-500 hover:bg-orange-500 hover:text-white'
                      }`}
                      onClick={() => copyToClipboard(CONTRACT_ADDRESSES.tokens[stakingToken as keyof typeof CONTRACT_ADDRESSES.tokens])}
                      title="Copy address"
                    >📋</button>
                  </div>
                </div>
                {/* Reward Token Address */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className={isOrderOrderCard ? 'text-green-200/80' : 'text-orange-200/80'}>{rewardToken} Token:</span>
                  <div className="flex items-center gap-1 break-all">
                    <span className={`font-mono text-xs ${
                      isOrderOrderCard ? 'text-green-100' : 'text-orange-100'
                    }`}>{CONTRACT_ADDRESSES.tokens[rewardToken as keyof typeof CONTRACT_ADDRESSES.tokens]}</span>
                    <button
                      className={`ml-1 px-2 py-1 text-xs bg-gray-800 border rounded transition-colors flex-shrink-0 ${
                        isOrderOrderCard 
                          ? 'border-green-500 hover:bg-green-500 hover:text-white'
                          : 'border-orange-500 hover:bg-orange-500 hover:text-white'
                      }`}
                      onClick={() => copyToClipboard(CONTRACT_ADDRESSES.tokens[rewardToken as keyof typeof CONTRACT_ADDRESSES.tokens])}
                      title="Copy address"
                    >📋</button>
                  </div>
                </div>
                {/* Remaining Address */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className={isOrderOrderCard ? 'text-green-200/80' : 'text-orange-200/80'}>Remaining Address:</span>
                  <div className="flex items-center gap-1 break-all">
                    <span className={`font-mono text-xs ${
                      isOrderOrderCard ? 'text-green-100' : 'text-orange-100'
                    }`}>{CONTRACT_ADDRESSES.rewardPools[poolType]}</span>
                    <button
                      className={`ml-1 px-2 py-1 text-xs bg-gray-800 border rounded transition-colors flex-shrink-0 ${
                        isOrderOrderCard 
                          ? 'border-green-500 hover:bg-green-500 hover:text-white'
                          : 'border-orange-500 hover:bg-orange-500 hover:text-white'
                      }`}
                      onClick={() => copyToClipboard(CONTRACT_ADDRESSES.rewardPools[poolType])}
                      title="Copy address"
                    >📋</button>
                  </div>
                </div>
              </div>
              {/* Related Platforms - Mobile Optimized */}
              <div className="mt-6">
                <div className={`text-base font-semibold mb-3 ${
                  isOrderOrderCard ? 'text-green-400' : 'text-orange-400'
                }`}>Related Platforms</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {platforms
                    .filter(p => {
                      // For ORDER>ORDER, show only OrderStake, OrderSlot, RangeOrder
                      if (poolType === 'ORDER_ORDER') {
                        return (
                          p.title === 'OrderStake Global' ||
                          p.title === 'OrderSlot Games' ||
                          p.title === 'RangeOrder Analytics'
                        );
                      }
                      // For other pools, show only the platform that matches the rewardToken (earned token)
                      const token = rewardToken.toLowerCase();
                      return (
                        p.title.toLowerCase().includes(token) ||
                        p.category.toLowerCase().includes(token)
                      );
                    })
                    .map((platform, idx) => (
                      <div key={platform.title + idx} className="w-full">
                        <PlatformCard
                          title={platform.title}
                          description={platform.description}
                          url={platform.url}
                          logo={platform.logo}
                          category={platform.category}
                          isNative={platform.isNative}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
      </div>
    </div>

      {/* Swap Guide Popup */}
      {showSwapGuidePopup && (poolType === 'ORDER_xORDER' || poolType === 'ORDER_xARENA') && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <img 
                  src={rewardToken === 'xORDER' ? '/order-logo.jpg' : 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F3c461417-92b8-04bb-841c-945306c77c2b1749435408088.jpeg&w=96&q=75'}
                  alt={rewardToken}
                  className="w-8 h-8 rounded-full border border-orange-400"
                />
                How to swap {rewardToken}
              </h2>
              <button
                onClick={() => setShowSwapGuidePopup(false)}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div className="text-gray-300 leading-relaxed">
                <p className="mb-4">
                  <strong className="text-blue-300">{rewardToken}</strong> tokens need to be imported into The Arena Wallet to be visible and tradeable. Follow these steps:
                </p>
                
                <div className="bg-gray-900 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold text-orange-300 mb-3">Step-by-step Guide:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open The Arena Wallet app</li>
                    <li>Navigate to the "Add Token" section</li>
                    <li className="flex flex-col gap-1">
                      <span>Paste the {rewardToken} contract address:</span>
                      <div className="bg-gray-800 rounded p-2 border border-gray-600 ml-4">
                        <div className="flex items-center justify-between">
                          <span className="text-green-300 font-mono text-xs break-all">
                            {rewardToken === 'xORDER' ? '0x9d0c52d591d43484b509e8a39cbcf86de8f39c42' : '0x35836287376a1bad9a9819a290adc15e427e0cba'}
                          </span>
                          <button
                            onClick={() => {
                              const address = rewardToken === 'xORDER' ? '0x9d0c52d591d43484b509e8a39cbcf86de8f39c42' : '0x35836287376a1bad9a9819a290adc15e427e0cba';
                              navigator.clipboard.writeText(address);
                            }}
                            className="ml-2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            title="Copy address"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    </li>
                    <li>Confirm the token import</li>
                    <li>Your {rewardToken} balance will now be visible</li>
                    <li>Click on {rewardToken} token and select "SWAP"</li>
                    <li>Choose any token you want to swap with</li>
                  </ol>
                </div>

                {/* Arena Wallet Guide Image */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-blue-400/30">
                  <img 
                    src="/assets/arena-wallet-guide.png" 
                    alt="Arena Wallet Guide - How to import and use xORDER/xARENA tokens"
                    className="w-full h-auto rounded-md border border-gray-600"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  <p className="text-xs text-blue-300/80 text-center mt-2">
                    Arena Wallet Interface - Import & Swap Guide
                  </p>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mt-4">
                  <p className="text-yellow-300 text-sm">
                    <strong>Important:</strong> After claiming {rewardToken}, you won't see it in your wallet immediately. You must import it using the contract address to make it visible.
                  </p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowSwapGuidePopup(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staking Modal */}
      {modalType && (
        <StakingModal
          isOpen={!!modalType}
          onClose={() => {
            setModalType(null);
          }}
          onSuccess={(type) => {
            setPendingSuccessType(type);
          }}
          mode={modalType}
          poolType={poolType}
          stakingToken={stakingToken}
          rewardToken={rewardToken}
          stakingTokenLogo={stakingTokenLogo}
          rewardTokenLogo={rewardTokenLogo}
        />
      )}

      <SuccessPopup
        show={showSuccessPopup}
        type={successType}
        rewardToken={successType === 'claim' ? rewardToken : undefined}
        rewardTokenLogo={successType === 'claim' ? (rewardLogos[rewardToken] || rewardTokenLogo) : undefined}
      />
    </div>
  );
};
