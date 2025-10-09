import { useState, useEffect } from 'react';
import { useStakingContract } from '@/hooks/useStakingContract';
import { usePoolData } from '@/hooks/usePoolData';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useContractData } from '@/hooks/useContractData';
import { formatNumber } from '@/utils/formatters';
import { sanitizeNumericInput, validateStakingAmount, safeParseFloat, numberToInputString } from '@/utils/inputValidation';

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (type: 'stake' | 'unstake' | 'claim') => void;
  mode: 'stake' | 'unstake' | 'claim';
  poolType: 'ORDER_ORDER' | 'ORDER_WITCH' | 'ORDER_KOKSAL' | 'ORDER_STANK' | 'ORDER_xORDER' | 'ORDER_xARENA';
  stakingToken: string;
  rewardToken: string;
  stakingTokenLogo: string;
  rewardTokenLogo: string;
}

export const StakingModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  mode, 
  poolType, 
  stakingToken, 
  rewardToken,
  stakingTokenLogo,
  rewardTokenLogo,
}: StakingModalProps) => {
  const [amount, setAmount] = useState('');
  const [approveCompleted, setApproveCompleted] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [showSwapGuidePopup, setShowSwapGuidePopup] = useState(false);

  // Safe amount input handler
  const handleAmountChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setAmount(sanitized);
  };

  // Safe amount setter for button clicks
  const setAmountSafe = (value: number) => {
    const stringValue = numberToInputString(value);
    setAmount(stringValue);
  };

  // Clear amount when modal is closed or mode changes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setApproveCompleted(false);
      setNotification(null);
    }
  }, [isOpen]);

  // Clear amount when mode changes
  useEffect(() => {
    setAmount('');
  }, [mode]);

  const { 
    step, 
    isLoading, 
    allowance, 
    isStakeSuccess,
    isClaimSuccess,
    isUnstakeSuccess,
    approve, 
    stake, 
    claim, 
    unstake,
    reset 
  } = useStakingContract(poolType);
  
  const poolData = usePoolData(poolType);
  const { balance: walletBalance, isLoading: isBalanceLoading, refresh: refreshBalance } = useTokenBalance('ORDER', {
    autoRefreshInterval: 0, // No auto refresh
    refreshOnMount: false   // Don't fetch when component mounts - only via refresh button
  }); // Her zaman ORDER token balance'ını al

  // Debug: Modal açıldığında wallet balance durumunu logla
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 StakingModal Debug (ORDER Balance):', {
        orderWalletBalance: walletBalance,
        isOrderBalanceLoading: isBalanceLoading,
        orderBalanceParsed: parseFloat(walletBalance),
        poolType,
        modalMode: mode,
        stakingTokenForPool: stakingToken // Pool token'ı (farklı olabilir)
      });
      
      // Modal açıldığında ORDER balance'ı fresh olarak çek (sadece bir kez)
      refreshBalance();
    }
  }, [isOpen]); // Sadece modal açıldığında fetch et, diğer değişikliklerde değil

  // Success durumunda 5 saniye sonra modalı otomatik kapat
  // Approve harici success durumunda 5 saniye sonra modalı kapat
  useEffect(() => {
    if (notification?.type === 'success') {
      // Approve success mesajı ise modalı kapatma
      if (notification.message.includes('approved')) return;
      const timer = setTimeout(() => {
        setNotification(null);
        onClose();
  }, 18000);
      return () => clearTimeout(timer);
    }
  }, [notification?.type, notification?.message, onClose]);





  // Clear notification and reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setAmount('');
      setApproveCompleted(false);
      setNotification(null);
    }
  }, [isOpen, reset]);

  const showStakeButton = mode === 'stake' && (
    approveCompleted || 
    (safeParseFloat(allowance || '0') >= safeParseFloat(amount || '0') && amount)
  );

  // Unlimited approve: needsApproval only if allowance is very small (e.g. < 1)
  const needsApproval = mode === 'stake' && 
    (allowance === undefined || allowance === null || safeParseFloat(allowance) < 1);

  let txnTimer: NodeJS.Timeout | null = null;

  const handleSubmit = async () => {
    if (!amount && mode !== 'claim') return;

    console.log('🚀 Transaction Starting:', {
      mode,
      amount,
      allowance,
      needsApproval,
      showStakeButton,
      approveCompleted
    });

    try {
      if (mode === 'stake') {
        if (needsApproval) {
          console.log('💰 Starting approval flow...');
          setNotification({
            type: 'info',
            message: `⏳ Approving ${stakingToken} spending...`
          });
          const txHash = await approve();
          console.log('✅ Approval transaction:', txHash);
          setTimeout(() => {
            setApproveCompleted(true);
            setNotification({
              type: 'success',
              message: `✅ ${stakingToken} approved! Click "Stake" button below.`
            });
          }, 2000);
        } else {
          console.log('🎯 Starting stake transaction...');
          setNotification({
            type: 'info',
            message: `⏳ Staking ${amount} ${stakingToken}...`
          });
          // 10 saniye sonra modalı kapat
          txnTimer = setTimeout(() => {
            // Refresh ORDER balance after successful stake
            refreshBalance();
            if (onSuccess) onSuccess('stake');
            if (onClose) onClose();
          }, 18000);
          const numAmount = safeParseFloat(amount);
          if (numAmount <= 0) {
            throw new Error('Invalid amount');
          }
          const txHash = await stake(numAmount);
          console.log('✅ Stake transaction:', txHash);
          
          // Clear the amount immediately to prevent reuse
          setAmount('');
          
          // Multiple refresh attempts
          setTimeout(() => refreshBalance(), 2000);
          setTimeout(() => refreshBalance(), 5000);
          setTimeout(() => refreshBalance(), 10000);
          
          setNotification({
            type: 'success',
            message: `✅ Staked successfully! TX: ${txHash.slice(0, 10)}... Modal closing...`
          });
          
          // Auto-close with final refresh
          setTimeout(() => {
            refreshBalance(); 
            if (onSuccess) onSuccess('stake');
            if (onClose) onClose();
          }, 15000);
        }
      } else if (mode === 'unstake') {
        setNotification({
          type: 'info',
          message: `⏳ Unstaking ${amount} ${stakingToken}...`
        });
        // 10 saniye sonra modalı kapat
        txnTimer = setTimeout(() => {
          // Refresh ORDER balance after successful unstake  
          refreshBalance();
          if (onSuccess) onSuccess('unstake');
          if (onClose) onClose();
  }, 18000);
        const numAmount = safeParseFloat(amount);
        if (numAmount <= 0) {
          throw new Error('Invalid amount');
        }
        const txHash = await unstake(numAmount);
        
        // Clear the amount immediately to prevent reuse
        setAmount('');
        
        // Multiple refresh attempts
        setTimeout(() => refreshBalance(), 2000);
        setTimeout(() => refreshBalance(), 5000);
        setTimeout(() => refreshBalance(), 10000);
        
        setNotification({
          type: 'success',
          message: `✅ Unstaked successfully! TX: ${txHash.slice(0, 10)}... Modal closing...`
        });
      } else if (mode === 'claim') {
        setNotification({
          type: 'info',
          message: `⏳ Claiming ${rewardToken} rewards...`
        });
        // 10 saniye sonra modalı kapat
        txnTimer = setTimeout(() => {
          // Refresh ORDER balance after successful claim
          refreshBalance();
          if (onSuccess) onSuccess('claim');
          if (onClose) onClose();
  }, 18000);
        const txHash = await claim();
        
        // Multiple refresh attempts for claim
        setTimeout(() => refreshBalance(), 2000);
        setTimeout(() => refreshBalance(), 5000);
        setTimeout(() => refreshBalance(), 10000);
        
        setNotification({
          type: 'success',
          message: `✅ Claimed successfully! TX: ${txHash.slice(0, 10)}... Modal closing...`
        });
        
        // Auto-close with final refresh
        setTimeout(() => {
          refreshBalance();
          if (onSuccess) onSuccess('claim');
          if (onClose) onClose();
        }, 15000);
      }
    } catch (error: unknown) {
      if (txnTimer) clearTimeout(txnTimer);
      console.error('Transaction error:', error);
      let errorMessage = 'Transaction failed. Please try again.';
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg?.includes('User rejected')) {
        errorMessage = 'Transaction was cancelled by user.';
      } else if (errorMsg?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction.';
      } else if (errorMsg?.includes('Arena wallet not connected')) {
        errorMessage = 'Please connect your Arena wallet first.';
      }
      setNotification({
        type: 'error',
        message: `❌ ${errorMessage}`
      });
      setApproveCompleted(false);
    }
  };

  const getButtonColor = () => {
    if (needsApproval) return 'bg-yellow-600 hover:bg-yellow-700';
    if (mode === 'stake') return 'bg-primary hover:bg-primary-dark';
    if (mode === 'claim') return 'bg-green-600 hover:bg-green-700';
    if (mode === 'unstake') return 'bg-red-600 hover:bg-red-700';
    return 'bg-gray-600 hover:bg-gray-700';
  };

  const getStepText = () => {
    switch (step) {
      case 'approving': return 'Approving...';
      case 'staking': return 'Staking...';
      case 'claiming': return 'Claiming...';
      case 'unstaking': return 'Unstaking...';
      default: {
        if (needsApproval) return 'Approve';
        if (mode === 'stake') return 'Stake';
        if (mode === 'claim') return 'Claim';
        return 'Unstake';
      }
    }
  };

  const getNotificationStyles = (type: string) => {
    if (type === 'success') return 'bg-green-900/20 border-green-600 text-green-400';
    if (type === 'info') return 'bg-blue-900/20 border-blue-600 text-blue-400';
    return 'bg-red-900/20 border-red-600 text-red-400';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white capitalize">
            {mode} {stakingToken}
            {mode !== 'claim' && (
              <span className="text-gray-400"> → {rewardToken}</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* User Stats */}
          <div className="bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Your Staked:</span>
              <span className="text-white">{formatNumber(poolData.userStaked, 4)} {stakingToken}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-400">Pending Rewards:</span>
              <span className="text-primary flex items-center gap-1">
                {formatNumber(poolData.userEarned, 4)}
                <img src={rewardTokenLogo} alt={rewardToken} className="w-4 h-4 inline-block align-middle" />
                {rewardToken}
              </span>
            </div>
          </div>

          {/* Information Note for xORDER and xARENA */}
          {(poolType === 'ORDER_xORDER' || poolType === 'ORDER_xARENA') && (
            <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSwapGuidePopup(true)}
                  className="relative group focus:outline-none transition-all duration-300 hover:scale-110"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-400 shadow-lg shadow-blue-400/40 group-hover:shadow-blue-300/80 group-hover:border-blue-300">
                    {/* Blurred logo background */}
                    <img
                      src={rewardToken === 'xORDER' ? '/order-logo.jpg' : 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F3c461417-92b8-04bb-841c-945306c77c2b1749435408088.jpeg&w=96&q=75'}
                      alt={rewardToken}
                      className="w-full h-full object-cover"
                      style={{ filter: 'blur(3px) brightness(0.7)' }}
                    />
                    {/* Question mark overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-lg font-bold drop-shadow-lg">?</span>
                    </div>
                  </div>
                </button>
                <div className="text-blue-200 text-xs">
                  Click to see <strong className="text-blue-100">How to swap {rewardToken}</strong> guide
                </div>
              </div>
            </div>
          )}

          {/* Swap Guide Popup */}
          {showSwapGuidePopup && (poolType === 'ORDER_xORDER' || poolType === 'ORDER_xARENA') && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <img 
                      src={rewardToken === 'xORDER' ? '/order-logo.jpg' : 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F3c461417-92b8-04bb-841c-945306c77c2b1749435408088.jpeg&w=96&q=75'}
                      alt={rewardToken}
                      className="w-6 h-6 rounded-full border border-orange-400"
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
                    <p className="mb-4 text-sm">
                      <strong className="text-blue-300">{rewardToken}</strong> tokens need to be imported into The Arena Wallet to be visible and tradeable. Follow these steps:
                    </p>
                    
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <h3 className="text-base font-semibold text-orange-300 mb-3">Step-by-step Guide:</h3>
                      <ol className="list-decimal list-inside space-y-2 text-xs">
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
                    <div className="bg-gray-800/50 rounded-lg p-2 border border-blue-400/30">
                      <img 
                        src="/assets/arena-wallet-guide.png" 
                        alt="Arena Wallet Guide - How to import and use xORDER/xARENA tokens"
                        className="w-full h-auto rounded-md border border-gray-600"
                        style={{ maxHeight: '300px', objectFit: 'contain' }}
                      />
                      <p className="text-xs text-blue-300/80 text-center mt-1">
                        Arena Wallet Interface - Import & Swap Guide
                      </p>
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mt-4">
                      <p className="text-yellow-300 text-xs">
                        <strong>Important:</strong> After claiming {rewardToken}, you won't see it in your wallet immediately. You must import it using the contract address to make it visible.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowSwapGuidePopup(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sexy Wallet Balance Card - Only for stake mode */}
          {mode === 'stake' && (
            <div className="relative bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-indigo-900/30 border border-blue-500/30 rounded-xl p-4 mb-4 overflow-hidden">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center p-1">
                      <img 
                        src={stakingTokenLogo} 
                        alt={stakingToken} 
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          // Fallback logo eğer resim yüklenemezse
                          e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23f97316'/%3E%3Ctext x='12' y='16' text-anchor='middle' font-size='10' font-weight='bold' fill='white'%3E${stakingToken.charAt(0)}%3C/text%3E%3C/svg%3E`;
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-blue-200">Your Wallet</span>
                    <button
                      onClick={refreshBalance}
                      disabled={isBalanceLoading}
                      className="w-6 h-6 bg-blue-800/40 hover:bg-blue-700/60 border border-blue-600/30 text-blue-300 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 disabled:opacity-50"
                      title="Refresh balance"
                    >
                      <svg 
                        className={`w-3 h-3 ${isBalanceLoading ? 'animate-spin' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-xs text-blue-300 bg-blue-900/40 px-2 py-1 rounded-full">
                    💼 Available
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  {isBalanceLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-8 bg-gray-700 rounded animate-pulse"></div>
                      <span className="text-gray-400 animate-pulse">●●●</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-cyan-300">
                        {formatNumber(parseFloat(walletBalance || '0'))}
                      </span>
                      <span className="text-lg font-semibold text-blue-200">
                        {stakingToken}
                      </span>
                    </>
                  )}
                </div>
                
                {/* Quick action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setAmountSafe(safeParseFloat(walletBalance || '0') * 0.25)}
                    disabled={isBalanceLoading}
                    className="flex-1 bg-blue-800/40 hover:bg-blue-700/60 border border-blue-600/30 text-blue-200 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setAmountSafe(safeParseFloat(walletBalance || '0') * 0.5)}
                    disabled={isBalanceLoading}
                    className="flex-1 bg-purple-800/40 hover:bg-purple-700/60 border border-purple-600/30 text-purple-200 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setAmountSafe(safeParseFloat(walletBalance || '0') * 0.75)}
                    disabled={isBalanceLoading}
                    className="flex-1 bg-indigo-800/40 hover:bg-indigo-700/60 border border-indigo-600/30 text-indigo-200 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setAmountSafe(safeParseFloat(walletBalance || '0') * 0.99)}
                    disabled={isBalanceLoading}
                    className="flex-1 bg-gradient-to-r from-cyan-800/40 to-blue-800/40 hover:from-cyan-700/60 hover:to-blue-700/60 border border-cyan-600/30 text-cyan-200 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 font-semibold"
                  >
                    99%
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sexy Staked Balance Card - Only for unstake mode */}
          {mode === 'unstake' && (
            <div className="relative bg-gradient-to-br from-red-900/30 via-orange-900/20 to-yellow-900/30 border border-red-500/30 rounded-xl p-4 mb-4 overflow-hidden">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 animate-pulse"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-400 to-orange-500 flex items-center justify-center">
                      <img src={stakingTokenLogo} alt={stakingToken} className="w-5 h-5 rounded-full object-cover" />
                    </div>
                    <span className="text-sm font-medium text-red-200">Your Staked</span>
                  </div>
                  <div className="text-xs text-red-300 bg-red-900/40 px-2 py-1 rounded-full">
                    🔒 Locked
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-orange-300 to-yellow-300">
                    {formatNumber(poolData.userStaked)}
                  </span>
                  <span className="text-lg font-semibold text-red-200">
                    {stakingToken}
                  </span>
                </div>
                
                {/* Quick action buttons for unstake */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setAmountSafe(poolData.userStaked * 0.25)}
                    className="flex-1 bg-red-800/40 hover:bg-red-700/60 border border-red-600/30 text-red-200 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setAmountSafe(poolData.userStaked * 0.5)}
                    className="flex-1 bg-orange-800/40 hover:bg-orange-700/60 border border-orange-600/30 text-orange-200 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setAmountSafe(poolData.userStaked * 0.75)}
                    className="flex-1 bg-yellow-800/40 hover:bg-yellow-700/60 border border-yellow-600/30 text-yellow-200 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setAmountSafe(poolData.userStaked * 0.99)}
                    className="flex-1 bg-gradient-to-r from-yellow-800/40 to-red-800/40 hover:from-yellow-700/60 hover:to-red-700/60 border border-yellow-600/30 text-yellow-200 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-105 font-semibold"
                  >
                    99%
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input (for stake/unstake) */}
          {mode !== 'claim' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Amount to {mode}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={(e) => {
                    // Validate and clean up on focus loss
                    const value = e.target.value;
                    if (value && !isNaN(parseFloat(value))) {
                      setAmount(numberToInputString(parseFloat(value)));
                    }
                  }}
                  placeholder="0.0"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                />
                <span className="absolute right-3 top-3 text-gray-400 text-sm">
                  {stakingToken}
                </span>
              </div>
            </div>
          )}

          {/* Info sadece claim mode için (çünkü stake ve unstake'de artık fancy card'lar var) */}
          {mode === 'claim' && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              <span className="flex items-center justify-center gap-1">
                Available Rewards: {formatNumber(poolData.userEarned)}
                <img src={stakingTokenLogo} alt={stakingToken} className="w-4 h-4 ml-1 inline-block align-middle" />
              </span>
            </div>
          )}

          {/* Approval Notice */}
          {needsApproval && (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                ⚠️ You need to approve {stakingToken} spending first
              </p>
            </div>
          )}

          {/* Notification Area */}
          {notification && (
            <div className={`rounded-lg p-4 border ${getNotificationStyles(notification.type)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{notification.message}</span>
                <button 
                  onClick={() => setNotification(null)}
                  className="ml-2 text-current hover:opacity-70"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Show Approve button if needed, otherwise Stake/Claim/Unstake */}
            {needsApproval && mode === 'stake' ? (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>Approve</span>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={Boolean(isLoading || ((mode !== 'claim') && (!amount || amount === '')))}
                className={`w-full ${getButtonColor()} disabled:bg-gray-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2`}
              >
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{getStepText()}</span>
              </button>
            )}
          </div>

          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
