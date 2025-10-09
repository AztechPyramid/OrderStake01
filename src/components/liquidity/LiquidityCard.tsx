import { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLiquidity } from '@/hooks/useLiquidity';
import { useLPData } from '@/hooks/useLPData';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useDexScreener } from '@/hooks/useDexScreener';
import { useRemainingBalances } from '@/hooks/useRemainingBalances';
import { useALPAPY } from '@/hooks/useALPAPY';
import { useTotalStakedALP } from '@/hooks/useTotalStakedALP';
import { formatNumber, formatUSD, formatCompactNumber } from '@/utils/formatters';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
import { ALPStakingCard } from '@/components/staking/ALPStakingCard';
import SuccessPopup from '@/components/staking/SuccessPopup';

interface LiquidityCardProps {
  className?: string;
}

const TotalStakedALPInfoCard = () => {
  const { totalStakedALP, isLoading } = useTotalStakedALP();
  const { lpData, isLoading: isLPLoading } = useLPData();
  const { getTokenPrice, getAVAXPrice } = useDexScreener();

  let totalStakedOrderAmount = 0;
  let totalStakedAvaxAmount = 0;
  let totalOrderUSDValue = 0;
  let totalAvaxUSDValue = 0;
  let totalGlobalUSDValue = 0;
  if (
    !isLoading && !isLPLoading &&
    lpData && lpData.totalLPSupply > 0 && lpData.orderReserve > 0 && lpData.avaxReserve > 0
  ) {
    const totalStakedLPAmount = parseFloat(totalStakedALP) || 0;
    const totalStakedSharePercent = totalStakedLPAmount / lpData.totalLPSupply;
    totalStakedOrderAmount = lpData.orderReserve * totalStakedSharePercent;
    totalStakedAvaxAmount = lpData.avaxReserve * totalStakedSharePercent;
    totalOrderUSDValue = totalStakedOrderAmount * getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER);
    totalAvaxUSDValue = totalStakedAvaxAmount * getAVAXPrice();
    totalGlobalUSDValue = totalOrderUSDValue + totalAvaxUSDValue;
  }

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 mt-4">
      <p className="text-xs text-gray-400 mb-1">Total Staked ALP</p>
      <p className="text-base font-bold text-white">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin"></div>
            Loading...
          </span>
        ) : (
          formatNumber(parseFloat(totalStakedALP || '0'), 4)
        )}
      </p>
      <div className="text-xs text-white mt-2">
        {isLoading || isLPLoading ? (
          <div className="text-gray-400 text-center py-1">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-400/20 border-t-gray-400 rounded-full animate-spin"></div>
              <span className="text-xs">Loading LP data...</span>
            </div>
          </div>
        ) : (!lpData || lpData.totalLPSupply <= 0 || lpData.orderReserve <= 0 || lpData.avaxReserve <= 0) ? (
          <div className="text-gray-400 text-center py-1">
            <span className="text-xs">LP data unavailable</span>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

export const LiquidityCard = ({ className = '' }: LiquidityCardProps) => {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [orderAmount, setOrderAmount] = useState('');
  const [avaxAmount, setAvaxAmount] = useState('');
  const [lpAmount, setLpAmount] = useState('');
  const [removePreview, setRemovePreview] = useState<{
    orderAmount: number;
    avaxAmount: number;
  }>({ orderAmount: 0, avaxAmount: 0 });
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showALPStaking, setShowALPStaking] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState<{
    show: boolean;
    type: 'add-liquidity' | 'remove-liquidity';
  }>({ show: false, type: 'add-liquidity' });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    
    try {
      // Refresh both LP data and prices
      await Promise.all([
        refreshLP(),
        refreshPrices(),
        refreshOrder()
      ]);
      
      // Clear notification after 3 seconds
      setTimeout(() => {}, 3000);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const { lpData, isLoading: isLPLoading, error: lpError, forceRefresh: refreshLP } = useLPData();
  const { getTokenPrice, getAVAXPrice, refetch: refreshPrices } = useDexScreener();
  const { xOrderRemaining, xArenaRemaining } = useRemainingBalances();
  const { balance: orderBalance, isLoading: isOrderLoading, refresh: refreshOrder } = useTokenBalance('ORDER', {
    autoRefreshInterval: 0,
    refreshOnMount: true
  });

  // Auto-refresh all data when component mounts (triggered by key change)
  useEffect(() => {
    const refreshAllData = async () => {
      try {
        await Promise.all([
          refreshLP(),
          refreshPrices(),
          refreshOrder()
        ]);
        console.log('🔄 LiquidityCard data refreshed');
      } catch (error) {
        console.error('Failed to refresh LiquidityCard data:', error);
      }
    };

    refreshAllData();
  }, []); // Empty dependency array means this runs on mount
  
  // Calculate APY for the ALP staking button
  const totalRemainingValueUSD = useMemo(() => {
    const xOrderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.xORDER);
    const xArenaPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.xARENA);
    return (parseFloat(xOrderRemaining || '0') * xOrderPrice) + (parseFloat(xArenaRemaining || '0') * xArenaPrice);
  }, [xOrderRemaining, xArenaRemaining, getTokenPrice]);

  // For button APY, we'll use the total liquidity pool TVL as a proxy for total staked value
  const totalPoolValueUSD = useMemo(() => {
    return lpData?.totalTVL || 0;
  }, [lpData?.totalTVL]);
  
  const apyData = useALPAPY(totalPoolValueUSD, totalRemainingValueUSD);
  
  const { 
    step, 
    isLoading, 
    txHash,
    error,
    checkAllowance, 
    approveOrder, 
    addLiquidity, 
    removeLiquidity,
    checkLPAllowance,
    approveLPTokens,
    getQuote,
    reset 
  } = useLiquidity(refreshLP); // Pass refresh callback

  // Handle ORDER amount change and auto-calculate AVAX with debounce
  const handleOrderAmountChange = (value: string) => {
    setOrderAmount(value);
    if (mode === 'add' && !value) {
      setAvaxAmount('');
    }
  };

  // Handle LP amount change and calculate remove preview
  const handleLPAmountChange = (value: string) => {
    setLpAmount(value);
    
    if (mode === 'remove' && value && lpData && lpData.totalLPSupply > 0) {
      const lpPercent = Number(value) / lpData.totalLPSupply;
      const orderAmount = lpData.orderReserve * lpPercent;
      const avaxAmount = lpData.avaxReserve * lpPercent;
      
      setRemovePreview({
        orderAmount,
        avaxAmount
      });
    } else {
      setRemovePreview({ orderAmount: 0, avaxAmount: 0 });
    }
  };

  // Handle percentage buttons for remove mode
  const handlePercentageClick = (percentage: number) => {
    if (mode !== 'remove' || !lpData.userLPBalance) return;
    
    // Apply 1% slippage reduction for liquidity fragmentation
    const adjustedPercentage = percentage === 100 ? 99 : percentage;
    const amount = (lpData.userLPBalance * adjustedPercentage / 100).toFixed(6);
    handleLPAmountChange(amount);
  };

  // Auto-calculate AVAX amount when ORDER amount changes (with debounce)
  useEffect(() => {
    if (mode !== 'add' || !orderAmount || !lpData || lpData.orderReserve <= 0 || lpData.avaxReserve <= 0) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsCalculatingQuote(true);
        const requiredAvax = await getQuote(orderAmount, lpData.orderReserve, lpData.avaxReserve);
        if (requiredAvax !== null) {
          setAvaxAmount(requiredAvax.toFixed(6));
        }
      } catch (error) {
        console.error('Quote calculation error:', error);
      } finally {
        setIsCalculatingQuote(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [orderAmount, lpData?.orderReserve, lpData?.avaxReserve, mode, getQuote]);

  const [isCustomLoading, setIsCustomLoading] = useState(false);

  const handleSubmit = async () => {
    if (!orderAmount && !lpAmount) return;

    try {
      setIsCustomLoading(true);

      if (mode === 'add') {
        // Call real addLiquidity function
        const txHash = await addLiquidity(orderAmount, avaxAmount);
        
        // Show success popup after 12 seconds
        setTimeout(() => {
          setShowSuccessPopup({ show: true, type: 'add-liquidity' });
          
          // Hide popup after 3 more seconds
          setTimeout(() => {
            setShowSuccessPopup({ show: false, type: 'add-liquidity' });
          }, 3000);
        }, 12000);
        
        // Clear form immediately
        setOrderAmount('');
        setAvaxAmount('');
      } else {
        // Call real removeLiquidity function  
        const txHash = await removeLiquidity(lpAmount);
        
        // Show success popup after 12 seconds
        setTimeout(() => {
          setShowSuccessPopup({ show: true, type: 'remove-liquidity' });
          
          // Hide popup after 3 more seconds
          setTimeout(() => {
            setShowSuccessPopup({ show: false, type: 'remove-liquidity' });
          }, 3000);
        }, 12000);
        
        // Clear form immediately
        setLpAmount('');
        setRemovePreview({ orderAmount: 0, avaxAmount: 0 });
      }
    } catch (error: any) {
      console.error('Liquidity operation error:', error);
      
      // Show error immediately
      setTimeout(() => {
        setShowSuccessPopup({ show: false, type: 'add-liquidity' });
      }, 1000);
    } finally {
      setIsCustomLoading(false);
    }
  };

  const needsApproval = mode === 'add' && step === 'idle';
  const canSubmit = mode === 'add' ? (orderAmount && avaxAmount) : lpAmount;

  return (
    <div className={`bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900/20 rounded-xl border border-gray-700/50 p-6 shadow-2xl ${className}`}>
      {/* Powered by header */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <img src="/assets/arena-logo.png" alt="Arena" className="w-4 h-4 rounded-full" />
          <p className="text-xs font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
            Powered by The Arena DEX
          </p>
        </div>
      </div>
      
      {/* Header with Logo */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-10 h-10 rounded-full border-2 border-blue-400/50 overflow-hidden shadow-lg">
              <img 
                src="/order-logo.jpg" 
                alt="ORDER" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-blue-400/50 overflow-hidden shadow-lg">
              <img 
                src="/assets/avax-logo-showdetails.png" 
                alt="AVAX" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <span className="flex items-center gap-1">
                <img src="/order-logo.jpg" alt="ORDER" className="w-5 h-5 rounded-full" />
                <span className="ml-1">ORDER</span>
                <span className="mx-1">/</span>
                <img src="/assets/avax-logo-showdetails.png" alt="AVAX" className="w-5 h-5 rounded-full" />
                <span className="ml-1">AVAX</span>
              </span>
            </h3>
            <p className="text-sm text-gray-400">Liquidity Pool</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing || isLPLoading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-blue-500/25"
          >
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pool Stats with Error Handling */}
      {lpError ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-red-400 text-sm font-medium">⚠️ Failed to load pool data</p>
              <p className="text-red-300 text-xs mt-1">{lpError}</p>
              <p className="text-gray-400 text-xs mt-2">Data will be fetched only when you refresh manually or press F5</p>
            </div>
            <button
              onClick={handleRefreshAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition-all duration-200 flex items-center gap-2 ml-3"
              disabled={isRefreshing || isLPLoading}
            >
              {isRefreshing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Retry</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-blue-500/30 transition-all">
            <p className="text-xs text-gray-400 mb-1">Total TVL</p>
            <p className="text-sm font-semibold text-green-400">
              {isLPLoading ? '...' : formatUSD(lpData.totalTVL)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-yellow-500/30 transition-all">
            <p className="text-xs text-gray-400 mb-1">ORDER Reserve</p>
            <p className="text-sm font-semibold text-yellow-400">
              {isLPLoading ? '...' : formatCompactNumber(lpData.orderReserve)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              @ ${getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER).toFixed(6)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-red-500/30 transition-all">
            <p className="text-xs text-gray-400 mb-1">AVAX Reserve</p>
            <p className="text-sm font-semibold text-red-400">
              {isLPLoading ? '...' : formatNumber(lpData.avaxReserve, 2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              @ ${getAVAXPrice().toFixed(2)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-purple-500/30 transition-all">
            <p className="text-xs text-gray-400 mb-1">Your Share</p>
            <p className="text-sm font-semibold text-purple-400">
              {isLPLoading ? '...' : `${lpData.userShare.toFixed(4)}%`}
            </p>
          </div>
        </div>
      )}

      {/* Your LP Position (if user has LP tokens) */}
      {lpData.userLPBalance > 0 && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-blue-300 mb-3">Your LP Position</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">LP Tokens</p>
              <p className="text-lg font-bold text-white">{formatNumber(lpData.userLPBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Share Value</p>
              <div className="text-sm text-white">
                <div className="flex items-center gap-1">
                  <img src="/order-logo.jpg" alt="ORDER" className="w-4 h-4 rounded-full" />
                  <span>{formatNumber(lpData.userOrderValue)} ORDER</span>
                  <span className="text-xs text-green-400">
                    ({formatUSD(lpData.userOrderValue * getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER))})
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <img src="/assets/avax-logo-showdetails.png" alt="AVAX" className="w-4 h-4 rounded-full" />
                  <span>{formatNumber(lpData.userAvaxValue)} AVAX</span>
                  <span className="text-xs text-green-400">
                    ({formatUSD(lpData.userAvaxValue * getAVAXPrice())})
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="text-xs text-gray-400">Total Position Value</p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatUSD((lpData.userOrderValue * getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER)) + (lpData.userAvaxValue * getAVAXPrice()))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex bg-gray-800/50 backdrop-blur rounded-lg p-1 mb-6 border border-gray-700/50">
        <button
          onClick={() => setMode('add')}
          className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
            mode === 'add'
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setMode('remove')}
          className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
            mode === 'remove'
              ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/25'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          Remove Liquidity
        </button>
      </div>

      {/* Input Section */}
      {mode === 'add' ? (
        <div className="space-y-4">
          {/* Wallet Balance Info */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Available ORDER:</span>
              <span className="text-white">
                {isOrderLoading ? '...' : `${formatNumber(parseFloat(orderBalance))} ORDER`}
              </span>
            </div>
          </div>

          {/* ORDER Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              ORDER Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => handleOrderAmountChange(e.target.value)}
                placeholder="0.0"
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:bg-gray-800 focus:outline-none transition-all backdrop-blur-sm"
              />
              <button
                onClick={() => handleOrderAmountChange(orderBalance)}
                className="absolute right-3 top-3 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition-all"
              >
                MAX
              </button>
            </div>
          </div>

          {/* AVAX Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              AVAX Amount {mode === 'add' && '(Auto-calculated)'}
              {isCalculatingQuote && <span className="text-blue-400 ml-2">Calculating...</span>}
            </label>
            <div className="relative">
              <input
                type="number"
                value={avaxAmount}
                onChange={(e) => setAvaxAmount(e.target.value)}
                placeholder={isCalculatingQuote ? "Calculating..." : "0.0"}
                readOnly={mode === 'add'}
                className={`w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:bg-gray-800 focus:outline-none transition-all backdrop-blur-sm ${
                  mode === 'add' ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              />
              {isCalculatingQuote && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* LP Balance Info */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Available LP Tokens:</span>
              <span className="text-white">
                {isLPLoading ? '...' : `${formatNumber(lpData.userLPBalance)} LP`}
              </span>
            </div>
          </div>

          {/* LP Amount Input with Percentage Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              LP Tokens to Remove
            </label>
            
            {/* Percentage Buttons */}
            <div className="flex gap-2 mb-2">
              {[25, 50, 75, 100].map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => handlePercentageClick(percentage)}
                  className="flex-1 px-3 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded border border-gray-600/50 hover:border-red-500/50 transition-all"
                >
                  {percentage === 100 ? '99%' : `${percentage}%`}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <input
                type="number"
                value={lpAmount}
                onChange={(e) => handleLPAmountChange(e.target.value)}
                placeholder="0.0"
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:bg-gray-800 focus:outline-none transition-all backdrop-blur-sm"
              />
              <button
                onClick={() => handleLPAmountChange((lpData.userLPBalance * 0.99).toFixed(6))}
                className="absolute right-3 top-3 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-all"
              >
                99%
              </button>
            </div>
          </div>

          {/* Remove Preview */}
          {lpAmount && removePreview.orderAmount > 0 && (
            <div className="bg-gradient-to-r from-gray-800/50 to-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm font-medium text-red-300 mb-2">📤 You will receive:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400">ORDER</p>
                  <p className="text-sm font-semibold text-yellow-400">
                    {formatCompactNumber(removePreview.orderAmount)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">AVAX</p>
                  <p className="text-sm font-semibold text-red-400">
                    {formatNumber(removePreview.avaxAmount, 4)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isCustomLoading}
        className={`w-full mt-6 py-4 px-4 rounded-lg font-semibold text-white transition-all duration-300 transform ${
          mode === 'add'
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
            : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-500/25 hover:shadow-red-500/40'
        } disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none hover:scale-105 disabled:hover:scale-100`}
      >
        {isCustomLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            {mode === 'add' ? 'Processing Addition...' : 'Processing Removal...'}
          </span>
        ) : (
          <>
            {mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
          </>
        )}
      </button>

      {/* ALP Staking Button with Refresh */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => setShowALPStaking(true)}
          className="flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 transform bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <img src="/order-logo.jpg" alt="ORDER" className="w-5 h-5 rounded-full" />
              <span>/</span>
              <img src="/assets/avax-logo-showdetails.png" alt="AVAX" className="w-5 h-5 rounded-full" />
            </div>
            <span>ALP Stake</span>
          </div>
          <div className="flex items-center gap-2">
            {apyData.apy !== null && !apyData.isEnded && totalRemainingValueUSD > 0 && totalPoolValueUSD > 0 ? (
              <div className="bg-green-500/20 border border-green-500/30 rounded-full px-2 py-1">
                <span className="text-green-300 text-sm font-bold">
                  %APY {'{Boost}'} [REDACTED]
                </span>
              </div>
            ) : totalRemainingValueUSD > 0 ? (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-full px-2 py-1">
                <span className="text-blue-300 text-xs">
                  %APY {'{Boost}'} [REDACTED]
                </span>
              </div>
            ) : null}
            <span className="text-lg">🚀</span>
          </div>
        </button>
        
        {/* APY Refresh Button */}
        <button
          onClick={async () => {
            setIsRefreshing(true);
            await refreshLP();
            setTimeout(() => setIsRefreshing(false), 1000);
          }}
          disabled={isRefreshing}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white p-3 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
          title="Refresh APY Data"
        >
          <RefreshCw 
            size={18} 
            className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin' : 'hover:rotate-180'}`} 
          />
        </button>
      </div>
      <TotalStakedALPInfoCard />

      {/* Success Popup */}
      <SuccessPopup
        show={showSuccessPopup.show}
        type={showSuccessPopup.type}
      />

      {/* Disclaimer */}
      <div className="mt-6 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-400">
          <span className="text-lg">⚠️</span>
          <p className="text-xs font-medium">
            Adding liquidity involves impermanent loss risk. DYOR.
          </p>
        </div>
      </div>

      {/* ALP Staking Modal */}
      {showALPStaking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-gray-900 border-2 border-purple-500 rounded-xl shadow-2xl w-full mx-4 max-h-[95vh] overflow-y-auto relative">
            <button
              onClick={() => setShowALPStaking(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-400 text-xl font-bold z-10 bg-gray-800 hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 shadow-lg"
            >
              ×
            </button>
            <div className="p-4 sm:p-5">
              <ALPStakingCard className="border-0 bg-transparent shadow-none p-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
