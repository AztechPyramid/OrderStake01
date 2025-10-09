import { useState, useEffect, useCallback } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { useTransactionContext } from '@/contexts/TransactionContext';
import { useOrderPrice } from './useOrderPrice';
import { DAOABI, DAO_CONFIG } from '@/contracts/DAOABI';

export interface Proposal {
  id: number;
  creator: string;
  description: string;
  startTime: number;
  endTime: number;
  yesVotes: bigint;
  noVotes: bigint;
  executed: boolean;
}

export interface DAOStats {
  minVotingPower: bigint;
  votingPeriod: bigint;
  proposalCount: number;
  owner: string;
  stakingContract: string;
}

export const useDAOContract = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'creating' | 'voting' | 'executing'>('idle');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [daoStats, setDAOStats] = useState<DAOStats | null>(null);
  const [userVotingPower, setUserVotingPower] = useState<bigint>(0n);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const arenaSDK = useArenaSDK();
  const { startTransaction, updateTransactionHash, setTransactionError } = useTransactionContext();
  const { priceData } = useOrderPrice();

  // Send transaction through Arena SDK
  const sendArenaTransaction = async (data: string, value: string = '0x0') => {
    if (!arenaSDK?.isConnected || !arenaSDK.address || !arenaSDK.sdk?.provider) {
      throw new Error('Arena SDK not ready');
    }

    const txHash = await arenaSDK.sdk.provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: arenaSDK.address,
        to: DAO_CONFIG.ADDRESS,
        data,
        value,
        gas: '0x5B8D80'
      }]
    });

    return txHash;
  };

  // Load DAO stats using direct selector calls
  const loadDAOStats = useCallback(async () => {
    if (!arenaSDK?.sdk?.provider) return;

    try {
      console.log('📊 Loading DAO stats...');
      
      const calls = [
        { selector: '0x805a8142', name: 'MIN_VOTING_POWER' },
        { selector: '0xb1610d7e', name: 'VOTING_PERIOD' },
        { selector: '0xda35c664', name: 'proposalCount' },
        { selector: '0x8da5cb5b', name: 'owner' },
        { selector: '0xee99205c', name: 'stakingContract' }
      ];

      const results = await Promise.all(
        calls.map(call => 
          arenaSDK.sdk.provider.request({
            method: 'eth_call',
            params: [{
              to: DAO_CONFIG.ADDRESS,
              data: call.selector
            }, 'latest']
          })
        )
      );

      const stats: DAOStats = {
        minVotingPower: BigInt(results[0] || '0x0'),
        votingPeriod: BigInt(results[1] || '0x0'),
        proposalCount: parseInt(results[2] || '0x0', 16),
        owner: '0x' + (results[3] || '0x0').slice(-40),
        stakingContract: '0x' + (results[4] || '0x0').slice(-40)
      };

      setDAOStats(stats);
      console.log('✅ DAO stats loaded:', stats);
    } catch (error) {
      console.error('❌ Error loading DAO stats:', error);
    }
  }, [arenaSDK?.sdk?.provider]);

  // Load user voting power
  const loadUserVotingPower = useCallback(async () => {
    if (!arenaSDK?.address || !arenaSDK?.sdk?.provider) return;

    try {
      const data = '0xbb4d4436' + arenaSDK.address.slice(2).padStart(64, '0');
      
      const result = await arenaSDK.sdk.provider.request({
        method: 'eth_call',
        params: [{
          to: DAO_CONFIG.ADDRESS,
          data
        }, 'latest']
      });

      setUserVotingPower(BigInt(result || '0x0'));
    } catch (error) {
      console.error('❌ Error loading voting power:', error);
    }
  }, [arenaSDK?.address, arenaSDK?.sdk?.provider]);

  // Create basic proposal structure
  const createBasicProposal = (proposalId: number): Proposal => {
    return {
      id: proposalId,
      creator: DAO_CONFIG.OWNER,
      description: `Proposal ${proposalId} - Recently Created`,
      startTime: Math.floor(Date.now() / 1000) - 3600,
      endTime: Math.floor(Date.now() / 1000) + 86400,
      yesVotes: 0n,
      noVotes: 0n,
      executed: false
    };
  };

  // Parse proposal data from contract response
  const parseProposalData = (hexData: string, proposalId: number): Proposal | null => {
    try {
      if (!hexData || hexData === '0x' || hexData.length < 10) {
        return null;
      }

      console.log(`🔍 Parsing proposal ${proposalId} data:`, hexData);
      
      // Remove 0x prefix
      const data = hexData.slice(2);
      
      // Parse each 32-byte segment
      const segments = [];
      for (let i = 0; i < data.length; i += 64) {
        segments.push(data.slice(i, i + 64));
      }
      
      console.log(`📊 Proposal ${proposalId} segments:`, segments);
      
      if (segments.length < 8) {
        console.warn(`⚠️ Not enough segments for proposal ${proposalId}`);
        return null;
      }

      // Parse the data according to the struct
      const id = parseInt(segments[0], 16); // Should match proposalId
      const creator = '0x' + segments[1].slice(-40); // Last 20 bytes for address
      
      // String parsing - description is at offset
      const descriptionOffset = parseInt(segments[2], 16) * 2; // Convert to hex position
      let description = '';
      
      if (descriptionOffset < data.length) {
        const descriptionLengthStart = descriptionOffset;
        const descriptionLength = parseInt(data.slice(descriptionLengthStart, descriptionLengthStart + 64), 16);
        const descriptionStart = descriptionLengthStart + 64;
        const descriptionEnd = descriptionStart + (descriptionLength * 2);
        
        if (descriptionEnd <= data.length) {
          const descriptionHex = data.slice(descriptionStart, descriptionEnd);
          description = Buffer.from(descriptionHex, 'hex').toString('utf8');
        }
      }
      
      const startTime = parseInt(segments[3], 16);
      const endTime = parseInt(segments[4], 16);
      const yesVotes = BigInt('0x' + segments[5]);
      const noVotes = BigInt('0x' + segments[6]);
      const executed = parseInt(segments[7], 16) === 1;

      const proposal: Proposal = {
        id: proposalId, // Use the actual proposalId parameter
        creator,
        description: description || `Proposal ${proposalId}`,
        startTime,
        endTime,
        yesVotes,
        noVotes,
        executed
      };

      console.log(`✅ Successfully parsed proposal ${proposalId}:`, proposal);
      return proposal;
      
    } catch (error) {
      console.error(`❌ Error parsing proposal ${proposalId}:`, error);
      return null;
    }
  };

  // Load all proposals with real data decoding
  const loadProposals = useCallback(async () => {
    if (!daoStats || daoStats.proposalCount === 0) {
      setProposals([]);
      return;
    }

    if (!arenaSDK?.sdk?.provider) {
      console.error('❌ Arena SDK provider not available for loading proposals');
      return;
    }

    try {
      console.log('📋 Loading proposals...', `Total: ${daoStats.proposalCount}`);
      const loadedProposals: Proposal[] = [];
      
      // Load proposals from 0 to proposalCount-1 (contracts are 0-indexed)
      for (let i = 0; i < daoStats.proposalCount; i++) {
        try {
          console.log(`🔍 Loading proposal ${i} with getProposal selector...`);
          
          // getProposal(uint256) selector: 0xc7f758a8
          const data = '0xc7f758a8' + i.toString(16).padStart(64, '0');
          
          const result = await arenaSDK.sdk.provider.request({
            method: 'eth_call',
            params: [{
              to: DAO_CONFIG.ADDRESS,
              data: data
            }, 'latest']
          });

          console.log(`📄 Raw proposal ${i} response:`, result);
          
          if (result && result !== '0x' && result.length > 2) {
            // Parse the proposal data properly
            const proposal = parseProposalData(result, i);
            if (proposal) {
              loadedProposals.push(proposal);
              console.log(`✅ Parsed proposal ${i}:`, proposal);
            }
          }
        } catch (error) {
          console.error(`❌ Error loading proposal ${i}:`, error);
        }
      }

      // Sort by ID (latest first)
      loadedProposals.sort((a, b) => b.id - a.id);
      
      setProposals(loadedProposals);
      console.log('✅ All proposals loaded:', loadedProposals);
      
    } catch (error) {
      console.error('❌ Error loading proposals:', error);
    }
  }, [daoStats, arenaSDK?.sdk?.provider]);

  // Create proposal
  const createProposal = async (description: string) => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('stake', undefined, 'DAO Proposal');

    try {
      setStep('creating');
      setIsLoading(true);

      console.log('📝 Creating proposal:', description);

      const descriptionHex = Buffer.from(description, 'utf8').toString('hex');
      const data = '0x49c2a1a6' +
                  '0000000000000000000000000000000000000000000000000000000000000020' +
                  description.length.toString(16).padStart(64, '0') +
                  descriptionHex.padEnd(Math.ceil(description.length / 32) * 64, '0');

      const txHash = await sendArenaTransaction(data);
      console.log('✅ Proposal created:', txHash);

      updateTransactionHash(notificationId, txHash);
      
      // Auto-refresh after 30 seconds
      setTimeout(() => {
        console.log('🔄 Auto-refreshing after proposal creation...');
        setIsLoading(false);
        setStep('idle');
        setRefreshTrigger(prev => prev + 1);
      }, 30000); // 30 seconds
      
      return txHash;
    } catch (error) {
      console.error('❌ Error creating proposal:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Proposal creation failed');
      
      // Consistent behavior: show countdown even on error
      setTimeout(() => {
        console.log('🔄 Clearing proposal creation error state...');
        setIsLoading(false);
        setStep('idle');
      }, 30000); // 30 seconds like farm
      
      throw error;
    }
  };

  // Vote on proposal
  const vote = async (proposalId: number, support: boolean) => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('claim', undefined, `Proposal ${proposalId}`);

    try {
      setStep('voting');
      setIsLoading(true);

      console.log('🗳️ Voting on proposal:', { proposalId, support });

      // vote(uint256,bool) - selector: 0xc9d27afe
      // proposalId: uint256 (32 bytes)
      // support: bool (32 bytes, 0x0...01 for true, 0x0...00 for false)
      const proposalIdHex = proposalId.toString(16).padStart(64, '0');
      const supportHex = support ? '0000000000000000000000000000000000000000000000000000000000000001' : '0000000000000000000000000000000000000000000000000000000000000000';
      
      const data = '0xc9d27afe' + proposalIdHex + supportHex;

      console.log('📊 Vote data:', {
        selector: '0xc9d27afe',
        proposalId,
        proposalIdHex,
        support,
        supportHex,
        fullData: data
      });

      const txHash = await sendArenaTransaction(data);
      console.log('✅ Vote cast:', txHash);

      updateTransactionHash(notificationId, txHash);
      
      // Auto-refresh after 30 seconds like farm
      setTimeout(() => {
        console.log('🔄 Auto-refreshing after vote...');
        setIsLoading(false);
        setStep('idle');
        setRefreshTrigger(prev => prev + 1);
      }, 30000); // 30 seconds like farm
      
      return txHash;
    } catch (error) {
      console.error('❌ Error voting:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Voting failed');
      
      // Consistent behavior: show countdown even on error
      setTimeout(() => {
        console.log('🔄 Clearing vote error state...');
        setIsLoading(false);
        setStep('idle');
      }, 30000); // 30 seconds like farm
      
      throw error;
    }
  };

  // Execute proposal
  const executeProposal = async (proposalId: number) => {
    if (!arenaSDK?.isConnected || !arenaSDK.address) {
      throw new Error('Arena wallet not connected');
    }

    const notificationId = startTransaction('unstake', undefined, `Proposal ${proposalId}`);

    try {
      setStep('executing');
      setIsLoading(true);

      console.log('⚡ Executing proposal:', proposalId);

      const data = '0x0d61b519' + proposalId.toString(16).padStart(64, '0');

      const txHash = await sendArenaTransaction(data);
      console.log('✅ Proposal executed:', txHash);

      updateTransactionHash(notificationId, txHash);
      
      // Auto-refresh after 30 seconds
      setTimeout(() => {
        console.log('🔄 Auto-refreshing after proposal execution...');
        setIsLoading(false);
        setStep('idle');
        setRefreshTrigger(prev => prev + 1);
      }, 30000); // 30 seconds
      
      return txHash;
    } catch (error) {
      console.error('❌ Error executing proposal:', error);
      setTransactionError(notificationId, error instanceof Error ? error.message : 'Execution failed');
      
      // Consistent behavior: show countdown even on error
      setTimeout(() => {
        console.log('🔄 Clearing execution error state...');
        setIsLoading(false);
        setStep('idle');
      }, 30000); // 30 seconds like farm
      
      throw error;
    }
  };

  // Calculate voting power value in USD
  const getVotingPowerValue = useCallback(() => {
    if (!userVotingPower || !priceData.price) return 0;
    
    const tokenAmount = Number(userVotingPower) / 1e18;
    return tokenAmount * priceData.price;
  }, [userVotingPower, priceData.price]);

  // Check if user is owner
  const isOwner = arenaSDK?.address?.toLowerCase() === DAO_CONFIG.OWNER.toLowerCase();

  // Auto refresh data
  useEffect(() => {
    loadDAOStats();
  }, [loadDAOStats, refreshTrigger]);

  useEffect(() => {
    if (daoStats) {
      loadProposals();
    }
  }, [daoStats, loadProposals, refreshTrigger]);

  useEffect(() => {
    loadUserVotingPower();
  }, [loadUserVotingPower, refreshTrigger]);

  // Get proposal status
  const getProposalStatus = (proposal: Proposal) => {
    const now = Date.now() / 1000;
    if (proposal.executed) return 'executed';
    if (now > proposal.endTime) return 'ended';
    if (now >= proposal.startTime) return 'active';
    return 'pending';
  };

  // Calculate vote percentages
  const getVotePercentages = (proposal: Proposal) => {
    const totalVotes = proposal.yesVotes + proposal.noVotes;
    if (totalVotes === 0n) return { yes: 0, no: 0 };
    
    const yesPercent = Number(proposal.yesVotes * 100n / totalVotes);
    const noPercent = 100 - yesPercent;
    
    return { yes: yesPercent, no: noPercent };
  };

  return {
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
    refresh: () => setRefreshTrigger(prev => prev + 1)
  };
};