'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useArenaSDK } from '@/hooks/useArenaSDK';
import { useFactoryHook } from '@/hooks/useFactoryHook';
import { useEcosystemPools } from '@/hooks/useEcosystemPools';
import { useUserPoolsInfo } from '@/hooks/useUserPoolsInfo';
import { useEcosystemAccess } from '@/hooks/useEcosystemAccess';
import { PoolData } from '@/services/githubDataService';
import { EcosystemStakingCardSimplified } from './EcosystemStakingCardSimplified';
import { CreateStakingForm } from './CreateStakingForm';
import { DisclaimerModal } from './DisclaimerModal';
import { AccessModal } from './AccessModal';
import { ArenaConnectButton } from '@/components/arena/ArenaConnectButton';
import { ArenaStatusBanner } from '@/components/arena/ArenaStatusBanner';
import { VerifiedPools, VERIFIED_POOLS_COUNT } from './VerifiedPools';
import { SearchProvider, useSearchContext } from '@/contexts/SearchContext';
import { Loader2, Plus, Sparkles, ArrowLeft, AlertTriangle, Search, Wallet, Trophy, Shield, Crown, Flame, Clock, CheckCircle } from 'lucide-react';

const DISCLAIMER_KEY = 'ecosystem-disclaimer-accepted';

