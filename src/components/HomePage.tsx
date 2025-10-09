import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';
import { StakingDashboard } from '@/components/staking/StakingDashboard';
import { TVLTable } from '@/components/staking/TVLTable';
import { PlatformsDashboard } from '@/components/common/PlatformsDashboard';
import { ArenaConnectButton } from '@/components/arena/ArenaConnectButton';
import { ArenaStatusBanner } from '@/components/arena/ArenaStatusBanner';
import { LiquidityCard } from '@/components/liquidity/LiquidityCard';
import { BurnedTokensCard } from '@/components/common/BurnedTokensCard';
import { useALPAPYForButton } from '@/hooks/useALPAPYForButton';
import Link from 'next/link';

// Arena-specific HomePage Component with Arena SDK integration
export const ArenaHomePage = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'stake' | 'liquidity'>('stake');
  const [liquidityRefreshKey, setLiquidityRefreshKey] = useState(0);
  const [openStakeCard, setOpenStakeCard] = useState<string | null>(null);
  
  // Get ALP APY for Farm button
  const { formattedAPY, isValid, debug } = useALPAPYForButton();
  
  // Handle query parameter for opening specific stake card
  useEffect(() => {
    if (router.query.openStakeCard) {
      const cardId = router.query.openStakeCard as string;
      setOpenStakeCard(cardId);
      setActiveTab('stake'); // Switch to stake tab
      
      // Clear query parameter after handling
      const { openStakeCard, ...restQuery } = router.query;
      router.replace({
        pathname: router.pathname,
        query: restQuery
      }, undefined, { shallow: true });
    }
  }, [router.query, router]);
  
  // Debug APY calculation
  useEffect(() => {
    console.log('🎯 [FARM_BUTTON] APY Debug:', {
      formattedAPY,
      isValid,
      debug
    });
  }, [formattedAPY, isValid, debug]);

  // Auto-refresh every 33 seconds when on Liquidity Farm tab - only refresh the card
  useEffect(() => {
    if (activeTab === 'liquidity') {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing Farm card...');
        setLiquidityRefreshKey(prev => prev + 1); // This will trigger LiquidityCard refresh
      }, 33000); // 33 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-primary text-text-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Arena Header - 50/50 Layout */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Left Side - ORDER Branding (50%) */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-3">
              <img 
                src="https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg" 
                alt="ORDER" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg ring-2 ring-accent-primary/20"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/order-logo.jpg';
                }}
              />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                  ORDER
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary">Stake • Earn • Burn</p>
              </div>
            </div>
          </div>
          
          {/* Right Side - Arena Connect (Full Width) */}
          <div className="flex justify-end items-center">
            <ArenaConnectButton />
          </div>
        </div>

        {/* Arena Status Banner */}
        <div className="mb-8">
          <ArenaStatusBanner />
        </div>

        {/* CoinGecko Price Marquee Widget */}
        <div className="mb-6">
          <div className="max-w-6xl mx-auto">
            <div 
              dangerouslySetInnerHTML={{
                __html: `<gecko-coin-price-marquee-widget 
                  locale="en" 
                  dark-mode="true" 
                  transparent-background="true" 
                  outlined="true" 
                  coin-ids="order-2,the-arena,avalanche-2,bitcoin" 
                  initial-currency="usd">
                </gecko-coin-price-marquee-widget>`
              }}
            />
          </div>
        </div>

        {/* Burned Tokens Card */}
        <div className="mb-6">
          <div className="max-w-4xl mx-auto">
            <BurnedTokensCard />
          </div>
        </div>

        {/* Search Bar - Mobile Responsive */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
            <input
              type="text"
              placeholder="Search platforms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-elevated border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all duration-200 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Navigation Tabs - 7 Column Layout */}
        <div className="flex justify-center mb-8">
          <div className="bg-surface-elevated rounded-xl p-1 border border-border-primary w-full max-w-7xl grid grid-cols-2 lg:grid-cols-7 gap-1">
            <button
              onClick={() => setActiveTab('stake')}
              className={`px-2 sm:px-4 py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex items-center justify-center ${
                activeTab === 'stake'
                  ? 'bg-gradient-to-r from-surface-elevated to-surface-secondary text-text-primary shadow-lg font-bold border border-accent-primary/30 shadow-accent-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-transparent hover:border-border-primary hover:shadow-md hover:shadow-accent-primary/10'
              }`}
            >
              <span className="hidden sm:inline">🥩 Staking Platforms</span>
              <span className="sm:hidden">🥩 Staking</span>
            </button>
            <button
              onClick={() => setActiveTab('liquidity')}
              className={`px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex items-center justify-center gap-1 ${
                activeTab === 'liquidity'
                  ? 'bg-gradient-to-r from-surface-elevated to-surface-secondary text-text-primary shadow-lg font-bold border border-accent-primary/30 shadow-accent-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-transparent hover:border-border-primary hover:shadow-md hover:shadow-accent-primary/10'
              }`}
            >
              <div className="flex items-center gap-1">
                <img 
                  src="https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg" 
                  alt="ORDER" 
                  className="w-4 h-4 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/order-logo.jpg';
                  }}
                />
                <img 
                  src="/assets/avax-logo-showdetails.png" 
                  alt="AVAX" 
                  className="w-4 h-4 rounded-full"
                />
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <span className="hidden sm:inline">Farm</span>
                    <span className="sm:hidden">Farm</span>
                  </div>
                  {isValid && formattedAPY ? (
                    <span className="text-xs text-accent-primary font-bold leading-tight">
                      {formattedAPY} APY
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary leading-tight">
                      Loading APY...
                    </span>
                  )}
                </div>
              </div>
            </button>
            <Link 
              href="/dao" 
              className="group relative px-2 sm:px-4 py-3 bg-gradient-to-r from-surface-elevated to-surface-secondary rounded-lg font-medium text-text-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-1 text-xs sm:text-sm border border-accent-primary/20 hover:border-accent-primary/40 hover:shadow-accent-primary/20"
            >
              🏛️
              <span className="hidden sm:inline">DAO</span>
              <span className="sm:hidden">DAO</span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </Link>
            <Link 
              href="/analytics" 
              className="group relative px-2 sm:px-4 py-3 bg-gradient-to-r from-surface-elevated to-surface-secondary rounded-lg font-medium text-text-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-1 text-xs sm:text-sm border border-accent-primary/20 hover:border-accent-primary/40 hover:shadow-accent-primary/20"
            >
              <img 
                src="https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg" 
                alt="ORDER" 
                className="w-4 h-4 rounded-full group-hover:animate-pulse"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/order-logo.jpg';
                }}
              />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </Link>
            <Link 
              href="/tetris" 
              className="group relative px-2 sm:px-4 py-3 bg-gradient-to-r from-surface-elevated to-surface-secondary rounded-lg font-medium text-text-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-1 text-xs sm:text-sm border border-accent-primary/20 hover:border-accent-primary/40 hover:shadow-accent-primary/20"
            >
              🎮
              <span className="hidden sm:inline">Play Tetris</span>
              <span className="sm:hidden">Play Tetris</span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </Link>
            <Link 
              href="/ordersignal" 
              className="group relative px-2 sm:px-4 py-3 bg-gradient-to-r from-surface-elevated to-surface-secondary rounded-lg font-medium text-text-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-1 text-xs sm:text-sm border border-accent-primary/20 hover:border-accent-primary/40 hover:shadow-accent-primary/20"
            >
              <div className="flex items-center gap-1">
                <div className="relative">
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes swap-balls {
                      0%, 100% { transform: translateX(0); }
                      50% { transform: translateX(12px); }
                    }
                    @keyframes swap-balls-reverse {
                      0%, 100% { transform: translateX(0); }
                      50% { transform: translateX(-12px); }
                    }
                    .ball-green { animation: swap-balls 1.5s ease-in-out infinite; }
                    .ball-red { animation: swap-balls-reverse 1.5s ease-in-out infinite; }
                  `}} />
                  <span className="ball-green inline-block text-xl" 
                        style={{ 
                          filter: 'drop-shadow(0 0 8px #10b981)',
                        }}>🟢</span>
                  <span className="ball-red inline-block text-xl ml-0.5" 
                        style={{ 
                          filter: 'drop-shadow(0 0 8px #ef4444)',
                        }}>🔴</span>
                </div>
              </div>
              <span className="hidden sm:inline">OrderPremium+</span>
              <span className="sm:hidden">OrderPremium+</span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </Link>
            <Link 
              href="/ecosystem-staking" 
              className="group relative px-2 sm:px-4 py-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg font-medium text-text-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center gap-0.5 text-xs sm:text-sm border border-green-500/30 hover:border-green-500/50 hover:shadow-green-500/20"
            >
              <div className="flex items-center gap-1.5 relative">
                <span className="text-base sm:text-xl inline-block animate-spin-slow">🌟</span>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">Stake & Create</span>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 rounded text-[9px] font-bold text-green-400 border border-green-500/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                      LIVE
                    </span>
                  </div>
                  <span className="text-[10px] text-green-400/80">Staking Contract</span>
                </div>
              </div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </Link>
          </div>
        </div>

        {/* Content based on active tab - Mobile Responsive */}
        <div className="space-y-6 sm:space-y-8">
          {activeTab === 'stake' ? (
            <>
              {/* Staking Dashboard */}
              <div className="bg-gradient-surface border border-border-primary rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-card">
                <StakingDashboard searchQuery={searchQuery} openStakeCard={openStakeCard} />
              </div>
              {/* TVL Summary */}
              <div className="bg-gradient-surface border border-border-primary rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-card">
                <TVLTable searchQuery={searchQuery} />
              </div>
              <div className="bg-gradient-surface border border-border-primary rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-card">
                <PlatformsDashboard searchQuery={searchQuery} />
              </div>
            </>
          ) : (
            <>
              {/* Liquidity Farm Content */}
              <div className="max-w-4xl mx-auto px-2 sm:px-0">
                <LiquidityCard key={liquidityRefreshKey} />
              </div>
              <div className="text-center bg-surface-primary rounded-2xl p-6 border border-border-primary">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img 
                    src="https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg" 
                    alt="ORDER" 
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/order-logo.jpg';
                    }}
                  />
                  <span className="text-accent-primary font-bold">+</span>
                  <img 
                    src="/assets/avax-logo-showdetails.png" 
                    alt="AVAX" 
                    className="w-6 h-6 rounded-full"
                  />
                </div>
                <p className="text-text-tertiary text-xs mb-2">
                  Powered by The Arena DEX • Sustainable liquidity rewards
                </p>
                <p className="text-text-secondary text-sm mb-2">
                  🏊‍♂️ Provide ORDER/AVAX liquidity and earn trading fees
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const HomePage = ArenaHomePage;

// For backwards compatibility with index.tsx
export const NormalHomePage = ArenaHomePage;

export default HomePage;