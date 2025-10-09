const { logger } = require('../utils/logger');

/**
 * Ecosystem Staking Event Listener
 * Listens to:
 * 1. Factory events: PoolCreated, BurnAmountUpdated, WhitelistUpdated
 * 2. Individual pool events: Staked, Unstaked, RewardClaimed, EmergencyWithdraw, PoolUpdated
 */
class StakingEventListener {
  constructor(blockchain, storage) {
    this.blockchain = blockchain;
    this.storage = storage;
    this.eventType = 'staking';
    this.isListening = false;
    this.listeners = new Map(); // Store active listeners for each pool
    this.knownPools = new Set(); // Track discovered pools
  }

  /**
   * Start listening to staking events
   */
  async start() {
    try {
      this.isListening = true;
      logger.info('🎯 Starting Staking Event Listener...');

      // Index past events first
      logger.info('🔍 Step 1: Indexing past events...');
      await this.indexPastEvents();
      logger.info('✅ Step 1 completed: Past events indexed');

      // Start real-time listening
      logger.info('🔍 Step 2: Starting real-time listening...');
      await this.startRealTimeListening();
      logger.info('✅ Step 2 completed: Real-time listening started');

      logger.info('✅ Staking Event Listener started successfully');
    } catch (error) {
      logger.error('❌ Error starting staking event listener:', {
        message: error?.message || 'Unknown error',
        code: error?.code || 'No code',
        stack: error?.stack || 'No stack',
        name: error?.name || 'No name',
        toString: error?.toString() || 'No toString',
        errorType: typeof error,
        errorConstructor: error?.constructor?.name || 'No constructor'
      });
      throw error;
    }
  }

  /**
   * Stop listening to events
   */
  async stop() {
    try {
      this.isListening = false;
      
      // Stop all active listeners
      for (const [poolAddress, listeners] of this.listeners) {
        for (const listener of listeners) {
          if (listener.removeAllListeners) {
            listener.removeAllListeners();
          }
        }
      }
      this.listeners.clear();

      logger.info('🛑 Staking Event Listener stopped');
    } catch (error) {
      logger.error('❌ Error stopping staking event listener:', error);
    }
  }

  /**
   * Index past events from deployment (incremental)
   */
  async indexPastEvents() {
    try {
      const config = this.blockchain.getConfig();
      const currentBlock = await this.blockchain.getCurrentBlock();
      
      // Get last processed block for incremental indexing
      const lastProcessedBlock = await this.storage.getLatestBlock('staking');
      const startBlock = lastProcessedBlock ? lastProcessedBlock + 1 : (config.indexer?.startBlock || 0);

      if (startBlock > currentBlock) {
        logger.info('📚 No new blocks to process, skipping indexing');
        return;
      }

      logger.info(`📚 Incremental indexing from block ${startBlock} to ${currentBlock} (last processed: ${lastProcessedBlock || 'none'})`);

      // 1. Load known pools from storage
      logger.info('🔍 Step 1.0: Loading known pools from storage...');
      await this.loadKnownPools();
      logger.info('✅ Step 1.0 completed');

      // 2. Discover existing pools from factory (only for first run)
      if (!lastProcessedBlock) {
        logger.info('🔍 Step 1.1: Discovering existing pools (first run)...');
        await this.discoverExistingPools();
        logger.info('✅ Step 1.1 completed');
      }

      // 3. Index factory events to discover new pools
      logger.info('🔍 Step 1.2: Indexing factory events...');
      await this.indexFactoryEvents(startBlock, currentBlock);
      logger.info('✅ Step 1.2 completed');

      // 4. Then index all pool events for discovered pools
      logger.info('🔍 Step 1.3: Indexing pool events...');
      await this.indexAllPoolEvents(startBlock, currentBlock);
      logger.info('✅ Step 1.3 completed');

      // 5. Save latest processed block
      await this.storage.setLatestBlock(currentBlock, 'staking');
      logger.info(`💾 Saved latest processed block: ${currentBlock}`);

      logger.info(`✅ Incremental indexing completed: ${startBlock} → ${currentBlock} (${currentBlock - startBlock + 1} blocks)`);
    } catch (error) {
      logger.error('❌ Error indexing past events:', {
        message: error?.message || 'Unknown error',
        code: error?.code || 'No code',
        stack: error?.stack || 'No stack',
        name: error?.name || 'No name'
      });
      throw error;
    }
  }