const EcosystemStakingPageContent: React.FC = () => {
  const router = useRouter();
  const { address, isConnected: walletConnected, sdk } = useArenaSDK();
  
  // GitHub Indexer Hook for pool data (primary data source)
  const { 
    pools, 
    totalPoolsCount, 
    isLoading, 
    error,
    isDataAvailable,
    searchPools,
    getUserCreatedPools,
    getUserStakedPools,
    getAllPools,
    refreshData
  } = useEcosystemPools();
  
  // Factory Hook ONLY for pool creation
  const { 
    isLoading: factoryLoading, 
    isConnected: factoryConnected, 
    createPool,
    approveOrder,
    orderBalance: factoryOrderBalance,
    orderAllowance,
    isWhitelisted: factoryIsWhitelisted,
    error: factoryError
  } = useFactoryHook();
  const { accessInfo, orderBalance, canCreatePools, hasMonthlyAccess, isWhitelisted, purchaseMonthlyAccess, loading: accessLoading } = useEcosystemAccess();
  const { searchInPool } = useSearchContext();
  
  // Local state for UI
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'staked' | 'created' | 'verified'>('all');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [isPurchasingAccess, setIsPurchasingAccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Simple connection state (use wallet connection)
  const isConnected = walletConnected && sdk;
  
  // Filtered pools based on search and tab
  const [filteredPools, setFilteredPools] = useState<PoolData[]>([]);
  
  // Use simple debounce for search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Check if disclaimer was previously accepted
  useEffect(() => {
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    if (accepted === 'true') {
      setDisclaimerAccepted(true);
    } else {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
  };

  const handleShowDisclaimer = () => {
    setShowDisclaimer(true);
  };

  const handlePurchaseAccess = async () => {
    console.log('🎯 handlePurchaseAccess called');
    setIsPurchasingAccess(true);
    try {
      console.log('🔥 Calling purchaseMonthlyAccess...');
      await purchaseMonthlyAccess();
      console.log('✅ Purchase successful, closing modal');
      setShowAccessModal(false);
    } catch (err: any) {
      console.error('❌ Failed to purchase access:', err);
      // Error is already handled in the hook
    } finally {
      setIsPurchasingAccess(false);
    }
  };

  // Get user's staking info for all pools
  const poolAddresses = useMemo(() => pools.map(p => p.address), [pools]);
  const { userPoolsInfo, isLoading: isLoadingUserInfo } = useUserPoolsInfo(poolAddresses);

  // Local function to filter pools where user has stakes
  const getLocalUserStakedPools = useCallback(() => {
    if (!address || !pools.length) return [];
    
    console.log('🔍 [YOUR_STAKE] Getting user staked pools:', {
      address,
      poolsCount: pools.length,
      userPoolsInfoSize: userPoolsInfo.size,
      userPoolsInfoData: Array.from(userPoolsInfo.entries()).map(([addr, info]) => ({
        address: addr,
        hasStake: info.hasStake,
        stakedAmount: info.stakedAmount
      }))
    });
    
    // Filter pools based on userPoolsInfo data
    const stakedPools = pools.filter(pool => {
      const userInfo = userPoolsInfo.get(pool.address);
      const hasStake = userInfo?.hasStake || false;
      
      console.log(`🎯 [POOL_CHECK] ${pool.address}: hasStake=${hasStake}, stakedAmount=${userInfo?.stakedAmount || '0'}`);
      
      return hasStake;
    });
    
    console.log('✅ [YOUR_STAKE] Filtered result:', {
      stakedPoolsCount: stakedPools.length,
      stakedPoolAddresses: stakedPools.map(p => p.address)
    });
    
    return stakedPools;
  }, [address, pools, userPoolsInfo]);

  // Handle tab switching and data fetching
  useEffect(() => {
    if (!isConnected || !address) return;
    
    switch (activeTab) {
      case 'staked':
        // Use local filtering based on userPoolsInfo instead of broken getUserStakedPools
        const stakedPools = getLocalUserStakedPools();
        console.log('🎯 [YOUR_STAKE] Filtering staked pools:', {
          totalPools: pools.length,
          userPoolsInfoSize: userPoolsInfo.size,
          stakedPools: stakedPools.length,
          userAddress: address
        });
        setFilteredPools(stakedPools);
        break;
      case 'created':
        const createdPools = getUserCreatedPools();
        setFilteredPools(createdPools);
        break;
      case 'all':
        if (!searchTerm.trim()) {
          const allPools = getAllPools();
          setFilteredPools(allPools);
        }
        break;
      // 'verified' tab is handled separately in the component
    }
  }, [activeTab, isConnected, address, getLocalUserStakedPools, getUserCreatedPools, getAllPools, searchTerm, userPoolsInfo]);

  // Search effect with debounced search term
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      const searchResults = searchPools(debouncedSearchTerm);
      setFilteredPools(searchResults);
    } else {
      // Reset based on active tab when search is cleared
      switch (activeTab) {
        case 'staked':
          const stakedPools = getLocalUserStakedPools();
          setFilteredPools(stakedPools);
          break;
        case 'created':
          const createdPools = getUserCreatedPools();
          setFilteredPools(createdPools);
          break;
        case 'all':
          const allPools = getAllPools();
          setFilteredPools(allPools);
          break;
      }
    }
  }, [debouncedSearchTerm, searchPools, getAllPools, getLocalUserStakedPools, getUserCreatedPools, activeTab, userPoolsInfo]);

  // Initial data load
  useEffect(() => {
    if (walletConnected && isConnected && pools.length === 0 && !isLoading) {
      console.log('🔄 Refreshing GitHub indexer data...');
      refreshData();
    }
  }, [walletConnected, isConnected, pools.length, isLoading, refreshData]);

  const handleCreateSuccess = () => {
    refreshData(); // Refresh GitHub indexer data
    setShowCreateForm(false);
  };

  // Use filtered pools for display
  const displayPools = filteredPools.length > 0 ? filteredPools : pools;

  // Remove pagination logic - GitHub indexer provides all data at once
  // No need for load more as data is lightweight JSON
  const handleLoadMore = () => {
    // GitHub indexer provides all data, no pagination needed
    console.log('All pools loaded from GitHub indexer');
  };

  return (
    <div className="min-h-screen bg-gradient-primary text-text-primary py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Header with Arena Connect Button */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-10 h-10 text-accent-primary" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                Ecosystem Staking
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">Create and manage custom staking pools</p>
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

        {/* Disclaimer Modal */}
        <DisclaimerModal 
          isOpen={showDisclaimer} 
          onAccept={handleAcceptDisclaimer}
        />

        {/* Access Modal */}
        <AccessModal
          isOpen={showAccessModal}
          onClose={() => setShowAccessModal(false)}
          isWhitelisted={isWhitelisted}
          hasMonthlyAccess={hasMonthlyAccess}
          accessInfo={accessInfo}
          orderBalance={orderBalance}
          onPurchaseAccess={handlePurchaseAccess}
          isPurchasing={isPurchasingAccess}
        />

        {/* Warning Banner with Disclaimer Button - Only show if accepted */}
        {disclaimerAccepted && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-amber-600 font-medium text-lg mb-1">🔍 Important Notice</h3>
                <p className="text-text-secondary text-sm mb-3">
                  Community-created pools may contain various tokens and contracts. Please research and verify tokens before participating. 
                  Order Protocol provides infrastructure only - always do your own research!
                </p>
                <button
                  onClick={handleShowDisclaimer}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-sm text-amber-600 hover:text-amber-500 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  View Terms & Guidelines
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Blurred if disclaimer not accepted */}
        <div className={`mb-8 transition-all duration-300 ${!disclaimerAccepted ? 'blur-sm pointer-events-none select-none' : ''}`}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                Pool Dashboard
              </h2>
              <p className="text-text-secondary">
                View and manage staking pools
              </p>
            </div>
            {walletConnected && disclaimerAccepted && (
              <button
                onClick={() => {
                  if (canCreatePools()) {
                    setShowCreateForm(!showCreateForm);
                  } else {
                    setShowAccessModal(true);
                  }
                }}
                className={`btn-primary flex items-center gap-2 px-6 py-3 ${
                  !canCreatePools() ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : ''
                }`}
              >
                {canCreatePools() ? (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Pool
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Get Access to Create
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-card-bg border border-card-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-400/10 rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <p className="text-text-secondary text-sm">Total Pools</p>
                  <p className="text-2xl font-bold">{totalPoolsCount}</p>
                </div>
              </div>
            </div>
            
            {walletConnected && (
              <>
                <div className="bg-card-bg border border-card-border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <Wallet className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm">Your Stakes</p>
                      <p className="text-2xl font-bold text-green-400">
                        {Array.from(userPoolsInfo.values()).filter(info => info.hasStake).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card-bg border border-card-border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      canCreatePools() ? 'bg-yellow-500/10' : 'bg-gray-500/10'
                    }`}>
                      <Crown className={`w-6 h-6 ${
                        canCreatePools() ? 'text-yellow-400' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm">Creator Access</p>
                      <p className={`text-lg font-bold ${
                        isWhitelisted ? 'text-purple-400' : 
                        hasMonthlyAccess ? 'text-yellow-400' : 
                        'text-gray-400'
                      }`}>
                        {isWhitelisted ? '🌟 Whitelisted' : 
                         hasMonthlyAccess ? '✅ Monthly' : 
                         '🔒 No Access'}
                      </p>
                      {hasMonthlyAccess && accessInfo && (
                        <p className="text-xs text-text-tertiary mt-1">
                          {accessInfo.daysLeft}d {accessInfo.hoursLeft}h left
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {walletConnected && (
              <>
                <div className="bg-card-bg border border-card-border rounded-lg p-4 md:col-start-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <Trophy className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm">Your Created</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {pools.filter(p => p.poolData.creator.toLowerCase() === address?.toLowerCase()).length}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {showCreateForm && disclaimerAccepted && (
          <div className="mb-8">
            <CreateStakingForm 
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {!disclaimerAccepted && (
          <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border-2 border-red-500/40 rounded-xl p-12 text-center backdrop-blur-sm">
            <div className="max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-text-primary">⚠️ Please Accept Terms First</h2>
              <p className="text-text-secondary mb-6 text-lg">
                You must read and accept our disclaimer and terms of service before accessing the Ecosystem Staking platform.
              </p>
              <button
                onClick={handleShowDisclaimer}
                className="bg-gradient-to-r from-accent-primary to-accent-secondary hover:shadow-lg text-white font-bold py-4 px-8 rounded-lg transition-all hover:scale-105 inline-flex items-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Read & Accept Terms
              </button>
            </div>
          </div>
        )}

        {disclaimerAccepted && !walletConnected && (
          <div className="bg-card-bg border border-card-border rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-primary-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-text-secondary mb-6">
                Please connect your wallet to view and create staking pools
              </p>
              <div className="flex justify-center">
                <ArenaConnectButton />
              </div>
            </div>
          </div>
        )}

        {disclaimerAccepted && walletConnected && isLoading && pools.length === 0 && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-text-secondary mb-2">Loading ecosystem pools...</p>
            <p className="text-text-tertiary text-sm">
              Connection: {walletConnected ? '✅ Wallet' : '❌ Wallet'} • {isConnected ? '✅ Factory' : '❌ Factory'}
            </p>
          </div>
        )}

        {disclaimerAccepted && walletConnected && !isLoading && !isConnected && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-red-400">Connection Issue</h2>
              <p className="text-text-secondary mb-6">
                Unable to connect to factory contract. Please check your wallet connection and try refreshing the page.
              </p>
              <button
                onClick={() => {
                  console.log('🔄 Manual refresh attempt...');
                  window.location.reload();
                }}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                <Loader2 className="w-5 h-5" />
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {disclaimerAccepted && walletConnected && !isLoading && pools.length === 0 && isConnected && (
          <div className="bg-card-bg border border-card-border rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-primary-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Pools Yet</h2>
              <p className="text-text-secondary mb-6">
                Be the first to create a staking pool in the ecosystem!
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                <Plus className="w-5 h-5" />
                Create First Pool
              </button>
            </div>
          </div>
        )}

        {disclaimerAccepted && walletConnected && pools.length > 0 && (
          <div>
            {/* Tab Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === 'all'
                      ? 'bg-accent-primary text-white shadow-lg'
                      : 'bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  All Pools
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'all' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-accent-primary/10 text-accent-primary'
                  }`}>
                    {pools.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('verified')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === 'verified'
                      ? 'bg-accent-primary text-white shadow-lg'
                      : 'bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Verified Pools
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'verified' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {VERIFIED_POOLS_COUNT}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('staked')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === 'staked'
                      ? 'bg-accent-primary text-white shadow-lg'
                      : 'bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Your Stake
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'staked' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-green-500/10 text-green-400'
                  }`}>
                    {Array.from(userPoolsInfo.values()).filter(info => info.hasStake).length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('created')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === 'created'
                      ? 'bg-accent-primary text-white shadow-lg'
                      : 'bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  Your Created
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'created' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-purple-500/10 text-purple-400'
                  }`}>
                    {pools.filter(p => p.poolData.creator.toLowerCase() === address?.toLowerCase()).length}
                  </span>
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by pool address, creator, token symbols, pool name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                />
              </div>
            </div>

            {/* Results Info */}
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm text-text-secondary">
                {activeTab === 'all' && !searchTerm && `${totalPoolsCount} total pools available`}
                {activeTab === 'all' && searchTerm && `Found ${displayPools.length} pool${displayPools.length !== 1 ? 's' : ''}`}
                {activeTab === 'staked' && `You have staked in ${displayPools.length} pool${displayPools.length !== 1 ? 's' : ''}`}
                {activeTab === 'created' && `You have created ${displayPools.length} pool${displayPools.length !== 1 ? 's' : ''}`}
                {activeTab === 'verified' && `${VERIFIED_POOLS_COUNT} verified and trusted pools`}
                {searchTerm && (
                  <span className="ml-2">
                    • Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-2 text-accent-primary hover:text-accent-secondary"
                    >
                      Clear
                    </button>
                  </span>
                )}
              </div>
              {activeTab === 'all' && !searchTerm && totalPoolsCount > 1 && (
                <div className="text-sm text-text-tertiary">
                  Navigate through all pools using page numbers below
                </div>
              )}
            </div>

            {displayPools.length > 0 || activeTab === 'verified' ? (
              <>
                {activeTab === 'verified' ? (
                  <VerifiedPools />
                ) : (
                  <>
                    {/* Grid Layout for Multiple Pools */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {displayPools.map((pool) => (
                        <EcosystemStakingCardSimplified
                          key={pool.address}
                          poolAddress={pool.address}
                        />
                      ))}
                    </div>

                    {/* GitHub Indexer Info - Show all pools loaded */}
                    {!searchTerm && activeTab === 'all' && totalPoolsCount > 1 && (
                      <div className="mt-8 flex flex-col items-center gap-4">
                        <div className="text-sm text-text-secondary">
                          All {totalPoolsCount} pools loaded from GitHub indexer
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="bg-surface-secondary border border-border-primary rounded-lg p-8 text-center">
                {activeTab === 'all' && searchTerm ? (
                  <>
                    <Search className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pools found</h3>
                    <p className="text-text-secondary">
                      Try adjusting your search terms or{' '}
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-accent-primary hover:text-accent-secondary"
                      >
                        clear the search
                      </button>
                    </p>
                  </>
                ) : activeTab === 'staked' ? (
                  <>
                    <Wallet className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No staked pools</h3>
                    <p className="text-text-secondary mb-4">
                      You haven't staked in any pools yet.
                      {searchTerm && ' Try clearing your search or '}
                      {!searchTerm && ' Browse '}
                      <button
                        onClick={() => {
                          setActiveTab('all');
                          setSearchTerm('');
                        }}
                        className="text-accent-primary hover:text-accent-secondary"
                      >
                        {searchTerm ? 'view all pools' : 'all pools to get started'}
                      </button>
                    </p>
                  </>
                ) : activeTab === 'created' ? (
                  <>
                    <Trophy className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No created pools</h3>
                    <p className="text-text-secondary mb-4">
                      You haven't created any pools yet.
                    </p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="btn-primary inline-flex items-center gap-2 px-6 py-3"
                    >
                      <Plus className="w-5 h-5" />
                      Create Your First Pool
                    </button>
                  </>
                ) : (
                  <>
                    <Search className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pools found</h3>
                    <p className="text-text-secondary">
                      Try adjusting your search terms or{' '}
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-accent-primary hover:text-accent-secondary"
                      >
                        clear the search
                      </button>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const EcosystemStakingPage: React.FC = () => {
  return (
    <SearchProvider>
      <EcosystemStakingPageContent />
    </SearchProvider>
  );
};