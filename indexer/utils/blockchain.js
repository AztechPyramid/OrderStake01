const { ethers } = require('ethers');
const { logger } = require('./logger');

/**
 * Blockchain connection and contract management utility
 */
class BlockchainManager {
  constructor(config) {
    this.config = config;
    this.provider = null;
    this.contracts = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.indexer?.retryAttempts || 3;
    this.isConnected = false;
  }

  /**
   * Initialize the blockchain manager
   */
  async init() {
    await this.connectProvider();
    await this.loadContracts();
    await this.verifyNetwork();
    this.setupConnectionMonitoring();
    logger.info('🚀 Blockchain manager initialized');
  }

  /**
   * Connect to RPC provider
   */
  async connectProvider() {
    try {
      const rpcUrl = this.config.rpc.primary;
      logger.info(`🔗 Connecting to RPC: ${rpcUrl}`);
      
      // Create provider with proper configuration
      this.provider = new ethers.JsonRpcProvider(rpcUrl, {
        name: this.config.network,
        chainId: this.config.chainId
      });

      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`✅ Connected to network: ${network.name} (${network.chainId})`);
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      return this.provider;
    } catch (error) {
      logger.error('❌ Failed to connect to RPC:', error.message);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        logger.info(`🔄 Retrying connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.connectProvider();
      }
      
      throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
    }
  }

  /**
   * Load and initialize contracts
   */
  async loadContracts() {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const abiDir = path.join(__dirname, '../abi');
      
      for (const [contractName, contractConfig] of Object.entries(this.config.contracts)) {
        // Check if contract is active (default to true if not specified)
        if (contractConfig.isActive === false) {
          logger.warn(`⚠️  Skipping ${contractName}: Contract is inactive`);
          continue;
        }

        if (!contractConfig.address || contractConfig.address === '0x0000000000000000000000000000000000000000') {
          logger.warn(`⚠️  Skipping ${contractName}: No address configured`);
          continue;
        }

        try {
          const abiPath = path.join(abiDir, `${contractName}.json`);
          
          if (!fs.existsSync(abiPath)) {
            logger.warn(`⚠️  Skipping ${contractName}: ABI file not found at ${abiPath}`);
            continue;
          }

          const abiData = fs.readFileSync(abiPath, 'utf8');
          const abi = JSON.parse(abiData);
          
          const contract = new ethers.Contract(
            contractConfig.address,
            abi,
            this.provider
          );
          
          this.contracts.set(contractName, contract);
          logger.info(`📝 Loaded contract: ${contractName} at ${contractConfig.address}`);
          
        } catch (error) {
          logger.error(`❌ Failed to load ${contractName}:`, error.message);
        }
      }
      
      logger.info(`📚 Loaded ${this.contracts.size} contracts`);
    } catch (error) {
      logger.error('❌ Failed to load contracts:', error.message);
      throw error;
    }
  }

  /**
   * Verify network connection
   */
  async verifyNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const expectedChainId = BigInt(this.config.chainId);
      
      if (network.chainId !== expectedChainId) {
        throw new Error(`Network mismatch: expected ${expectedChainId}, got ${network.chainId}`);
      }
      
      logger.info(`✅ Network verified: ${network.name} (${network.chainId})`);
      return true;
    } catch (error) {
      logger.error('❌ Network verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring() {
    // Monitor provider connection
    this.provider.on('error', (error) => {
      logger.error('🔌 Provider error:', error.message);
      this.handleConnectionLoss();
    });

    // Periodic health check
    setInterval(async () => {
      if (!await this.isHealthy()) {
        logger.warn('⚠️  Connection unhealthy, attempting reconnection...');
        await this.handleConnectionLoss();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy() {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.warn('🔍 Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Handle connection loss
   */
  async handleConnectionLoss() {
    this.isConnected = false;
    
    try {
      logger.info('🔄 Attempting to reconnect...');
      await this.connectProvider();
      
      // Reload contracts if needed
      if (this.contracts.size === 0) {
        await this.loadContracts();
      }
      
      logger.info('✅ Reconnection successful');
    } catch (error) {
      logger.error('❌ Reconnection failed:', error.message);
      
      // Exponential backoff
      const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
      setTimeout(() => this.handleConnectionLoss(), delay);
    }
  }

  /**
   * Get contract instance
   */
  getContract(contractName) {
    const contract = this.contracts.get(contractName);
    if (!contract) {
      logger.warn(`⚠️  Contract ${contractName} not found`);
    }
    return contract;
  }

  /**
   * Get contract configuration
   */
  getContractConfig(contractName) {
    return this.config.contracts[contractName] || null;
  }

  /**
   * Get current block number
   */
  async getCurrentBlock() {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get loaded contracts
   */
  getLoadedContracts() {
    return Array.from(this.contracts.keys());
  }

  /**
   * Get configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get max block range for queries
   */
  getMaxBlockRange() {
    return this.config.indexer?.maxBlockRange || 2000;
  }

  /**
   * Get factory system info
   */
  async getFactorySystemInfo() {
    try {
      const factory = this.getContract('EcosystemStakingFactory');
      if (!factory) {
        logger.warn('⚠️ Factory contract not available');
        return null;
      }

      const [admin, orderToken, burnAmount, poolCount, deadAddress] = await Promise.all([
        factory.admin(),
        factory.orderToken(),
        factory.burnAmount(),
        factory.poolCount(),
        factory.deadAddress()
      ]);

      return {
        admin: `${admin.slice(0, 6)}...${admin.slice(-4)}`,
        orderToken: `${orderToken.slice(0, 6)}...${orderToken.slice(-4)}`,
        burnAmount: ethers.formatEther(burnAmount),
        poolCount: Number(poolCount),
        deadAddress: `${deadAddress.slice(0, 6)}...${deadAddress.slice(-4)}`
      };
    } catch (error) {
      logger.error('❌ Error getting factory system info:', error);
      return null;
    }
  }

  /**
   * Get all pools from factory
   */
  async getAllPools() {
    try {
      const factory = this.getContract('EcosystemStakingFactory');
      if (!factory) {
        logger.warn('⚠️ Factory contract not available');
        return [];
      }

      // Try different methods based on ABI
      try {
        // First try with poolCount and allPools mapping
        const poolCount = await factory.poolCount();
        const pools = [];
        
        for (let i = 0; i < Number(poolCount); i++) {
          try {
            const poolAddress = await factory.allPools(i);
            if (poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000') {
              pools.push(poolAddress);
            }
          } catch (err) {
            logger.warn(`⚠️ Could not get pool ${i}:`, err.message);
          }
        }
        
        return pools;
      } catch (err) {
        logger.warn('⚠️ Could not use allPools mapping, trying alternative method');
        return [];
      }
    } catch (error) {
      logger.error('❌ Error getting all pools:', error);
      return [];
    }
  }

  /**
   * Get comprehensive pool info from pool contract
   */
  async getPoolInfo(poolAddress) {
    try {
      const poolAbi = require('../abi/EcosystemStaking.json');
      const poolContract = new ethers.Contract(poolAddress, poolAbi, this.provider);
      
      // Get pool info using getPoolInfo method if available
      const poolInfo = await poolContract.getPoolInfo();
      
      return {
        stakingToken: poolInfo._stakingToken,
        rewardToken: poolInfo._rewardToken,
        totalStaked: poolInfo._totalStaked,
        rewardPerBlock: poolInfo._rewardPerBlock,
        startBlock: poolInfo._startBlock,
        endBlock: poolInfo._endBlock,
        lastRewardBlock: poolInfo._lastRewardBlock,
        creator: poolInfo._creator
      };
    } catch (error) {
      logger.debug(`Pool info error for ${poolAddress}:`, error.message);
      return null;
    }
  }

  /**
   * Get pool metadata from pool contract
   */
  async getPoolMetadata(poolAddress) {
    try {
      const poolAbi = require('../abi/EcosystemStaking.json');
      const poolContract = new ethers.Contract(poolAddress, poolAbi, this.provider);
      
      // Get pool metadata using getPoolMetadata method if available
      const metadata = await poolContract.getPoolMetadata();
      
      return {
        poolName: metadata.poolName,
        poolDescription: metadata.poolDescription,
        stakingSymbol: metadata.stakingSymbol,
        rewardSymbol: metadata.rewardSymbol,
        stakingLogo: metadata.stakingLogo,
        rewardLogo: metadata.rewardLogo
      };
    } catch (error) {
      logger.debug(`Pool metadata error for ${poolAddress}:`, error.message);
      return null;
    }
  }

  /**
   * Get ERC20 token information
   */
  async getTokenInfo(tokenAddress) {
    try {
      const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)"
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply()
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString()
      };
    } catch (error) {
      logger.debug(`Token info error for ${tokenAddress}:`, error.message);
      return null;
    }
  }

  /**
   * Get pool metadata from factory
   */
  async getFactoryPoolMetadata(poolAddress) {
    try {
      const factory = this.getContract('EcosystemStakingFactory');
      if (!factory) {
        logger.warn('⚠️ Factory contract not available');
        return null;
      }

      // Try to get pool metadata - this might not exist in all factory versions
      try {
        // If getPoolMetadata exists, use it
        if (factory.getPoolMetadata) {
          const metadata = await factory.getPoolMetadata(poolAddress);
          return metadata;
        }
        
        // Otherwise, try to get basic pool info
        if (factory.getPoolInfo) {
          const poolInfo = await factory.getPoolInfo(poolAddress);
          return poolInfo;
        }
        
        // If no specific getter, return null
        return null;
      } catch (err) {
        // This is expected for contracts without metadata functions
        logger.debug(`Pool metadata not available for ${poolAddress}: ${err.message}`);
        return null;
      }
    } catch (error) {
      logger.debug('Pool metadata error:', error.message);
      return null;
    }
  }

  /**
   * Get user info from pool
   */
  async getUserInfo(poolAddress, userAddress) {
    try {
      const poolAbi = require('../abi/EcosystemStaking.json');
      const poolContract = new ethers.Contract(poolAddress, poolAbi, this.provider);
      
      const userInfo = await poolContract.userInfo(userAddress);
      
      return {
        amount: ethers.formatEther(userInfo.amount),
        rewardDebt: ethers.formatEther(userInfo.rewardDebt),
        pendingReward: ethers.formatEther(await poolContract.pendingReward(userAddress))
      };
    } catch (error) {
      logger.debug('User info error:', error.message);
      return null;
    }
  }

  /**
   * Format address for display (0x1234...5678)
   */
  formatAddress(address) {
    if (!address) return '0x0000...0000';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get pool contract instance
   */
  getPoolContract(poolAddress) {
    try {
      const poolAbi = require('../abi/EcosystemStaking.json');
      return new ethers.Contract(poolAddress, poolAbi, this.provider);
    } catch (error) {
      logger.error('❌ Error creating pool contract:', error.message);
      return null;
    }
  }

  /**
   * Format amount for display
   */
  formatAmount(amount, decimals = 18) {
    try {
      return ethers.formatUnits(amount, decimals);
    } catch (error) {
      logger.debug('Amount format error:', error.message);
      return '0.0';
    }
  }
}

module.exports = { BlockchainManager };