  /**
   * Load known pools from storage
   */
  async loadKnownPools() {
    try {
      const poolsData = await this.storage.getPoolsData();
      if (poolsData && Array.isArray(poolsData)) {
        let loadedCount = 0;
        for (const pool of poolsData) {
          if (pool.address) {
            this.knownPools.add(pool.address);
            loadedCount++;
          }
        }
        logger.info(`🗂️ Loaded ${loadedCount} known pools from storage`);
      } else {
        logger.info('🗂️ No pools found in storage, will discover from factory');
      }
    } catch (error) {
      logger.warn('⚠️ Could not load known pools from storage:', error.message);
    }
  }

  /**
   * Discover existing pools from factory
   */
  async discoverExistingPools() {
    try {
      logger.info('🔍 Discovering existing pools from factory...');
      
      // Get factory system info
      try {
        const systemInfo = await this.blockchain.getFactorySystemInfo();
        if (systemInfo) {
          logger.info(`🏭 Factory System Info:`, systemInfo.formatted);
        }
      } catch (err) {
        logger.warn('⚠️ Could not get factory system info:', err.message);
      }

      // Get all existing pools
      try {
        const allPools = await this.blockchain.getAllPools();
        logger.info(`📦 Found ${allPools.length} existing pools`);

        // Add all pools to known pools set
        for (const poolAddress of allPools) {
          this.knownPools.add(poolAddress);
          logger.info(`➕ Added pool: ${this.blockchain.formatAddress(poolAddress)}`);
        }

        if (allPools.length > 0) {
          logger.info(`✅ Discovered ${allPools.length} existing pools from factory`);
          
          // Log a sample of pool info
          for (let i = 0; i < Math.min(3, allPools.length); i++) {
            const poolAddress = allPools[i];
            try {
              const [poolInfo, poolMetadata] = await Promise.all([
                this.blockchain.getPoolInfo(poolAddress),
                this.blockchain.getPoolMetadata(poolAddress)
              ]);
              
              logger.info(`📊 Pool ${i + 1}: ${poolMetadata?.poolName || 'Unknown'} (${this.blockchain.formatAddress(poolAddress)})`);
              logger.info(`   Total Staked: ${this.blockchain.formatAmount(poolInfo?.totalStaked || '0', 18)}`);
            } catch (err) {
              logger.warn(`⚠️ Could not get info for pool ${this.blockchain.formatAddress(poolAddress)}:`, err.message);
            }
          }
          
          if (allPools.length > 3) {
            logger.info(`   ... and ${allPools.length - 3} more pools`);
          }
        }
      } catch (err) {
        logger.warn('⚠️ Could not get all pools from factory:', err.message);
      }
      
    } catch (error) {
      logger.error('❌ Error discovering existing pools:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name
      });
      // Don't throw, continue with event indexing
    }
  }

  /**
   * Index factory events in batches
   */
  async indexFactoryEvents(fromBlock, toBlock) {
    const factory = this.blockchain.getContract('EcosystemStakingFactory');
    if (!factory) {
      logger.warn('⚠️ Factory contract not available, skipping factory events');
      return;
    }

    const maxBlockRange = this.blockchain.getMaxBlockRange();
    let currentFrom = fromBlock;

    while (currentFrom <= toBlock) {
      const currentTo = Math.min(currentFrom + maxBlockRange - 1, toBlock);
      
      try {
        logger.info(`🔍 Querying factory events ${currentFrom}-${currentTo}`);

        // PoolCreated events
        const poolCreatedEvents = await factory.queryFilter(
          factory.filters.PoolCreated(),
          currentFrom,
          currentTo
        );

        for (const event of poolCreatedEvents) {
          await this.processPoolCreatedEvent(event);
        }

        // BurnAmountUpdated events  
        const burnAmountEvents = await factory.queryFilter(
          factory.filters.BurnAmountUpdated(),
          currentFrom,
          currentTo
        );

        for (const event of burnAmountEvents) {
          await this.processBurnAmountUpdatedEvent(event);
        }

        // WhitelistUpdated events  
        const whitelistEvents = await factory.queryFilter(
          factory.filters.WhitelistUpdated(),
          currentFrom,
          currentTo
        );

        for (const event of whitelistEvents) {
          await this.processWhitelistUpdatedEvent(event);
        }

        logger.info(`✅ Processed factory events ${currentFrom}-${currentTo}`);

      } catch (error) {
        logger.error(`❌ Error querying factory events ${currentFrom}-${currentTo}:`, {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        // Continue with next batch
      }

      currentFrom = currentTo + 1;
      
      // Small delay to avoid rate limiting
      if (currentFrom <= toBlock) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Index all pool events for discovered pools
   */
  async indexAllPoolEvents(fromBlock, toBlock) {
    if (this.knownPools.size === 0) {
      logger.info('📭 No pools discovered, skipping pool events indexing');
      return;
    }

    logger.info(`🏊 Indexing events for ${this.knownPools.size} discovered pools`);

    for (const poolAddress of this.knownPools) {
      try {
        await this.indexPoolEvents(poolAddress, fromBlock, toBlock);
      } catch (error) {
        logger.error(`❌ Error indexing pool ${poolAddress}:`, error);
        // Continue with next pool
      }
    }
  }

  /**
   * Index events for a specific pool
   */
  async indexPoolEvents(poolAddress, fromBlock, toBlock) {
    const pool = this.blockchain.getPoolContract(poolAddress);
    if (!pool) {
      logger.warn(`⚠️ Could not create contract for pool ${poolAddress}`);
      return;
    }

    const maxBlockRange = this.blockchain.getMaxBlockRange();
    let currentFrom = fromBlock;

    logger.info(`🔍 Indexing events for pool ${poolAddress}`);

    while (currentFrom <= toBlock) {
      const currentTo = Math.min(currentFrom + maxBlockRange - 1, toBlock);
      
      try {
        // Staked events
        const stakedEvents = await pool.queryFilter(
          pool.filters.Staked(),
          currentFrom,
          currentTo
        );

        for (const event of stakedEvents) {
          await this.processStakedEvent(event, poolAddress);
        }

        // Unstaked events
        const unstakedEvents = await pool.queryFilter(
          pool.filters.Unstaked(),
          currentFrom,
          currentTo
        );

        for (const event of unstakedEvents) {
          await this.processUnstakedEvent(event, poolAddress);
        }

        // RewardClaimed events
        const rewardClaimedEvents = await pool.queryFilter(
          pool.filters.RewardClaimed(),
          currentFrom,
          currentTo
        );

        for (const event of rewardClaimedEvents) {
          await this.processRewardClaimedEvent(event, poolAddress);
        }

        // EmergencyWithdraw events
        const emergencyWithdrawEvents = await pool.queryFilter(
          pool.filters.EmergencyWithdraw(),
          currentFrom,
          currentTo
        );

        for (const event of emergencyWithdrawEvents) {
          await this.processEmergencyWithdrawEvent(event, poolAddress);
        }

        // PoolUpdated events
        const poolUpdatedEvents = await pool.queryFilter(
          pool.filters.PoolUpdated(),
          currentFrom,
          currentTo
        );

        for (const event of poolUpdatedEvents) {
          await this.processPoolUpdatedEvent(event, poolAddress);
        }

      } catch (error) {
        logger.error(`❌ Error querying pool events ${poolAddress} ${currentFrom}-${currentTo}:`, {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        // Continue with next batch
      }

      currentFrom = currentTo + 1;
      
      // Small delay to avoid rate limiting
      if (currentFrom <= toBlock) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    logger.info(`✅ Completed indexing for pool ${poolAddress}`);
  }

  /**
   * Start real-time event listening with polling
   */
  async startRealTimeListening() {
    try {
      logger.info('🎧 Starting real-time event listening with polling...');
      
      // Start polling-based listeners
      this.startPollingListener();
      
      logger.info('🎧 Real-time event listening started');
    } catch (error) {
      logger.error('❌ Error starting real-time listeners:', error);
      throw error;
    }
  }

  /**
   * Start polling-based event listener
   */
  async startPollingListener() {
    const config = this.blockchain.getConfig();
    const pollingInterval = config.indexer?.pollingInterval || 15000;
    let lastCheckedBlock = await this.blockchain.getCurrentBlock();

    const poll = async () => {
      try {
        const currentBlock = await this.blockchain.getCurrentBlock();
        
        if (currentBlock > lastCheckedBlock) {
          logger.info(`🔍 Polling: Checking blocks ${lastCheckedBlock + 1} to ${currentBlock}`);
          
          // Check factory events for new pools
          await this.indexFactoryEvents(lastCheckedBlock + 1, currentBlock);
          
          // Check pool events for all known pools
          for (const poolAddress of this.knownPools) {
            await this.indexPoolEvents(poolAddress, lastCheckedBlock + 1, currentBlock);
          }
          
          lastCheckedBlock = currentBlock;
        }
      } catch (error) {
        logger.error('❌ Error in polling listener:', error.message);
      }
      
      // Schedule next poll
      setTimeout(poll, pollingInterval);
    };

    // Start polling
    setTimeout(poll, pollingInterval);
    logger.info(`🔄 Polling listener started (interval: ${pollingInterval}ms)`);
  }

  /**
   * Start factory event listener
   */
  async startFactoryListener() {
    const factory = this.blockchain.getContract('EcosystemStakingFactory');
    if (!factory) {
      logger.warn('⚠️ Factory contract not available, skipping real-time factory listener');
      return;
    }

    // Listen for new pools
    factory.on('PoolCreated', async (poolAddress, creator, stakingToken, rewardToken, rewardPerBlock, startBlock, endBlock, event) => {
      await this.processPoolCreatedEvent(event);
      // Start listening to the new pool
      await this.startPoolListener(poolAddress);
    });

    // Listen for other factory events
    factory.on('BurnAmountUpdated', async (oldAmount, newAmount, event) => {
      await this.processBurnAmountUpdatedEvent(event);
    });

    factory.on('WhitelistUpdated', async (account, status, event) => {
      await this.processWhitelistUpdatedEvent(event);
    });

    logger.info('🏭 Factory event listener started');
  }

  /**
   * Start pool event listener
   */
  async startPoolListener(poolAddress) {
    if (this.listeners.has(poolAddress)) {
      logger.debug(`Pool ${poolAddress} already has active listeners`);
      return;
    }

    const pool = this.blockchain.getPoolContract(poolAddress);
    if (!pool) {
      logger.warn(`⚠️ Could not create contract for pool ${poolAddress}`);
      return;
    }

    const poolListeners = [];

    // Staked events
    pool.on('Staked', async (user, amount, event) => {
      await this.processStakedEvent(event, poolAddress);
    });
    poolListeners.push(pool);

    // Unstaked events
    pool.on('Unstaked', async (user, amount, event) => {
      await this.processUnstakedEvent(event, poolAddress);
    });

    // RewardClaimed events
    pool.on('RewardClaimed', async (user, amount, event) => {
      await this.processRewardClaimedEvent(event, poolAddress);
    });

    // EmergencyWithdraw events
    pool.on('EmergencyWithdraw', async (user, amount, event) => {
      await this.processEmergencyWithdrawEvent(event, poolAddress);
    });

    // PoolUpdated events
    pool.on('PoolUpdated', async (lastRewardBlock, accRewardPerShare, event) => {
      await this.processPoolUpdatedEvent(event, poolAddress);
    });

    this.listeners.set(poolAddress, poolListeners);
    logger.info(`🏊 Started listening to pool ${poolAddress}`);
  }

  /**
   * Process PoolCreated event
   */
  async processPoolCreatedEvent(event) {
    try {
      const args = event.args;
      const poolAddress = args.poolAddress;

      // Add to known pools
      this.knownPools.add(poolAddress);

      // Get pool info and metadata from pool contract directly
      let poolInfo = null;
      let poolMetadata = null;
      let stakingTokenInfo = null;
      let rewardTokenInfo = null;
      
      try {
        // Get comprehensive pool info from pool contract
        poolInfo = await this.blockchain.getPoolInfo(poolAddress);
        poolMetadata = await this.blockchain.getPoolMetadata(poolAddress);
        
        // Get token information if pool info is available
        if (poolInfo) {
          stakingTokenInfo = await this.blockchain.getTokenInfo(poolInfo.stakingToken);
          rewardTokenInfo = await this.blockchain.getTokenInfo(poolInfo.rewardToken);
        }
        
        logger.info(`📊 Retrieved comprehensive pool data for ${this.blockchain.formatAddress(poolAddress)}`);
      } catch (infoError) {
        logger.warn(`⚠️ Could not retrieve pool info/metadata for ${poolAddress}:`, infoError.message);
      }

      const eventData = {
        eventName: 'PoolCreated',
        contractName: 'EcosystemStakingFactory',
        contractAddress: event.address,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        // Event args
        poolAddress: poolAddress,
        creator: args.creator,
        stakingToken: args.stakingToken,
        rewardToken: args.rewardToken,
        rewardPerBlock: args.rewardPerBlock?.toString(),
        startBlock: args.startBlock?.toString(),
        endBlock: args.endBlock?.toString(),
        
        // Additional pool info from pool contract
        poolInfo: poolInfo ? {
          stakingToken: poolInfo.stakingToken,
          rewardToken: poolInfo.rewardToken,
          totalStaked: poolInfo.totalStaked?.toString(),
          rewardPerBlock: poolInfo.rewardPerBlock?.toString(),
          startBlock: poolInfo.startBlock?.toString(),
          endBlock: poolInfo.endBlock?.toString(),
          lastRewardBlock: poolInfo.lastRewardBlock?.toString(),
          creator: poolInfo.creator
        } : null,
        
        // Pool metadata from pool contract
        poolMetadata: poolMetadata ? {
          poolName: poolMetadata.poolName || '',
          poolDescription: poolMetadata.poolDescription || '',
          stakingSymbol: poolMetadata.stakingSymbol || '',
          rewardSymbol: poolMetadata.rewardSymbol || '',
          stakingLogo: poolMetadata.stakingLogo || '',
          rewardLogo: poolMetadata.rewardLogo || ''
        } : null,
        
        // Token information
        stakingTokenInfo: stakingTokenInfo ? {
          address: stakingTokenInfo.address,
          name: stakingTokenInfo.name,
          symbol: stakingTokenInfo.symbol,
          decimals: stakingTokenInfo.decimals,
          totalSupply: stakingTokenInfo.totalSupply
        } : null,
        
        rewardTokenInfo: rewardTokenInfo ? {
          address: rewardTokenInfo.address,
          name: rewardTokenInfo.name,
          symbol: rewardTokenInfo.symbol,
          decimals: rewardTokenInfo.decimals,
          totalSupply: rewardTokenInfo.totalSupply
        } : null,
        
        formatted: {
          poolAddress: this.blockchain.formatAddress(poolAddress),
          creator: this.blockchain.formatAddress(args.creator),
          stakingToken: this.blockchain.formatAddress(args.stakingToken),
          rewardToken: this.blockchain.formatAddress(args.rewardToken),
          rewardPerBlock: this.blockchain.formatAmount(args.rewardPerBlock, rewardTokenInfo?.decimals || 18),
          startBlock: args.startBlock?.toString(),
          endBlock: args.endBlock?.toString(),
          poolName: poolMetadata?.poolName || 'Unknown Pool',
          stakingSymbol: stakingTokenInfo?.symbol || poolMetadata?.stakingSymbol || 'UNKNOWN',
          rewardSymbol: rewardTokenInfo?.symbol || poolMetadata?.rewardSymbol || 'UNKNOWN',
          totalStaked: poolInfo ? this.blockchain.formatAmount(poolInfo.totalStaked, stakingTokenInfo?.decimals || 18) : '0'
        }
      };

      const added = await this.storage.addEvent(this.eventType, eventData);
      if (added) {
        logger.event('PoolCreated', eventData.formatted);
        
        // Save structured pool data for frontend
        const frontendPoolData = this.storage.createFrontendPoolStructure(eventData);
        if (frontendPoolData) {
          await this.storage.savePoolData(poolAddress, frontendPoolData);
          logger.info(`💾 Saved frontend pool data for ${this.blockchain.formatAddress(poolAddress)}`);
        }
      }
      
    } catch (error) {
      logger.error('❌ Error processing PoolCreated event:', error);
    }
  }

  /**
   * Process BurnAmountUpdated event
   */
  async processBurnAmountUpdatedEvent(event) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'BurnAmountUpdated',
        contractName: 'EcosystemStakingFactory',
        contractAddress: event.address,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        oldAmount: args.oldAmount?.toString(),
        newAmount: args.newAmount?.toString(),
        
        formatted: {
          oldAmount: this.blockchain.formatAmount(args.oldAmount, 18),
          newAmount: this.blockchain.formatAmount(args.newAmount, 18)
        }
      };

      const added = await this.storage.addEvent(this.eventType, eventData);
      if (added) {
        logger.event('BurnAmountUpdated', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing BurnAmountUpdated event:', error);
    }
  }

  /**
   * Process WhitelistUpdated event
   */
  async processWhitelistUpdatedEvent(event) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'WhitelistUpdated',
        contractName: 'EcosystemStakingFactory',
        contractAddress: event.address,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        account: args.account,
        status: args.status,
        
        formatted: {
          account: this.blockchain.formatAddress(args.account),
          status: args.status ? 'Whitelisted' : 'Removed'
        }
      };

      const added = await this.storage.addEvent(this.eventType, eventData);
      if (added) {
        logger.event('WhitelistUpdated', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing WhitelistUpdated event:', error);
    }
  }

  /**
   * Process Staked event
   */
  async processStakedEvent(event, poolAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'Staked',
        contractName: 'EcosystemStaking',
        contractAddress: poolAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        user: args.user,
        amount: args.amount?.toString(),
        
        formatted: {
          user: this.blockchain.formatAddress(args.user),
          amount: this.blockchain.formatAmount(args.amount, 18),
          pool: this.blockchain.formatAddress(poolAddress)
        }
      };

      const added = await this.storage.addEvent(this.eventType, eventData);
      if (added) {
        logger.event('Staked', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing Staked event:', error);
    }
  }

  /**
   * Process Unstaked event
   */
  async processUnstakedEvent(event, poolAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'Unstaked',
        contractName: 'EcosystemStaking',
        contractAddress: poolAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        user: args.user,
        amount: args.amount?.toString(),
        
        formatted: {
          user: this.blockchain.formatAddress(args.user),
          amount: this.blockchain.formatAmount(args.amount, 18),
          pool: this.blockchain.formatAddress(poolAddress)
        }
      };

      const added = await this.storage.addEvent(this.eventType, eventData);
      if (added) {
        logger.event('Unstaked', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing Unstaked event:', error);
    }
  }

  /**
   * Process RewardClaimed event
   */
  async processRewardClaimedEvent(event, poolAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'RewardClaimed',
        contractName: 'EcosystemStaking',
        contractAddress: poolAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        user: args.user,
        amount: args.amount?.toString(),
        
        formatted: {
          user: this.blockchain.formatAddress(args.user),
          amount: this.blockchain.formatAmount(args.amount, 18),
          pool: this.blockchain.formatAddress(poolAddress)
        }
      };

      const added = await this.storage.addEvent(this.eventType, eventData);
      if (added) {
        logger.event('RewardClaimed', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing RewardClaimed event:', error);
    }
  }

  /**
   * Process EmergencyWithdraw event
   */
  async processEmergencyWithdrawEvent(event, poolAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'EmergencyWithdraw',
        contractName: 'EcosystemStaking',
        contractAddress: poolAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        user: args.user,
        amount: args.amount?.toString(),
        
        formatted: {
          user: this.blockchain.formatAddress(args.user),
          amount: this.blockchain.formatAmount(args.amount, 18),
          pool: this.blockchain.formatAddress(poolAddress)
        }
      };

      const added = await this.storage.addEvent(this.eventType, eventData);
      if (added) {
        logger.event('EmergencyWithdraw', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing EmergencyWithdraw event:', error);
    }
  }

  /**
   * Process PoolUpdated event
   */
  async processPoolUpdatedEvent(event, poolAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'PoolUpdated',
        contractName: 'EcosystemStaking',
        contractAddress: poolAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        lastRewardBlock: args.lastRewardBlock?.toString(),
        accRewardPerShare: args.accRewardPerShare?.toString(),
        
        formatted: {
          lastRewardBlock: args.lastRewardBlock?.toString(),
          accRewardPerShare: this.blockchain.formatAmount(args.accRewardPerShare, 18),
          pool: this.blockchain.formatAddress(poolAddress)
        }
      };

      const added = await this.storage.addEvent(this.eventType, eventData);
      if (added) {
        logger.event('PoolUpdated', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing PoolUpdated event:', error);
    }
  }

  /**
   * Get comprehensive pool summary
   */
  async getPoolSummary(poolAddress) {
    try {
      const [poolInfo, poolMetadata, poolState] = await Promise.all([
        this.blockchain.getPoolInfo(poolAddress),
        this.blockchain.getPoolMetadata(poolAddress),
        this.blockchain.getPoolContractState(poolAddress)
      ]);

      return {
        address: poolAddress,
        info: poolInfo,
        metadata: poolMetadata,
        state: poolState,
        formatted: {
          address: this.blockchain.formatAddress(poolAddress),
          name: poolMetadata?.poolName || 'Unknown Pool',
          totalStaked: this.blockchain.formatAmount(poolState?.totalStaked || '0', 18),
          rewardPerBlock: this.blockchain.formatAmount(poolState?.rewardPerBlock || '0', 18),
          creator: this.blockchain.formatAddress(poolState?.creator || '0x0'),
          isActive: true // You can add logic to determine if pool is active
        }
      };
    } catch (error) {
      logger.error(`❌ Error getting pool summary for ${poolAddress}:`, error);
      return null;
    }
  }

  /**
   * Get all known pools with their current state
   */
  async getAllPoolsSummary() {
    const summaries = [];
    for (const poolAddress of this.knownPools) {
      const summary = await this.getPoolSummary(poolAddress);
      if (summary) {
        summaries.push(summary);
      }
    }
    return summaries;
  }

  /**
   * Get listener status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      knownPools: this.knownPools.size,
      activeListeners: this.listeners.size,
      pools: Array.from(this.knownPools)
    };
  }
}

module.exports = StakingEventListener;