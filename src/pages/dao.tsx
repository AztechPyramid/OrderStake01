import React, { useState, useEffect } from 'react';
import { 
  Vote, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Shield, 
  TrendingUp,
  BarChart3,
  Wallet,
  Play,
  Home,
  ArrowLeft
} from 'lucide-react';
import { useDAOContract, Proposal } from '@/hooks/useDAOContract';
import { ArenaConnectButton } from '@/components/arena/ArenaConnectButton';
import { useArenaSDK } from '@/hooks/useArenaSDK';
import { DAO_CONFIG } from '@/contracts/DAOABI';
import Link from 'next/link';

const DAOPage = () => {
  const [selectedTab, setSelectedTab] = useState<'proposals' | 'create' | 'stats'>('proposals');
  const [newProposalDescription, setNewProposalDescription] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  
  const arenaSDK = useArenaSDK();
  const {
    isLoading,
    step,
    proposals,
    daoStats,
    userVotingPower,
    isOwner,
    createProposal,
    vote,
    executeProposal,
    getVotingPowerValue,
    getProposalStatus,
    getVotePercentages,
    refresh
  } = useDAOContract();

  // Initial refresh after 2 seconds and auto-refresh every 30 seconds
  useEffect(() => {
    let initialTimeout: NodeJS.Timeout;
    let refreshInterval: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;
    
    // Initial refresh after 2 seconds when page loads
    initialTimeout = setTimeout(() => {
      console.log('🔄 DAO Initial refresh after 2 seconds');
      refresh();
    }, 2000);
    
    // Start countdown immediately
    setRefreshCountdown(30);
    
    // Countdown timer
    countdownInterval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);
    
    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(() => {
      console.log('🔄 DAO Auto-refresh every 30 seconds');
      refresh();
      setRefreshCountdown(30); // Reset countdown
    }, 30000);

    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (refreshInterval) clearInterval(refreshInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [refresh]); // Include refresh in dependency array

  // Countdown timer for auto-refresh (like farm)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoading && (step === 'voting' || step === 'creating' || step === 'executing')) {
      setCountdown(30);
      
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, step]);

  // Format numbers for display
  const formatNumber = (num: number | bigint) => {
    const value = typeof num === 'bigint' ? Number(num) : num;
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
    return value.toFixed(2);
  };

  // Format voting power
  const formatVotingPower = (power: bigint) => {
    const tokenAmount = Number(power) / 1e18;
    return formatNumber(tokenAmount);
  };

  // Format time remaining
  const formatTimeRemaining = (endTime: number) => {
    const now = Date.now() / 1000;
    const remaining = endTime - now;
    
    if (remaining <= 0) return 'Ended';
    
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Handle proposal creation
  const handleCreateProposal = async () => {
    if (!newProposalDescription.trim()) return;
    
    // Prevent double submission
    if (isLoading) {
      console.log('⚠️ Already creating proposal, please wait...');
      return;
    }
    
    try {
      const txHash = await createProposal(newProposalDescription);
      setNewProposalDescription('');
      
      // Show success message and redirect to proposals
      alert(`Proposal created successfully! Transaction: ${txHash}\n\nSwitching to proposals tab to see your proposal once it's confirmed on the blockchain.`);
      setSelectedTab('proposals');
      
      // Show a temporary notification
      console.log('🎉 Proposal created! Waiting for blockchain confirmation...');
      
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert(`Failed to create proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle voting
  const handleVote = async (proposalId: number, support: boolean) => {
    try {
      await vote(proposalId, support);
      setSelectedProposal(null);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  // Handle execution
  const handleExecute = async (proposalId: number) => {
    try {
      await executeProposal(proposalId);
    } catch (error) {
      console.error('Error executing proposal:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary text-text-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="w-10 h-10 bg-surface-elevated border border-border-primary rounded-xl flex items-center justify-center hover:bg-surface-secondary transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary group-hover:text-accent-primary transition-colors" />
            </Link>
            <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center">
              <Vote className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                ORDER DAO
              </h1>
              <p className="text-text-secondary">Decentralized Governance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-4 py-2 bg-surface-elevated border border-border-primary rounded-lg hover:bg-surface-secondary transition-colors flex items-center gap-2 text-text-secondary hover:text-text-primary"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            
            {/* Auto-refresh indicator with countdown */}
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-accent-primary/20 rounded-lg">
              <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse"></div>
              <span className="text-xs text-text-secondary">Next refresh: {refreshCountdown}s</span>
            </div>
            
            <button
              onClick={() => {
                refresh();
                setRefreshCountdown(30); // Reset countdown on manual refresh
              }}
              className="px-4 py-2 bg-surface-elevated border border-border-primary rounded-lg hover:bg-surface-secondary transition-colors flex items-center gap-2 text-text-secondary hover:text-text-primary"
              title="Manual refresh"
            >
              🔄
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <ArenaConnectButton />
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-300 mb-1">Voting Requirements</h3>
              <p className="text-sm text-text-secondary mb-3">
                Remember that only users who have staked ORDER tokens can vote on proposals. Your voting power is based on your staked ORDER amount. 
                <span className="text-blue-300 font-medium"> You can only vote once per proposal.</span>
              </p>
              
              {/* Stake ORDER Pool Button */}
              <Link
                href="/?openStakeCard=ORDER_ORDER"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-medium rounded-lg hover:from-accent-secondary hover:to-accent-primary transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <span>🥩</span>
                <span>Stake ORDER Pool</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* User Voting Power */}
          <div className="bg-gradient-surface border border-border-primary rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Wallet className="w-5 h-5 text-accent-primary" />
              <span className="text-sm text-text-secondary">Your Voting Power</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatVotingPower(userVotingPower)} ORDER
            </div>
            <div className="text-sm text-text-tertiary">
              ${formatNumber(getVotingPowerValue())} USD
            </div>
          </div>

          {/* Total Proposals */}
          <div className="bg-gradient-surface border border-border-primary rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-text-secondary">Total Proposals</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {daoStats?.proposalCount || 0}
            </div>
            <div className="text-sm text-text-tertiary">
              All time
            </div>
          </div>

          {/* Voting Period */}
          <div className="bg-gradient-surface border border-border-primary rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-text-secondary">Voting Period</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {daoStats ? Math.floor(Number(daoStats.votingPeriod) / 86400) : 0} days
            </div>
            <div className="text-sm text-text-tertiary">
              Per proposal
            </div>
          </div>

          {/* Min Voting Power */}
          <div className="bg-gradient-surface border border-border-primary rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm text-text-secondary">Min Voting Power</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {daoStats ? formatVotingPower(daoStats.minVotingPower) : 0}
            </div>
            <div className="text-sm text-text-tertiary">
              ORDER required
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-surface-elevated rounded-xl p-1 border border-border-primary mb-8 max-w-md">
          <button
            onClick={() => setSelectedTab('proposals')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm ${
              selectedTab === 'proposals'
                ? 'bg-gradient-accent text-gray-900 shadow-lg'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
            }`}
          >
            📋 Proposals
          </button>
          
          {isOwner && (
            <button
              onClick={() => setSelectedTab('create')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                selectedTab === 'create'
                  ? 'bg-gradient-accent text-gray-900 shadow-lg'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
              }`}
            >
              ➕ Create
            </button>
          )}
          
          <button
            onClick={() => setSelectedTab('stats')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm ${
              selectedTab === 'stats'
                ? 'bg-gradient-accent text-gray-900 shadow-lg'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
            }`}
          >
            📊 Stats
          </button>
        </div>

        {/* Content based on selected tab */}
        {selectedTab === 'proposals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Active Proposals</h2>
              {isOwner && (
                <button
                  onClick={() => setSelectedTab('create')}
                  className="px-4 py-2 bg-gradient-accent text-gray-900 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Proposal
                </button>
              )}
            </div>

            {proposals.length === 0 ? (
              <div className="bg-gradient-surface border border-border-primary rounded-xl p-8 text-center">
                <Vote className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-secondary mb-2">
                  {daoStats?.proposalCount === 0 ? 'No Proposals Yet' : 'Loading Proposals...'}
                </h3>
                <p className="text-text-tertiary mb-4">
                  {daoStats?.proposalCount === 0 
                    ? (isOwner ? 'Create the first proposal to get started.' : 'Proposals will appear here when created.')
                    : `Found ${daoStats?.proposalCount || 0} proposals in contract. Loading data...`
                  }
                </p>
                
                <button
                  onClick={refresh}
                  className="px-4 py-2 bg-accent-primary text-gray-900 rounded-lg hover:bg-accent-secondary transition-colors text-sm font-medium"
                >
                  🔄 Force Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals
                  .filter((proposal: any) => proposal.id !== 2) // Hide proposal #2
                  .map((proposal: any) => {
                  const status = getProposalStatus(proposal);
                  const percentages = getVotePercentages(proposal);
                  
                  return (
                    <div
                      key={proposal.id}
                      className="bg-gradient-surface border border-border-primary rounded-xl p-6 hover:border-accent-primary/30 transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-accent-primary">#{proposal.id}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              status === 'ended' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              status === 'executed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {status.toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-lg font-medium text-text-primary mb-2">
                            {proposal.description}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-text-tertiary">
                            <span>Created by {proposal.creator.slice(0, 6)}...{proposal.creator.slice(-4)}</span>
                            <span>•</span>
                            <span>{formatTimeRemaining(proposal.endTime)} remaining</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {status === 'active' && arenaSDK?.isConnected && (
                            <>
                              <button
                                onClick={() => handleVote(proposal.id, true)}
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Vote Yes
                              </button>
                              <button
                                onClick={() => handleVote(proposal.id, false)}
                                disabled={isLoading}
                                className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Vote No
                              </button>
                            </>
                          )}
                          
                          {status === 'ended' && !proposal.executed && isOwner && (
                            <button
                              onClick={() => handleExecute(proposal.id)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-gradient-accent text-gray-900 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              <Play className="w-4 h-4" />
                              Execute
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Vote Results */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">Yes: {percentages.yes.toFixed(1)}%</span>
                          <span className="text-red-400">No: {percentages.no.toFixed(1)}%</span>
                        </div>
                        
                        <div className="w-full bg-surface-secondary rounded-full h-3 overflow-hidden">
                          <div className="h-full flex">
                            <div 
                              className="bg-green-500 transition-all duration-500"
                              style={{ width: `${percentages.yes}%` }}
                            />
                            <div 
                              className="bg-red-500 transition-all duration-500"
                              style={{ width: `${percentages.no}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-sm text-text-tertiary">
                          <span>{formatVotingPower(proposal.yesVotes)} YES</span>
                          <span>{formatVotingPower(proposal.noVotes)} NO</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'create' && isOwner && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-surface border border-border-primary rounded-xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Plus className="w-6 h-6 text-accent-primary" />
                Create New Proposal
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Proposal Description
                  </label>
                  <textarea
                    value={newProposalDescription}
                    onChange={(e) => setNewProposalDescription(e.target.value)}
                    placeholder="Describe your proposal in detail..."
                    rows={6}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all duration-200 resize-none"
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isLoading && newProposalDescription.trim()) {
                        handleCreateProposal();
                      }
                    }}
                    disabled={!newProposalDescription.trim() || isLoading}
                    className="flex-1 px-6 py-3 bg-gradient-accent text-gray-900 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Proposal
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setSelectedTab('proposals')}
                    className="px-6 py-3 bg-surface-elevated border border-border-primary rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'stats' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contract Info */}
              <div className="bg-gradient-surface border border-border-primary rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-accent-primary" />
                  Contract Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-text-secondary">DAO Contract</span>
                    <div className="font-mono text-sm text-accent-primary break-all">
                      {DAO_CONFIG.ADDRESS}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-text-secondary">Owner</span>
                    <div className="font-mono text-sm text-accent-primary break-all">
                      {daoStats?.owner || DAO_CONFIG.OWNER}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-text-secondary">Staking Contract</span>
                    <div className="font-mono text-sm text-accent-primary break-all">
                      {daoStats?.stakingContract || 'Loading...'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Governance Rules */}
              <div className="bg-gradient-surface border border-border-primary rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                  <Users className="w-5 h-5 text-accent-primary" />
                  Governance Rules
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Voting Period</span>
                    <span className="text-text-primary font-medium">
                      {daoStats ? Math.floor(Number(daoStats.votingPeriod) / 86400) : 0} days
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Min Voting Power</span>
                    <span className="text-text-primary font-medium">
                      {daoStats ? formatVotingPower(daoStats.minVotingPower) : 0} ORDER
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Your Voting Power</span>
                    <span className="text-text-primary font-medium">
                      {formatVotingPower(userVotingPower)} ORDER
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Vote Value (USD)</span>
                    <span className="text-text-primary font-medium">
                      ${formatNumber(getVotingPowerValue())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading Overlay with Timer */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-surface border border-border-primary rounded-xl p-8 max-w-md mx-4 text-center">
              <div className="w-16 h-16 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mx-auto mb-6" />
              
              <h3 className="text-xl font-bold text-text-primary mb-2">
                {step === 'creating' ? '📝 Creating Proposal...' :
                 step === 'voting' ? '🗳️ Casting Vote...' :
                 step === 'executing' ? '⚡ Executing Proposal...' :
                 'Processing...'}
              </h3>
              
              <p className="text-text-secondary mb-4">
                {step === 'creating' ? 'Your proposal is being submitted to the blockchain.' :
                 step === 'voting' ? 'Your vote is being recorded on the blockchain.' :
                 step === 'executing' ? 'The proposal is being executed.' :
                 'Transaction is being processed...'}
              </p>
              
              {countdown > 0 && (
                <div className="bg-surface-secondary rounded-lg p-4 mb-4">
                  <div className="text-2xl font-bold text-accent-primary mb-2">
                    {countdown}s
                  </div>
                  <div className="text-sm text-text-tertiary">
                    Auto-refresh in {countdown} seconds
                  </div>
                  <div className="w-full bg-surface-primary rounded-full h-2 mt-3">
                    <div 
                      className="bg-gradient-accent h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(30 - countdown) * 100 / 30}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="text-xs text-text-tertiary">
                Please wait while the transaction is confirmed...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DAOPage;