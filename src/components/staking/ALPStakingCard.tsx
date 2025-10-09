import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useALPStaking } from '@/hooks/useALPStaking';
import { formatNumber, formatUSD } from '@/utils/formatters';
import { sanitizeNumericInput, safeParseFloat, numberToInputString } from '@/utils/inputValidation';
import { useArenaSDK } from '@/hooks/useArenaSDK';
import { useDexScreener } from '@/hooks/useDexScreener';
import { useRemainingBalances } from '@/hooks/useRemainingBalances';
import { useLPData } from '@/hooks/useLPData';
import { useALPAPY } from '@/hooks/useALPAPY';
import { useTotalStakedALP } from '@/hooks/useTotalStakedALP';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
import SuccessPopup from './SuccessPopup';

interface ALPStakingCardProps {
  className?: string;
}

export const ALPStakingCard: React.FC<ALPStakingCardProps> = ({ className = '' }) => {
  const arenaData = useArenaSDK();
  const { getTokenPrice, getAVAXPrice } = useDexScreener();
  const { xOrderRemaining, xArenaRemaining } = useRemainingBalances();
  const { lpData, isLoading: isLPLoading, forceRefresh: refreshLP } = useLPData();
  const { totalStakedALP, isLoading: isLoadingTotalStaked, refresh: refreshTotalStaked } = useTotalStakedALP();
  
  const {
    data,
    step,
    stake,
    unstake,
    claimRewards,
    approve,
    refresh
  } = useALPStaking();

  // Destructure data for easier access
  const { alpBalance, stakedAmount, xOrderPending, xArenaPending, allowance, isLoading, error } = data;

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Safe input handlers
  const handleStakeAmountChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setStakeAmount(sanitized);
  };

  const handleUnstakeAmountChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setUnstakeAmount(sanitized);
  };

  const setStakeAmountSafe = (amount: string) => {
    const numValue = safeParseFloat(amount);
    setStakeAmount(numberToInputString(numValue));
  };

  const setUnstakeAmountSafe = (amount: string) => {
    const numValue = safeParseFloat(amount);
    setUnstakeAmount(numberToInputString(numValue));
  };
  const [nextRefresh, setNextRefresh] = useState(3); // Changed to 3 seconds
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState<{
    show: boolean;
    type: 'stake' | 'unstake' | 'claim';
  }>({ show: false, type: 'stake' });

  // Calculate needsApproval based on allowance vs stake amount
  const needsApproval = parseFloat(allowance) < parseFloat(stakeAmount || '0');

  const getNotificationStyles = (type: 'success' | 'error' | 'info') => {
    if (type === 'success') return { bg: 'bg-green-900/30 border-green-500/50', text: 'text-green-300' };
    if (type === 'error') return { bg: 'bg-red-900/30 border-red-500/50', text: 'text-red-300' };
    return { bg: 'bg-blue-900/30 border-blue-500/50', text: 'text-blue-300' };
  };

  // Initial load when component mounts (popup opens)
  useEffect(() => {
    // Immediate first load
    const initialLoad = async () => {
      setRefreshing(true);
      await refresh();
      await refreshLP();
      await refreshTotalStaked();
      setTimeout(() => setRefreshing(false), 1000);
    };
    
    initialLoad();
  }, []); // Empty dependency - only run on mount

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!refreshing) {
        setRefreshing(true);
        await refresh();
        await refreshLP();
        await refreshTotalStaked();
        setTimeout(() => setRefreshing(false), 1000);
        setNextRefresh(3);
      }
    }, 3000); // 3 seconds interval

    return () => clearInterval(interval);
  }, [refresh, refreshLP, refreshTotalStaked, refreshing]);

  // Countdown timer for next refresh (3 seconds)
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setNextRefresh(prev => {
        if (prev <= 1) return 3; // Changed to 3 seconds
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    await refreshLP();
    await refreshTotalStaked();
    setNextRefresh(3); // Changed to 3 seconds
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStake = async () => {
    const numAmount = safeParseFloat(stakeAmount);
    if (!stakeAmount || numAmount <= 0) return;

    try {
      setNotification({
        type: 'info',
        message: '⏳ Staking ALP tokens...'
      });

      const txHash = await stake(numAmount);
      
      // Immediate data refresh after stake
      await handleManualRefresh();
      
      // Additional refreshes to ensure data is updated
      setTimeout(() => handleManualRefresh(), 3000);
      setTimeout(() => handleManualRefresh(), 8000);
      
      // Show success popup instead of notification
      setShowSuccessPopup({ show: true, type: 'stake' });
      setNotification(null);
      
      // Hide popup after 2 seconds
      setTimeout(() => {
        setShowSuccessPopup({ show: false, type: 'stake' });
      }, 2000);
      
      setStakeAmount('');
    } catch (error) {
      console.error('Stake error:', error);
      setNotification({
        type: 'error',
        message: `❌ Stake failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleUnstake = async () => {
    const numAmount = safeParseFloat(unstakeAmount);
    if (!unstakeAmount || numAmount <= 0) return;

    try {
      setNotification({
        type: 'info',
        message: '⏳ Unstaking ALP tokens...'
      });

      const txHash = await unstake(numAmount);
      
      // Immediate data refresh after unstake
      await handleManualRefresh();
      
      // Additional refreshes to ensure data is updated
      setTimeout(() => handleManualRefresh(), 3000);
      setTimeout(() => handleManualRefresh(), 8000);
      
      // Show success popup instead of notification
      setShowSuccessPopup({ show: true, type: 'unstake' });
      setNotification(null);
      
      // Hide popup after 2 seconds
      setTimeout(() => {
        setShowSuccessPopup({ show: false, type: 'unstake' });
      }, 2000);
      
      setUnstakeAmount('');
    } catch (error) {
      console.error('Unstake error:', error);
      setNotification({
        type: 'error',
        message: `❌ Unstake failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleClaim = async () => {
    try {
      setNotification({
        type: 'info',
        message: '⏳ Claiming dual rewards...'
      });

      const txHash = await claimRewards();
      
      // Immediate data refresh after claim
      await handleManualRefresh();
      
      // Additional refreshes to ensure data is updated
      setTimeout(() => handleManualRefresh(), 3000);
      setTimeout(() => handleManualRefresh(), 8000);
      
      // Show success popup instead of notification
      setShowSuccessPopup({ show: true, type: 'claim' });
      setNotification(null);
      
      // Hide popup after 2 seconds
      setTimeout(() => {
        setShowSuccessPopup({ show: false, type: 'claim' });
      }, 2000);
      
    } catch (error) {
      console.error('Claim error:', error);
      setNotification({
        type: 'error',
        message: `❌ Claim failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleApprove = async () => {
    try {
      setNotification({
        type: 'info',
        message: '⏳ Approving ALP tokens...'
      });

      const txHash = await approve();
      setNotification({
        type: 'success',
        message: `✅ ALP approved! TX: ${txHash?.slice(0, 10)}...`
      });
      
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Approve error:', error);
      setNotification({
        type: 'error',
        message: `❌ Approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handlePercentageClick = (percentage: number, type: 'stake' | 'unstake') => {
    if (type === 'stake' && alpBalance) {
      const adjustedPercentage = percentage === 100 ? 99 : percentage;
      const amount = (parseFloat(alpBalance) * adjustedPercentage / 100).toFixed(6);
      setStakeAmount(amount);
    } else if (type === 'unstake' && stakedAmount) {
      const adjustedPercentage = percentage === 100 ? 99 : percentage;
      const amount = (parseFloat(stakedAmount) * adjustedPercentage / 100).toFixed(6);
      setUnstakeAmount(amount);
    }
  };

  const hasRewards = parseFloat(xOrderPending) > 0 || parseFloat(xArenaPending) > 0;
  const canStake = parseFloat(alpBalance) > 0 && !needsApproval;
  const canUnstake = parseFloat(stakedAmount) > 0;

  // Debug LP data to understand why calculations are showing 0
  console.log('🔍 ALP Staking Card LP Data Debug:', {
    lpData,
    isLPLoading,
    totalLPSupply: lpData?.totalLPSupply,
    orderReserve: lpData?.orderReserve,
    avaxReserve: lpData?.avaxReserve,
    userLPBalance: lpData?.userLPBalance,
    stakedAmount,
    alpBalance,
    xOrderRemaining,
    xArenaRemaining
  });

  // Calculate total staked value and remaining rewards value for APY
  const totalStakedValueUSD = useMemo(() => {
    if (!lpData || lpData.totalLPSupply <= 0 || parseFloat(totalStakedALP) <= 0) return 0;
    
    const globalStakedALP = parseFloat(totalStakedALP); // Use global total instead of user staked
    const stakedSharePercent = globalStakedALP / lpData.totalLPSupply;
    const stakedOrderAmount = lpData.orderReserve * stakedSharePercent;
    const stakedAvaxAmount = lpData.avaxReserve * stakedSharePercent;
    
    const orderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER);
    const avaxPrice = getAVAXPrice();
    
    return (stakedOrderAmount * orderPrice) + (stakedAvaxAmount * avaxPrice);
  }, [lpData, totalStakedALP, getTokenPrice, getAVAXPrice]); // Changed dependency from stakedAmount to totalStakedALP

  const totalRemainingValueUSD = useMemo(() => {
    const xOrderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.xORDER);
    const xArenaPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.xARENA);
    
    return (parseFloat(xOrderRemaining) * xOrderPrice) + (parseFloat(xArenaRemaining) * xArenaPrice);
  }, [xOrderRemaining, xArenaRemaining, getTokenPrice]);

  // Calculate APY using the custom hook
  const apyData = useALPAPY(totalStakedValueUSD, totalRemainingValueUSD);

  return (
  <div className={`bg-gradient-to-br from-blue-900/60 to-gray-900/80 backdrop-blur-sm border border-blue-700/40 rounded-xl p-6 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-2">
            <img 
              src="/order-logo.jpg" 
              alt="ORDER" 
              className="w-8 h-8 rounded-full border-2 border-purple-400 shadow-lg"
            />
            <img 
              src="/assets/avax-logo-showdetails.png" 
              alt="AVAX" 
              className="w-8 h-8 rounded-full border-2 border-red-400 shadow-lg"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-1">
              ALP Staking
              <div className="flex items-center gap-1 text-xs">
                <img src="/order-logo.jpg" alt="ORDER" className="w-3 h-3 rounded-full" />
                <span className="text-orange-300">xORDER</span>
                <span className="text-gray-400">+</span>
                <img src="/assets/arena-logo.png" alt="ARENA" className="w-3 h-3 rounded-full" />
                <span className="text-purple-300">xARENA</span>
              </div>
            </h3>
            <p className="text-xs text-gray-400">Dual Rewards Pool</p>
          </div>
        </div>
        
        {/* Sexy Refresh Button */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className={`
                relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 
                hover:from-purple-500 hover:to-blue-500 text-white p-3 rounded-full 
                transition-all duration-300 transform hover:scale-110 active:scale-95
                shadow-lg hover:shadow-xl hover:shadow-purple-500/25
                ${refreshing ? 'opacity-75' : ''}
              `}
              title={refreshing ? 'Refreshing...' : `Refresh (auto in ${nextRefresh}s)`}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
              
              {/* Icon */}
              <RefreshCw 
                size={18} 
                className={`relative z-10 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} 
              />
              
              {/* Auto-refresh countdown indicator */}
              {!refreshing && (
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {nextRefresh}
                </div>
              )}
            </button>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {refreshing ? 'Refreshing data...' : `Auto-refresh in ${nextRefresh}s`}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-6">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-800/30 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Your ALP Balance</p>
          <p className="text-base font-bold text-white">{formatNumber(parseFloat(alpBalance), 4)}</p>
        </div>
  <div className="bg-blue-800/30 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Your Staked ALP</p>
          <p className="text-base font-bold text-white">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin"></div>
                Loading...
              </span>
            ) : (
              formatNumber(parseFloat(stakedAmount || '0'), 4)
            )}
          </p>
          <div className="text-xs text-white mt-2">
            {(() => {
              // If LP data is still loading, show a simple loading state
              if (isLPLoading) {
                return (
                  <div className="text-gray-400 text-center py-1">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-gray-400/20 border-t-gray-400 rounded-full animate-spin"></div>
                      <span className="text-xs">Loading LP data...</span>
                    </div>
                  </div>
                );
              }

              // Check if LP data is available
              if (!lpData || lpData.totalLPSupply === 0) {
                return (
                  <div className="text-gray-400 text-center py-1">
                    <span className="text-xs">LP data unavailable</span>
                  </div>
                );
              }

              // Calculate the percentage of the total LP supply that is staked
              const stakedLPAmount = parseFloat(stakedAmount) || 0;
              
              if (stakedLPAmount <= 0) {
                return (
                  <div className="text-gray-400 text-center py-2">
                    <div className="text-xs">No ALP staked</div>
                  </div>
                );
              }

              // Calculate the ORDER and AVAX amounts in the staked ALP
              const stakedSharePercent = stakedLPAmount / lpData.totalLPSupply;
              const stakedOrderAmount = lpData.orderReserve * stakedSharePercent;
              const stakedAvaxAmount = lpData.avaxReserve * stakedSharePercent;
              
              // Calculate USD values
              const orderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER);
              const avaxPrice = getAVAXPrice();
              const orderUSDValue = stakedOrderAmount * orderPrice;
              const avaxUSDValue = stakedAvaxAmount * avaxPrice;
              const totalUSDValue = orderUSDValue + avaxUSDValue;
              
              console.log('🔢 ALP Staking Calculation Debug:', {
                stakedLPAmount,
                totalLPSupply: lpData.totalLPSupply,
                stakedSharePercent,
                orderReserve: lpData.orderReserve,
                avaxReserve: lpData.avaxReserve,
                stakedOrderAmount,
                stakedAvaxAmount,
                orderPrice,
                avaxPrice,
                orderUSDValue,
                avaxUSDValue,
                totalUSDValue
              });
              
              return (
                <>
                  <div className="flex items-center gap-1">
                    <img src="/order-logo.jpg" alt="ORDER" className="w-3 h-3 rounded-full" />
                    <span>≈{formatNumber(stakedOrderAmount, 4)} ORDER</span>
                    <span className="text-green-400">
                      ({formatUSD(orderUSDValue)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <img src="/assets/avax-logo-showdetails.png" alt="AVAX" className="w-3 h-3 rounded-full" />
                    <span>≈{formatNumber(stakedAvaxAmount, 4)} AVAX</span>
                    <span className="text-green-400">
                      ({formatUSD(avaxUSDValue)})
                    </span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-gray-600">
                    <p className="text-xs text-gray-400">Total Staked Value</p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatUSD(totalUSDValue)}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        
        {/* Total Staked ALP Card */}
  <div className="bg-gray-800/30 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Total Staked ALP</p>
          <p className="text-base font-bold text-white">
            {isLoadingTotalStaked ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin"></div>
                Loading...
              </span>
            ) : (
              formatNumber(parseFloat(totalStakedALP || '0'), 4)
            )}
          </p>
          <div className="text-xs text-white mt-2">
            {(() => {
              // If data is still loading, show loading state
              if (isLoadingTotalStaked || isLPLoading) {
                return (
                  <div className="text-gray-400 text-center py-1">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-gray-400/20 border-t-gray-400 rounded-full animate-spin"></div>
                      <span className="text-xs">Loading LP data...</span>
                    </div>
                  </div>
                );
              }

              // Check if LP data is available and valid
              if (!lpData || lpData.totalLPSupply <= 0 || lpData.orderReserve <= 0 || lpData.avaxReserve <= 0) {
                return (
                  <div className="text-gray-400 text-center py-1">
                    <span className="text-xs">LP data unavailable</span>
                  </div>
                );
              }

              // Calculate the ORDER and AVAX amounts in the total staked ALP
              const totalStakedLPAmount = parseFloat(totalStakedALP) || 0;
              
              if (totalStakedLPAmount <= 0) {
                return (
                  <div className="text-gray-400 text-center py-2">
                    <div className="text-xs">No ALP staked globally</div>
                  </div>
                );
              }

              // Calculate the ORDER and AVAX amounts in the total staked ALP
              const totalStakedSharePercent = totalStakedLPAmount / lpData.totalLPSupply;
              const totalStakedOrderAmount = lpData.orderReserve * totalStakedSharePercent;
              const totalStakedAvaxAmount = lpData.avaxReserve * totalStakedSharePercent;
              
              // Calculate USD values
              const orderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER);
              const avaxPrice = getAVAXPrice();
              const totalOrderUSDValue = totalStakedOrderAmount * orderPrice;
              const totalAvaxUSDValue = totalStakedAvaxAmount * avaxPrice;
              const totalGlobalUSDValue = totalOrderUSDValue + totalAvaxUSDValue;
              
              return (
                <>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-center bg-orange-500/10 rounded p-2">
                      <p className="text-xs text-orange-300">ORDER</p>
                      <p className="text-xs font-semibold text-white">
                        {formatNumber(totalStakedOrderAmount, 2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatUSD(totalOrderUSDValue)}
                      </p>
                    </div>
                    <div className="text-center bg-red-500/10 rounded p-2">
                      <p className="text-xs text-red-300">AVAX</p>
                      <p className="text-xs font-semibold text-white">
                        {formatNumber(totalStakedAvaxAmount, 4)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatUSD(totalAvaxUSDValue)}
                      </p>
                    </div>
                  </div>
                  <div className="text-center mt-2 pt-2 border-t border-gray-600">
                    <p className="text-xs text-gray-400">Total Global Staked Value</p>
                    <p className="text-sm font-semibold text-blue-400">
                      {formatUSD(totalGlobalUSDValue)}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* APY Information */}
  <div className="bg-gradient-to-r from-blue-700/10 to-cyan-700/10 border border-blue-500/20 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-green-300 mb-3">📈 Annual Percentage Yield (APY)</h4>
        {isLoading || isLPLoading ? (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-green-400/20 border-t-green-400 rounded-full animate-spin"></div>
              <span className="text-gray-400 text-sm">Calculating APY...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-400">Current APY</p>
                <p className="text-lg font-bold text-green-400">
                  {apyData.apy !== null ? `${apyData.apy.toFixed(2)}%` : 'Calculating...'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Time Remaining</p>
                <p className="text-sm font-medium text-white">
                  {apyData.remainingTime}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Pool Status</p>
                <p className={`text-sm font-medium ${apyData.isEnded ? 'text-red-400' : 'text-green-400'}`}>
                  {apyData.isEnded ? '❌ Ended' : '✅ Active'}
                </p>
              </div>
            </div>
            
            {/* APY Calculation Details */}
            <div className="mt-4 pt-3 border-t border-gray-600">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">Total Staked Value</p>
                  <p className="text-white font-medium">{formatUSD(totalStakedValueUSD)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Remaining Rewards</p>
                  <p className="text-white font-medium">{formatUSD(totalRemainingValueUSD)}</p>
                </div>
              </div>
              
              {apyData.apy !== null && (
                <div className="mt-3 pt-2 border-t border-gray-600">
                  <p className="text-xs text-gray-400 mb-2">Estimated Rewards (Pool-wide)</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-gray-400">Daily</p>
                      <p className="text-green-400 font-medium">{formatUSD(apyData.dailyRewards)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">Monthly</p>
                      <p className="text-green-400 font-medium">{formatUSD(apyData.monthlyRewards)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">Yearly</p>
                      <p className="text-green-400 font-medium">{formatUSD(apyData.yearlyRewards)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Pending Rewards */}
  <div className="bg-gradient-to-r from-blue-900/10 to-purple-900/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-orange-300 mb-3">💰 Pending Rewards</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/order-logo.jpg" alt="xORDER" className="w-4 h-4 rounded-full" />
              <span className="text-sm text-gray-300">xORDER</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-orange-300">
                {formatNumber(parseFloat(xOrderPending), 10)}
              </div>
              <div className="text-xs text-green-400">
                {formatUSD(parseFloat(xOrderPending) * getTokenPrice(CONTRACT_ADDRESSES.tokens.xORDER))}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/assets/arena-logo.png" alt="xARENA" className="w-4 h-4 rounded-full" />
              <span className="text-sm text-gray-300">xARENA</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-300">
                {formatNumber(parseFloat(xArenaPending), 10)}
              </div>
              <div className="text-xs text-green-400">
                {formatUSD(parseFloat(xArenaPending) * getTokenPrice(CONTRACT_ADDRESSES.tokens.xARENA))}
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Total Pending Value</span>
              <span className="text-sm font-bold text-green-400">
                {formatUSD((parseFloat(xOrderPending) * getTokenPrice(CONTRACT_ADDRESSES.tokens.xORDER)) + (parseFloat(xArenaPending) * getTokenPrice(CONTRACT_ADDRESSES.tokens.xARENA)))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Connection Check */}
      {!arenaData?.isConnected ? (
        <div className="text-center py-6">
          <p className="text-gray-400 mb-4">Connect your wallet to access ALP staking</p>
        </div>
      ) : (
        <>
          {/* Approval Section */}
          {needsApproval && (
            <div className="mb-6">
              <button
                onClick={handleApprove}
                disabled={isLoading || step === 'approving'}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
              >
                {isLoading && step === 'approving' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Approving ALP...
                  </span>
                ) : (
                  'Approve ALP Tokens'
                )}
              </button>
            </div>
          )}

          {/* Stake Section */}
          <div className="mb-4">
            <label htmlFor="stake-input" className="block text-xs font-medium text-gray-400 mb-2">Stake ALP</label>
            
            {/* Percentage Buttons for Stake */}
            <div className="grid grid-cols-4 gap-1 mb-2">
              {[25, 50, 75, 99].map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => handlePercentageClick(percentage, 'stake')}
                  className="px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded border border-gray-600/50 hover:border-green-500/50 transition-all"
                >
                  {percentage}%
                </button>
              ))}
            </div>
            
            <div className="flex gap-2 mb-2">
              <input
                id="stake-input"
                type="text"
                inputMode="decimal"
                value={stakeAmount}
                onChange={(e) => handleStakeAmountChange(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !isNaN(parseFloat(value))) {
                    setStakeAmount(numberToInputString(parseFloat(value)));
                  }
                }}
                placeholder="0.0"
                className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded px-2 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
              />
              <button
                onClick={() => setStakeAmountSafe(alpBalance)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors whitespace-nowrap"
              >
                MAX
              </button>
            </div>
            
            <button
              onClick={handleStake}
              disabled={!canStake || isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold text-sm rounded transition-all duration-200 shadow-lg shadow-green-500/25 active:scale-95"
            >
              {isLoading && step === 'staking' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Staking...
                </span>
              ) : (
                '🚀 STAKE ALP'
              )}
            </button>
          </div>

          {/* Unstake Section */}
          <div className="mb-4">
            <label htmlFor="unstake-input" className="block text-xs font-medium text-gray-400 mb-2">Unstake ALP</label>
            
            {/* Percentage Buttons for Unstake */}
            <div className="grid grid-cols-4 gap-1 mb-2">
              {[25, 50, 75, 99].map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => handlePercentageClick(percentage, 'unstake')}
                  className="px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded border border-gray-600/50 hover:border-red-500/50 transition-all"
                >
                  {percentage}%
                </button>
              ))}
            </div>
            
            <div className="flex gap-2 mb-2">
              <input
                id="unstake-input"
                type="text"
                inputMode="decimal"
                value={unstakeAmount}
                onChange={(e) => handleUnstakeAmountChange(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !isNaN(parseFloat(value))) {
                    setUnstakeAmount(numberToInputString(parseFloat(value)));
                  }
                }}
                placeholder="0.0"
                className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded px-2 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
              />
              <button
                onClick={() => setUnstakeAmountSafe(stakedAmount)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors whitespace-nowrap"
              >
                MAX
              </button>
            </div>
            
            <button
              onClick={handleUnstake}
              disabled={!canUnstake || isLoading || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold text-sm rounded transition-all duration-200 shadow-lg shadow-red-500/25 active:scale-95"
            >
              {isLoading && step === 'unstaking' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Unstaking...
                </span>
              ) : (
                '🔻 UNSTAKE ALP'
              )}
            </button>
          </div>

          {/* Claim Button */}
          <button
            onClick={handleClaim}
            disabled={!hasRewards || isLoading}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold text-sm rounded transition-all duration-200 shadow-lg shadow-orange-500/25 active:scale-95"
          >
            {isLoading && step === 'claiming' ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Claiming...
              </span>
            ) : (
              '💰 CLAIM ALL REWARDS'
            )}
          </button>

          {/* Remaining Balances */}
          <div className="mt-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-300 mb-3">🏦 Remaining Pool Balances</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src="/order-logo.jpg" alt="xORDER" className="w-4 h-4 rounded-full" />
                  <span className="text-sm text-gray-300">Remaining xORDER</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-orange-300">
                    {formatNumber(parseFloat(xOrderRemaining), 2)}
                  </div>
                  <div className="text-xs text-green-400">
                    {formatUSD(parseFloat(xOrderRemaining) * getTokenPrice(CONTRACT_ADDRESSES.tokens.xORDER))}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src="/assets/arena-logo.png" alt="xARENA" className="w-4 h-4 rounded-full" />
                  <span className="text-sm text-gray-300">Remaining xARENA</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-purple-300">
                    {formatNumber(parseFloat(xArenaRemaining), 2)}
                  </div>
                  <div className="text-xs text-green-400">
                    {formatUSD(parseFloat(xArenaRemaining) * getTokenPrice(CONTRACT_ADDRESSES.tokens.xARENA))}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Total Remaining Value</span>
                  <span className="text-sm font-bold text-green-400">
                    {formatUSD((parseFloat(xOrderRemaining) * getTokenPrice(CONTRACT_ADDRESSES.tokens.xORDER)) + (parseFloat(xArenaRemaining) * getTokenPrice(CONTRACT_ADDRESSES.tokens.xARENA)))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notification */}
      {notification && (
        <div className={`mt-4 p-3 rounded-lg border backdrop-blur-sm transition-all duration-300 ${getNotificationStyles(notification.type).bg}`}>
          <p className={`text-sm font-medium ${getNotificationStyles(notification.type).text}`}>
            {notification.message}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-400">
          <span className="text-lg">⚠️</span>
          <p className="text-xs font-medium">
            ALP Staking earns dual rewards. Stake LP tokens to earn both xORDER and xARENA.
          </p>
        </div>
      </div>

      {/* Success Popup */}
      <SuccessPopup
        show={showSuccessPopup.show}
        type={showSuccessPopup.type}
        rewardToken={showSuccessPopup.type === 'claim' ? 'xORDER & xARENA' : undefined}
        rewardTokenLogo={showSuccessPopup.type === 'claim' ? '/order-logo.jpg' : undefined}
      />
    </div>
  );
};
