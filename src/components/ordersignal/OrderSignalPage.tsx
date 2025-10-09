import React, { useState, useEffect } from 'react';
import { useOrderSignal } from '@/hooks/useOrderSignal';
import { useWallet } from '@/hooks/useWallet';
import { ArenaConnectButton } from '@/components/arena/ArenaConnectButton';
import { ArenaStatusBanner } from '@/components/arena/ArenaStatusBanner';
import { SignalDashboard } from '@/components/ordersignal/SignalDashboard';
import { Loader2, TrendingUp, Clock, Flame, Shield, CheckCircle, XCircle, Home } from 'lucide-react';
import Link from 'next/link';

export const OrderSignalPage = () => {
  const { isConnected, address } = useWallet();
  const { 
    userAccess, 
    contractInfo, 
    loading, 
    error, 
    purchaseAccess, 
    getOrderBalance 
  } = useOrderSignal();
  
  const [orderBalance, setOrderBalance] = useState<string>('0');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Fetch ORDER balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && address) {
        const balance = await getOrderBalance();
        setOrderBalance(balance);
      }
    };
    fetchBalance();
    
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isConnected, address, getOrderBalance]);

  // Handle purchase access
  const handlePurchaseAccess = async () => {
    setIsPurchasing(true);
    try {
      await purchaseAccess();
      // Success - access info will be updated automatically
    } catch (err: any) {
      console.error('Failed to purchase access:', err);
      alert(err.message || 'Failed to purchase access. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Format remaining time display
  const formatRemainingTime = () => {
    if (!userAccess) return '';
    const { daysLeft, hoursLeft, minutesLeft } = userAccess;
    
    if (daysLeft! > 0) {
      return `${daysLeft}d ${hoursLeft}h ${minutesLeft}m`;
    } else if (hoursLeft! > 0) {
      return `${hoursLeft}h ${minutesLeft}m`;
    } else {
      return `${minutesLeft}m`;
    }
  };

  // If user has access, show signal dashboard
  if (isConnected && userAccess?.hasValidAccess) {
    return (
      <div className="min-h-screen bg-gradient-primary text-text-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            {/* Left side - Back to Home */}
            <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors duration-200">
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            
            {/* Center - Title */}
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-10 h-10 text-accent-primary" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                  OrderPremium+
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary">Advanced Trading Signals</p>
              </div>
            </div>
            
            {/* Right side - Arena Connect */}
            <div className="flex justify-end items-center">
              <ArenaConnectButton />
            </div>
          </div>

          {/* Arena Status Banner */}
          <div className="mb-8">
            <ArenaStatusBanner />
          </div>

          {/* Access Info Banner */}
          <div className="mb-6 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    ✅ Premium Access Active
                  </p>
                  <p className="text-xs text-text-secondary">
                    Expires: {userAccess.expiryDate?.toLocaleDateString()} {userAccess.expiryDate?.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-surface-elevated px-4 py-2 rounded-lg border border-border-primary">
                <Clock className="w-4 h-4 text-accent-primary" />
                <span className="text-sm font-bold text-accent-primary">
                  {formatRemainingTime()} remaining
                </span>
              </div>
            </div>
          </div>

          {/* Signal Dashboard */}
          <SignalDashboard />
        </div>
      </div>
    );
  }

  // Access Gate - Purchase Required
  return (
    <div className="min-h-screen bg-gradient-primary text-text-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-10 h-10 text-accent-primary" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                OrderPremium+
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">Advanced Trading Signals</p>
            </div>
          </div>
          <div className="flex justify-end items-center">
            <ArenaConnectButton />
          </div>
        </div>

        {/* Arena Status Banner */}
        <div className="mb-8">
          <ArenaStatusBanner />
        </div>

        {!isConnected ? (
          /* Connect Wallet Prompt */
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-surface border border-border-primary rounded-2xl p-8 text-center">
              <Shield className="w-16 h-16 text-accent-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-text-secondary mb-6">
                Connect your Arena wallet to access OrderPremium+ premium trading signals
              </p>
              <div className="flex justify-center">
                <ArenaConnectButton />
              </div>
            </div>
          </div>
        ) : (
          /* Purchase Access Screen */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Access Expired Banner */}
            {userAccess && !userAccess.hasValidAccess && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-300">
                      Your access has expired
                    </p>
                    <p className="text-xs text-red-400/70">
                      Purchase access again to continue using OrderPremium+
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Purchase Card */}
            <div className="bg-gradient-surface border border-border-primary rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-accent-primary/20 rounded-full mb-4">
                  <Flame className="w-10 h-10 text-accent-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Premium Access Required</h2>
                <p className="text-text-secondary">
                  Burn ORDER tokens to unlock 30 days of advanced trading signals
                </p>
              </div>

              {/* Pricing Info */}
              <div className="bg-surface-elevated border border-border-primary rounded-xl p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-tertiary text-sm mb-1">Access Fee</p>
                    <p className="text-2xl font-bold text-accent-primary">
                      {contractInfo ? Number(contractInfo.currentAccessFee).toLocaleString() : '...'} ORDER
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary text-sm mb-1">Duration</p>
                    <p className="text-2xl font-bold text-text-primary">
                      30 Days
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary text-sm mb-1">Your Balance</p>
                    <p className={`text-xl font-bold ${
                      Number(orderBalance) >= Number(contractInfo?.currentAccessFee || '0')
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                      {Number(orderBalance).toLocaleString()} ORDER
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary text-sm mb-1">Total Burned</p>
                    <p className="text-xl font-bold text-orange-400">
                      {contractInfo ? Number(contractInfo.totalTokensBurned).toLocaleString() : '...'} ORDER
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchaseAccess}
                disabled={
                  isPurchasing || 
                  loading || 
                  !contractInfo ||
                  Number(orderBalance) < Number(contractInfo?.currentAccessFee || '0')
                }
                className="w-full bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-primary/90 hover:to-accent-secondary/90 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {isPurchasing || loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : Number(orderBalance) < Number(contractInfo?.currentAccessFee || '0') ? (
                  <>
                    <XCircle className="w-5 h-5" />
                    <span>Insufficient ORDER Balance</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5" />
                    <span>Burn {contractInfo?.currentAccessFee} ORDER & Get Access</span>
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-elevated border border-border-primary rounded-xl p-4 text-center">
                <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <h4 className="font-bold mb-1">Deflationary</h4>
                <p className="text-xs text-text-tertiary">
                  All tokens are burned to 0xdead address
                </p>
              </div>
              <div className="bg-surface-elevated border border-border-primary rounded-xl p-4 text-center">
                <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h4 className="font-bold mb-1">30 Days Access</h4>
                <p className="text-xs text-text-tertiary">
                  Unlimited signals for 30 days
                </p>
              </div>
              <div className="bg-surface-elevated border border-border-primary rounded-xl p-4 text-center">
                <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h4 className="font-bold mb-1">Premium Signals</h4>
                <p className="text-xs text-text-tertiary">
                  Institutional-grade analysis tools
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
