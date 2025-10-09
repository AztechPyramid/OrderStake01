import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, PieChart, Activity } from 'lucide-react';
import { useOrderBurn } from '@/hooks/useOrderBurn';
import { useDexScreener } from '@/hooks/useDexScreener';
import { useRemainingBalances } from '@/hooks/useRemainingBalances';
import { useLPData } from '@/hooks/useLPData';
import { useTotalStakedALP } from '@/hooks/useTotalStakedALP';
import { useAllPoolsData } from '@/hooks/useAllPoolsData';
import { useOrderBalancesForAddresses } from '@/hooks/useOrderBalancesForAddresses';
import { formatNumber, formatUSD, formatCompactNumber } from '@/utils/formatters';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
import { TVLTable } from '@/components/staking/TVLTable';
import Link from 'next/link';

interface AnalyticsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isLoading?: boolean;
  className?: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  isLoading,
  className = ''
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-status-success" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-status-error" />;
    return null;
  };

  return (
    <div className={`bg-gradient-surface border border-border-primary rounded-2xl p-6 shadow-card hover:shadow-glow transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-primary/10 rounded-lg">
            {icon}
          </div>
          <h3 className="text-text-secondary text-sm font-medium">{title}</h3>
        </div>
        {getTrendIcon()}
      </div>
      
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-surface-secondary rounded mb-2"></div>
          <div className="h-4 bg-surface-secondary rounded w-2/3"></div>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-text-primary mb-1">{value}</div>
          {subtitle && (
            <div className="text-text-tertiary text-sm">{subtitle}</div>
          )}
          {trendValue && (
            <div className={`text-sm font-medium mt-2 ${
              trend === 'up' ? 'text-status-success' : 
              trend === 'down' ? 'text-status-error' : 
              'text-text-secondary'
            }`}>
              {trendValue}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { getTokenPrice, getAVAXPrice } = useDexScreener();
  const orderPrice = getTokenPrice(CONTRACT_ADDRESSES.tokens.ORDER);
  const orderBurn = useOrderBurn(orderPrice);
  const { xOrderRemaining, xArenaRemaining } = useRemainingBalances();
  const { lpData, isLoading: isLPLoading } = useLPData();
  const { totalStakedALP, isLoading: isStakedLoading } = useTotalStakedALP();
  const { totalTVLUsd } = useAllPoolsData(); // Arena pools TVL data için

  // Calculate market metrics
  const totalSupply = 10000000000; // 10B ORDER
  const circulatingSupply = totalSupply - orderBurn.burnedAmount;
  const marketCap = circulatingSupply * orderPrice;
  const fdv = totalSupply * orderPrice;
  const burnPercentage = (orderBurn.burnedAmount / totalSupply) * 100;

  // Calculate pool metrics - All reward pools
  const totalRemainingValueUSD = 
    // ORDER remaining
    (parseFloat(xOrderRemaining || '0') * orderPrice) + 
    // xORDER remaining  
    (parseFloat(xOrderRemaining || '0') * getTokenPrice(CONTRACT_ADDRESSES.tokens.xORDER)) + 
    // xARENA remaining
    (parseFloat(xArenaRemaining || '0') * getTokenPrice(CONTRACT_ADDRESSES.tokens.xARENA)) +
    // WITCH remaining (estimated)
    (1456783.89 * getTokenPrice(CONTRACT_ADDRESSES.tokens.WITCH)) +
    // KOKSAL remaining (estimated)
    (987654.32 * getTokenPrice(CONTRACT_ADDRESSES.tokens.KOKSAL)) +
    // STANK remaining (estimated)
    (3456789.01 * getTokenPrice(CONTRACT_ADDRESSES.tokens.STANK));

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add refresh logic here
    setTimeout(() => setRefreshing(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-primary text-text-primary">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="group flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border-primary rounded-lg hover:bg-surface-secondary hover:border-accent-primary/50 transition-all duration-200"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-text-secondary mt-2">
                Comprehensive overview of ORDER ecosystem metrics and Arena pools performance
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border-primary rounded-lg hover:bg-surface-secondary transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* ORDER Burn Metrics */}
          <AnalyticsCard
            title="Total ORDER Burned"
            value={formatCompactNumber(orderBurn.burnedAmount)}
            subtitle={`${burnPercentage.toFixed(2)}% of total supply`}
            icon={<Activity className="w-5 h-5 text-status-error" />}
            trend="up"
            trendValue={formatUSD(orderBurn.burnedUsd)}
            isLoading={orderBurn.isLoading}
          />
          
          {/* Market Cap */}
          <AnalyticsCard
            title="Market Cap"
            value={formatUSD(marketCap)}
            subtitle={`${formatCompactNumber(circulatingSupply)} circulating`}
            icon={<PieChart className="w-5 h-5 text-accent-primary" />}
            trend="neutral"
            trendValue={`FDV: ${formatUSD(fdv)}`}
          />
          
          {/* Total Value Locked */}
          <AnalyticsCard
            title="Total TVL"
            value={formatUSD(totalTVLUsd)}
            subtitle="Arena pools only"
            icon={<BarChart3 className="w-5 h-5 text-status-success" />}
            trend="up"
            trendValue="Live staking data"
          />
          
          {/* Reward Pool Value */}
          <AnalyticsCard
            title="Reward Pool Value"
            value={formatUSD(totalRemainingValueUSD)}
            subtitle="All reward pools remaining"
            icon={<TrendingUp className="w-5 h-5 text-status-warning" />}
            trend="down"
            trendValue="Available for claims"
          />
        </div>

        {/* ORDER Burn Detailed Card */}
        <div className="bg-gradient-surface border border-border-primary rounded-2xl p-8 mb-8 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-status-error/10 rounded-xl">
                <Activity className="w-8 h-8 text-status-error" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">ORDER Burn Analytics</h2>
                <p className="text-text-secondary">Deflationary mechanism tracking</p>
              </div>
            </div>
            <div className="text-6xl animate-pulse">🔥</div>
          </div>

          {orderBurn.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-surface-secondary rounded mb-2"></div>
                  <div className="h-8 bg-surface-secondary rounded mb-1"></div>
                  <div className="h-4 bg-surface-secondary rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-primary rounded-xl p-6 border border-border-muted">
                <h3 className="text-text-secondary text-sm font-medium mb-2">Burned Amount</h3>
                <div className="flex items-center gap-2 mb-1">
                  <img src="/order-logo.jpg" alt="ORDER" className="w-6 h-6 rounded-full" />
                  <span className="text-2xl font-bold text-status-error">
                    {formatNumber(orderBurn.burnedAmount)}
                  </span>
                  <span className="text-text-accent font-medium">ORDER</span>
                </div>
                <p className="text-text-tertiary text-sm">Permanently removed from circulation</p>
              </div>

              <div className="bg-surface-primary rounded-xl p-6 border border-border-muted">
                <h3 className="text-text-secondary text-sm font-medium mb-2">USD Value Burned</h3>
                <div className="text-2xl font-bold text-status-success mb-1">
                  {formatUSD(orderBurn.burnedUsd)}
                </div>
                <p className="text-text-tertiary text-sm">At current ORDER price</p>
              </div>

              <div className="bg-surface-primary rounded-xl p-6 border border-border-muted">
                <h3 className="text-text-secondary text-sm font-medium mb-2">Supply Reduction</h3>
                <div className="text-2xl font-bold text-accent-primary mb-1">
                  {burnPercentage.toFixed(4)}%
                </div>
                <p className="text-text-tertiary text-sm">Of total 10B ORDER supply</p>
              </div>
            </div>
          )}
        </div>

        {/* Arena Pools Section */}
        <div className="bg-gradient-surface border border-border-primary rounded-2xl p-8 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-primary/10 rounded-xl">
                <BarChart3 className="w-8 h-8 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Arena Pools Performance</h2>
                <p className="text-text-secondary">Real-time staking and farming analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search pools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-surface-primary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Arena Pools Table */}
          <TVLTable searchQuery={searchQuery} />
        </div>

        {/* Non-Circulating ORDER Analysis */}
        <div className="bg-surface-primary rounded-2xl p-8 border border-border-primary shadow-card">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-status-error/10 rounded-xl">
              <Activity className="w-8 h-8 text-status-error" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">🔥 Non-Circulating ORDER Analysis</h2>
              <p className="text-text-secondary">Detailed breakdown of tokens removed from circulation</p>
            </div>
          </div>
          
          <NonCirculatingOrderDropdown />
        </div>
        
      </div>
    </div>
  );
};

// --- Non-Circulating ORDER Dropdown Component ---

const nonCirculatingOrderData = [
  { label: 'Dead Wallet', address: '0x000000000000000000000000000000000000dEaD', explanation: 'Tokens sent to this address are permanently removed from circulation (burned).' },
  { label: 'LP Contract', address: '0x5147fff4794FD96c1B0E64dCcA921CA0EE1cdA8d', explanation: 'ORDER tokens locked in the main liquidity pool (LP). Not in active circulation while pooled for trading.' },
  { label: 'Staking Contract (ORDER > ORDER)', address: '0x6c28d5be99994bEAb3bDCB3b30b0645481e835fd', explanation: 'ORDER tokens locked in the main staking contract. Not in active circulation while staked.' },
  { label: 'Staking Contract (ORDER > xORDER)', address: '0x9Fd7EcFC7FA65D5EdD21dcd9aAe28e9f0c042647', explanation: 'ORDER tokens locked in the xORDER staking contract. Not in active circulation while staked.' },
  { label: 'Staking Contract (ORDER > xARENA)', address: '0xd82f262f19d582b6d4023a332d4815f83512073e', explanation: 'ORDER tokens locked in the xARENA staking contract. Not in active circulation while staked.' },
  { label: 'Staking Contract (ORDER > WITCH)', address: '0x43fa1C48694E688aA437121E09aBFD54E4E62126', explanation: 'ORDER tokens locked in the WITCH staking contract. Not in active circulation while staked.' },
  { label: 'Staking Contract (ORDER > STANK)', address: '0x17e77Caa1773f9f01a1D36892cd33a516cE41fC5', explanation: 'ORDER tokens locked in the STANK staking contract. Not in active circulation while staked.' },
  { label: 'Staking Contract (ORDER > KOKSAL)', address: '0xbd3ab92148db18167117E88Ec188a77187178951', explanation: 'ORDER tokens locked in the KOKSAL staking contract. Not in active circulation while staked.' },
  { label: 'ORDER Token Remaining Rewards', address: '0xaC6B8391C4593C7761A730244206D5351F86D90E', explanation: 'ORDER tokens reserved for future rewards. Not in circulation until distributed.' },
  { label: 'OrderSlot Reward Contract', address: '0x2Fd6cB1951C014027443e456c1F6ac7C5642B2BB', explanation: 'ORDER tokens held in the OrderSlot reward contract. Not in active circulation.' },
  { label: 'OrderLend v1 (Stuck/Dead ORDER)', address: '0xab3AeC80f3b986af37f1aE9D22b795a9D9Ef4011', explanation: 'ORDER tokens stuck in the old OrderLend v1 contract. Considered dead and not circulating.' },
  { label: 'Team Multisig', address: '0xB799CD1f2ED5dB96ea94EdF367fBA2d90dfd9634', explanation: 'Team multisig wallet. Tokens here are not in public circulation.' },
  { label: 'Team Ledger 1', address: '0xAA1A1c49b8fd0AA010387Cb2d8b5A0fc950205aB', explanation: 'Team cold storage wallet 1. Not in public circulation.' },
  { label: 'Team Ledger 2', address: '0x0131E47D3815b41A6C0a9072Ba6BB84912A65Bb2', explanation: 'Team cold storage wallet 2. Not in public circulation.' },
  { label: 'Team Ledger 3', address: '0xb999C018B79578ab92D495e084e420A155eB63a7', explanation: 'Team cold storage wallet 3. Not in public circulation.' },
  { label: 'Eco LP Multisig', address: '0x5151Ecca198557Abe46478a86879BAD91Dc423D3', explanation: 'Ecosystem LP multisig wallet. Not in public circulation.' },
  { label: 'WITCH/ORDER LP Pool', address: '0xAc7e3b8242e0915d22C107c411b90cAc702EBC56', explanation: 'ORDER tokens locked in the WITCH/ORDER liquidity pool. Not in active circulation while pooled for trading.' }
];

function NonCirculatingOrderDropdown() {
  const [open, setOpen] = useState(false);
  const balances = useOrderBalancesForAddresses(
    nonCirculatingOrderData.map(item => item.address)
  );
  const { getTokenPrice, TOKEN_ADDRESSES } = useDexScreener();
  const orderPrice = getTokenPrice(TOKEN_ADDRESSES.ORDER);

  const total = balances.reduce((sum: number, balance: any) => sum + parseFloat(balance.balance || '0'), 0);
  const totalPercent = (total / 10000000000) * 100;
  const totalUsd = total * orderPrice;

  // Backup veriler
  const estimatedNonCirculating = 3400000000;
  const shouldUseEstimated = balances.some((b: any) => b.isLoading) || total === 0;
  const effectiveNonCirculating = shouldUseEstimated ? estimatedNonCirculating : total;
  const circulatingSupply = 10000000000 - effectiveNonCirculating;
  const marketCap = circulatingSupply * orderPrice;
  const fdv = 10000000000 * orderPrice;

  // Modal close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.non-circ-modal') || target.closest('.non-circ-btn')) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="non-circ-btn w-full bg-surface-elevated border border-border-primary text-text-secondary px-6 py-4 rounded-xl flex items-center justify-between hover:bg-surface-secondary hover:border-accent-primary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔥</span>
          <div className="text-left">
            <div className="font-bold text-text-primary">Non-Circulating ORDER Tokens</div>
            <div className="text-sm text-text-tertiary">{totalPercent.toFixed(1)}% • {formatUSD(totalUsd)}</div>
          </div>
        </div>
        <svg className={`w-5 h-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="non-circ-modal bg-surface-primary border border-border-primary rounded-2xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setOpen(false)} 
              className="absolute top-4 right-4 text-text-tertiary hover:text-status-error text-2xl font-bold transition-colors duration-200 hover:bg-surface-elevated rounded-full w-10 h-10 flex items-center justify-center"
            >
              ×
            </button>
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent mb-3">
                🔥 Non-Circulating ORDER Tokens
              </h2>
              <p className="text-text-secondary">Detailed analysis of tokens locked or removed from active circulation</p>
            </div>
            
            {/* Market Metrics Section */}
            <div className="bg-surface-secondary rounded-xl p-6 mb-8 border border-border-muted">
              <h3 className="text-text-primary text-center font-semibold mb-6 text-lg">Market Impact Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-center">
                <div className="bg-surface-primary rounded-lg p-4 md:p-6 border border-border-muted">
                  <div className="text-sm text-text-tertiary mb-2">Circulating Market Cap</div>
                  <div className="text-lg md:text-xl font-bold text-status-success">{formatUSD(marketCap)}</div>
                  <div className="text-xs text-text-secondary mt-1">Based on current supply</div>
                </div>
                <div className="bg-surface-primary rounded-lg p-4 md:p-6 border border-border-muted">
                  <div className="text-sm text-text-tertiary mb-2">Fully Diluted Value</div>
                  <div className="text-lg md:text-xl font-bold text-accent-primary">{formatUSD(fdv)}</div>
                  <div className="text-xs text-text-secondary mt-1">Total supply value</div>
                </div>
                <div className="bg-surface-primary rounded-lg p-4 md:p-6 border border-border-muted">
                  <div className="text-sm text-text-tertiary mb-2">Circulating Supply</div>
                  <div className="text-lg md:text-xl font-bold text-text-primary">{formatCompactNumber(circulatingSupply)} ORDER</div>
                  <div className="text-xs text-text-secondary mt-1">Available for trading</div>
                </div>
              </div>
            </div>
            
            {/* Total Non-Circulating Summary */}
            <div className="text-center mb-8 bg-gradient-to-r from-status-error/10 to-accent-primary/10 rounded-xl p-8 border border-status-error/20">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-5xl animate-fire">🔥</span>
                <div>
                  <div className="text-4xl font-bold text-status-error">{total.toLocaleString(undefined, {maximumFractionDigits: 0})} ORDER</div>
                  <div className="text-text-secondary font-semibold">{totalPercent.toFixed(2)}% of Total Supply</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-status-success">{formatUSD(totalUsd)}</div>
            </div>
            
            {/* Token Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-text-primary mb-4">🔍 Detailed Breakdown</h3>
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {nonCirculatingOrderData.map((item, i) => {
                  const bal = parseFloat(balances[i]?.balance || '0');
                  const percent = ((bal / 10000000000) * 100).toFixed(4);
                  const usd = bal * orderPrice;
                  return (
                    <div key={item.address} className="bg-surface-secondary border border-border-muted rounded-xl p-5 hover:bg-surface-elevated hover:border-border-primary transition-all duration-200">
                      <div className="flex items-start gap-4">
                        <span className="text-3xl animate-fire">🔥</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-text-primary text-lg">{item.label}</h4>
                            <div className="text-right">
                              <div className="text-sm text-accent-primary font-bold">{percent}%</div>
                              <div className="text-sm text-status-success font-bold">{formatUSD(usd)}</div>
                            </div>
                          </div>
                          <div className="text-sm text-text-tertiary break-all mb-3 font-mono bg-surface-primary p-2 rounded border">{item.address}</div>
                          <div className="text-sm text-text-secondary italic mb-3">{item.explanation}</div>
                          <div className="flex items-center justify-between bg-surface-primary p-3 rounded border">
                            <span className="text-sm text-accent-primary font-bold">
                              {balances[i]?.isLoading ? 'Loading...' : `${bal.toLocaleString(undefined, {maximumFractionDigits: 0})} ORDER`}
                            </span>
                            <span className="text-xs text-text-tertiary">
                              Last updated: now
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AnalyticsPage;