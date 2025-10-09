#!/usr/bin/env node

require('dotenv').config();
const path = require('path');

// Import utilities
const JSONStorage = require('./utils/storage');
const { BlockchainManager } = require('./utils/blockchain');
const { logger } = require('./utils/logger');

// Import event listeners
const StakingEventListener = require('./listeners/staking');
const NFTEventListener = require('./listeners/nft');
const IndexerAPIServer = require('./api-server');

/**
 * Main OrderStake Event Indexer
 * Monitors Avalanche C-Chain for ecosystem contract events
 */
class OrderStakeIndexer {
  constructor() {
    this.config = null;
    this.storage = null;
    this.blockchain = null;
    this.listeners = new Map();
    this.apiServer = null;
    this.isRunning = false;
    this.startTime = null;
  }

  /**
   * Initialize the indexer
   */
  async init() {
    try {
      // Load configuration
      await this.loadConfig();
      
      // Initialize storage
      this.storage = new JSONStorage(path.join(__dirname, 'data'));
      await this.storage.init();
      
      // Initialize blockchain connection
      this.blockchain = new BlockchainManager(this.config);
      await this.blockchain.init();
      
      // Initialize event listeners
      await this.initializeListeners();
      
      // Initialize API server
      this.apiServer = new IndexerAPIServer(this.storage, this.config.api?.port || 3001);
      
      logger.info('🚀 OrderStake Indexer initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize indexer:', error);
      throw error;
    }
  }

  /**
   * Load configuration from file
   */
  async loadConfig() {
    try {
      const fs = require('fs').promises;
      const configPath = path.join(__dirname, 'config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // Override with environment variables
      if (process.env.RPC_URL) {
        this.config.rpc.primary = process.env.RPC_URL;
      }
      
      if (process.env.ECOSYSTEM_STAKING_FACTORY_ADDRESS) {
        this.config.contracts.EcosystemStakingFactory.address = process.env.ECOSYSTEM_STAKING_FACTORY_ADDRESS;
        this.config.contracts.EcosystemStakingFactory.isActive = true;
      }
      
      if (process.env.ORDER_NFT_LAUNCH_ADDRESS) {
        this.config.contracts.OrderNFTLaunch.address = process.env.ORDER_NFT_LAUNCH_ADDRESS;
        this.config.contracts.OrderNFTLaunch.isActive = true;
      }
      
      if (process.env.START_BLOCK) {
        this.config.indexer.startBlock = parseInt(process.env.START_BLOCK);
      }
      
      logger.info('📋 Configuration loaded successfully');
      
    } catch (error) {
      logger.error('❌ Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Initialize event listeners
   */
  async initializeListeners() {
    try {
      // Staking events listener
      const stakingListener = new StakingEventListener(this.blockchain, this.storage);
      this.listeners.set('staking', stakingListener);
      
      // NFT events listener
      const nftListener = new NFTEventListener(this.blockchain, this.storage);
      this.listeners.set('nft', nftListener);
      
      logger.info('🎯 Event listeners initialized');
      
    } catch (error) {
      logger.error('❌ Failed to initialize listeners:', error);
      throw error;
    }
  }

  /**
   * Start the indexer
   */
  async start() {
    if (this.isRunning) {
      logger.warn('⚠️  Indexer is already running');
      return;
    }

    try {
      this.startTime = Date.now();
      this.isRunning = true;
      
      logger.info('🔥 Starting OrderStake Event Indexer...');
      logger.info(`🌐 Network: ${this.config.network} (Chain ID: ${this.config.chainId})`);
      logger.info(`🔗 RPC: ${this.config.rpc.primary}`);
      
      // Display contract status
      await this.displayContractStatus();
      
      // Start all listeners
      for (const [name, listener] of this.listeners) {
        try {
          await listener.start();
          logger.info(`✅ ${name} listener started`);
        } catch (error) {
          console.log(`❌ DETAILED ${name.toUpperCase()} ERROR:`);
          console.log('Type:', typeof error);
          console.log('Message:', error?.message);
          console.log('Code:', error?.code);
          console.log('Name:', error?.name);
          console.log('Stack:', error?.stack);
          console.log('String:', String(error));
          console.log('JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          logger.error(`❌ Failed to start ${name} listener:`, error);
        }
      }
      
      // Start API server
      try {
        await this.apiServer.start();
        logger.info('✅ API Server started');
      } catch (error) {
        logger.error('❌ Failed to start API server:', error);
        throw error;
      }
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Start monitoring
      this.startMonitoring();
      
      logger.info('🎉 OrderStake Indexer is now running!');
      logger.info('Press Ctrl+C to stop gracefully');
      
    } catch (error) {
      logger.error('❌ Failed to start indexer:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the indexer
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping OrderStake Indexer...');
    this.isRunning = false;
    
    try {
      // Stop all listeners
      for (const [name, listener] of this.listeners) {
        try {
          await listener.stop();
          logger.info(`✅ ${name} listener stopped`);
        } catch (error) {
          logger.error(`❌ Error stopping ${name} listener:`, error);
        }
      }
      
      // Stop API server
      if (this.apiServer) {
        try {
          await this.apiServer.stop();
          logger.info('✅ API Server stopped');
        } catch (error) {
          logger.error('❌ Error stopping API server:', error);
        }
      }
      
      // Log final statistics
      await this.logFinalStats();
      
      logger.info('👋 OrderStake Indexer stopped gracefully');
      
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Display contract status
   */
  async displayContractStatus() {
    logger.info('📝 Contract Status:');
    
    const contracts = this.blockchain.getLoadedContracts();
    for (const contractName of contracts) {
      const config = this.blockchain.getContractConfig(contractName);
      logger.info(`  • ${contractName}: ${config.address.slice(0, 6)}...${config.address.slice(-4)} ✅`);
    }
    
    // Show inactive contracts
    for (const [contractName, config] of Object.entries(this.config.contracts)) {
      if (!config.isActive || !contracts.includes(contractName)) {
        const status = !config.isActive ? '⏸️ Inactive' : '❌ Failed to load';
        logger.info(`  • ${contractName}: ${config.address.slice(0, 6)}...${config.address.slice(-4)} ${status}`);
      }
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdownHandler = async (signal) => {
      logger.info(`\n🔄 Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.errorWithContext('💥 Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.errorWithContext('💥 Unhandled Rejection:', reason, { promise });
      process.exit(1);
    });
  }

  /**
   * Start monitoring and periodic tasks
   */
  startMonitoring() {
    // Status monitoring every 5 minutes
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.logStatus();
      } catch (error) {
        logger.error('❌ Error during status monitoring:', error);
      }
    }, 5 * 60 * 1000);

    // Storage statistics every 15 minutes
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.logStorageStats();
      } catch (error) {
        logger.error('❌ Error during storage monitoring:', error);
      }
    }, 15 * 60 * 1000);
  }

  /**
   * Log current status
   */
  async logStatus() {
    const currentBlock = await this.blockchain.getCurrentBlock();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    logger.info('📊 Status Update:', {
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      currentBlock,
      listeners: Object.fromEntries(
        Array.from(this.listeners.entries()).map(([name, listener]) => [
          name,
          listener.getStatus ? listener.getStatus() : { isListening: true }
        ])
      )
    });
  }

  /**
   * Log storage statistics
   */
  async logStorageStats() {
    const stats = await this.storage.getStats();
    logger.info('💾 Storage Statistics:', stats);
  }

  /**
   * Log final statistics on shutdown
   */
  async logFinalStats() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const stats = await this.storage.getStats();
    
    const totalEvents = Object.values(stats).reduce((sum, stat) => sum + stat.eventCount, 0);
    
    logger.info('📈 Final Statistics:', {
      totalUptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
      totalEventsIndexed: totalEvents,
      storageStats: stats
    });
  }

  /**
   * Get current status (for API)
   */
  async getStatus() {
    const currentBlock = await this.blockchain.getCurrentBlock();
    const uptime = this.startTime ? Date.now() - this.startTime : 0;
    const stats = await this.storage.getStats();
    
    return {
      isRunning: this.isRunning,
      uptime,
      currentBlock,
      network: {
        name: this.config.network,
        chainId: this.config.chainId,
        rpc: this.config.rpc.primary
      },
      contracts: this.blockchain.getLoadedContracts(),
      listeners: Object.fromEntries(
        Array.from(this.listeners.entries()).map(([name, listener]) => [
          name,
          listener.getStatus ? listener.getStatus() : { isListening: true }
        ])
      ),
      storage: stats
    };
  }
}

/**
 * Main execution
 */
async function main() {
  const indexer = new OrderStakeIndexer();
  
  try {
    await indexer.init();
    
    // Check if this is a one-time run (for GitHub Actions)
    const isOneTimeRun = process.env.NODE_ENV === 'production' || process.argv.includes('--once');
    
    if (isOneTimeRun) {
      logger.info('🤖 Running in one-time mode (GitHub Actions)');
      
      // Only run the staking listener to index events
      const stakingListener = indexer.listeners.get('staking');
      if (stakingListener) {
        // Index past events only
        await stakingListener.indexPastEvents();
        logger.info('✅ One-time indexing completed');
      }
      
      process.exit(0);
    } else {
      // Normal continuous mode
      await indexer.start();
      
      // Keep the process alive
      await new Promise(() => {});
    }
    
  } catch (error) {
    logger.error('💥 Fatal error:', error);
    console.error('Full error:', error); // Additional console logging
    process.exit(1);
  }
}

// Auto-start if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Failed to start indexer:', error);
    process.exit(1);
  });
}

module.exports = OrderStakeIndexer;