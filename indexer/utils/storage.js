const fs = require('fs').promises;
const path = require('path');

/**
 * Restart-safe JSON file storage utility
 * Prevents duplicate events and handles file corruption
 */
class JSONStorage {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.cache = new Map(); // In-memory cache for fast lookups
  }

  /**
   * Initialize storage directory
   */
  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log(`📁 Storage directory initialized: ${this.dataDir}`);
    } catch (error) {
      console.error('❌ Failed to initialize storage directory:', error);
      throw error;
    }
  }

  /**
   * Get file path for event type
   */
  getFilePath(eventType) {
    return path.join(this.dataDir, `${eventType}.json`);
  }

  /**
   * Load existing events from file
   */
  async loadEvents(eventType) {
    const filePath = this.getFilePath(eventType);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const events = JSON.parse(data);
      
      // Validate structure
      if (!Array.isArray(events)) {
        console.warn(`⚠️  Invalid format in ${eventType}.json, resetting to empty array`);
        return [];
      }

      // Build cache for duplicate detection
      const eventCache = new Set();
      const validEvents = events.filter(event => {
        if (!event.txHash || !event.eventName) {
          console.warn(`⚠️  Invalid event found in ${eventType}.json:`, event);
          return false;
        }
        
        const eventKey = `${event.txHash}-${event.eventName}-${event.logIndex || 0}`;
        if (eventCache.has(eventKey)) {
          console.warn(`⚠️  Duplicate event found in ${eventType}.json:`, eventKey);
          return false;
        }
        
        eventCache.add(eventKey);
        return true;
      });

      this.cache.set(eventType, eventCache);
      console.log(`📖 Loaded ${validEvents.length} events from ${eventType}.json`);
      return validEvents;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📄 Creating new file: ${eventType}.json`);
        this.cache.set(eventType, new Set());
        return [];
      }
      
      console.error(`❌ Error loading ${eventType}.json:`, error);
      // Backup corrupted file
      await this.backupCorruptedFile(filePath);
      this.cache.set(eventType, new Set());
      return [];
    }
  }

  /**
   * Save events to file (atomic write)
   */
  async saveEvents(eventType, events) {
    const filePath = this.getFilePath(eventType);
    const tempPath = `${filePath}.tmp`;
    
    try {
      // Sort events by block number and log index for consistency
      const sortedEvents = events.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber;
        }
        return (a.logIndex || 0) - (b.logIndex || 0);
      });

      const data = JSON.stringify(sortedEvents, null, 2);
      
      // Atomic write: write to temp file first, then rename
      await fs.writeFile(tempPath, data, 'utf8');
      await fs.rename(tempPath, filePath);
      
      console.log(`💾 Saved ${events.length} events to ${eventType}.json`);
      
    } catch (error) {
      console.error(`❌ Error saving ${eventType}.json:`, error);
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw error;
    }
  }

  /**
   * Add new event (with duplicate protection)
   */
  async addEvent(eventType, eventData) {
    const eventKey = `${eventData.txHash}-${eventData.eventName}-${eventData.logIndex || 0}`;
    
    // Check cache for duplicates
    const eventCache = this.cache.get(eventType) || new Set();
    if (eventCache.has(eventKey)) {
      console.log(`⚡ Skipping duplicate event: ${eventKey}`);
      return false;
    }

    // Load existing events
    const events = await this.loadEvents(eventType);
    
    // Add new event
    events.push({
      ...eventData,
      timestamp: new Date().toISOString(),
      indexedAt: Date.now()
    });

    // Update cache
    eventCache.add(eventKey);
    this.cache.set(eventType, eventCache);

    // Save to file
    await this.saveEvents(eventType, events);
    
    console.log(`✅ Added new ${eventData.eventName} event: ${eventData.txHash}`);
    return true;
  }

  /**
   * Get events with optional filtering
   */
  async getEvents(eventType, filter = {}) {
    const events = await this.loadEvents(eventType);
    
    if (!filter || Object.keys(filter).length === 0) {
      return events;
    }

    return events.filter(event => {
      for (const [key, value] of Object.entries(filter)) {
        if (event[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Set latest block number (for incremental indexing)
   */
  async setLatestBlock(blockNumber, eventType = 'latest') {
    try {
      const latestBlockPath = path.join(this.dataDir, 'latest-block.json');
      let latestBlocks = {};
      
      // Load existing latest blocks
      try {
        const data = await fs.readFile(latestBlockPath, 'utf8');
        latestBlocks = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is corrupted, start fresh
        latestBlocks = {};
      }
      
      // Update the block number for this event type
      latestBlocks[eventType] = blockNumber;
      
      // Save back to file
      await fs.writeFile(latestBlockPath, JSON.stringify(latestBlocks, null, 2));
      
      console.log(`💾 Saved latest block ${blockNumber} for ${eventType}`);
    } catch (error) {
      console.error(`❌ Error saving latest block:`, error);
    }
  }

  /**
   * Get latest block number from storage (for incremental indexing)
   */
  async getLatestBlock(eventType = 'latest') {
    try {
      const latestBlockPath = path.join(this.dataDir, 'latest-block.json');
      const data = await fs.readFile(latestBlockPath, 'utf8');
      const latestBlocks = JSON.parse(data);
      return latestBlocks[eventType] || null;
    } catch (error) {
      // File doesn't exist or is corrupted, return null to trigger full index
      return null;
    }
  }

  /**
   * Backup corrupted file
   */
  async backupCorruptedFile(filePath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.corrupted.${timestamp}`;
      await fs.copyFile(filePath, backupPath);
      console.log(`🔄 Backed up corrupted file to: ${backupPath}`);
    } catch (error) {
      console.error('❌ Failed to backup corrupted file:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const stats = {};
    
    try {
      const files = await fs.readdir(this.dataDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const eventType = file.replace('.json', '');
          const events = await this.loadEvents(eventType);
          const filePath = this.getFilePath(eventType);
          const fileStats = await fs.stat(filePath);
          
          stats[eventType] = {
            eventCount: events.length,
            fileSize: fileStats.size,
            lastModified: fileStats.mtime,
            latestBlock: await this.getLatestBlock(eventType)
          };
        }
      }
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
    }

    return stats;
  }

  /**
   * Save structured pool data for frontend
   */
  async savePoolData(poolAddress, poolData) {
    const poolsFilePath = path.join(this.dataDir, 'pools.json');
    
    try {
      // Load existing pools data
      let poolsData = {};
      try {
        const data = await fs.readFile(poolsFilePath, 'utf8');
        poolsData = JSON.parse(data);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn('⚠️  Error loading pools.json, starting fresh:', error.message);
        }
      }

      // Update pool data
      poolsData[poolAddress] = {
        ...poolData,
        lastUpdated: new Date().toISOString(),
        updatedAt: Date.now()
      };

      // Save atomically
      const tempPath = `${poolsFilePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(poolsData, null, 2), 'utf8');
      await fs.rename(tempPath, poolsFilePath);
      
      console.log(`💾 Updated pool data for ${poolAddress}`);
      
    } catch (error) {
      console.error(`❌ Error saving pool data for ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get all pools data for frontend
   */
  async getAllPoolsData() {
    const poolsFilePath = path.join(this.dataDir, 'pools.json');
    
    try {
      const data = await fs.readFile(poolsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }
      console.error('❌ Error loading pools data:', error);
      return {};
    }
  }

  /**
   * Get single pool data for frontend
   */
  async getPoolData(poolAddress) {
    const allPools = await this.getAllPoolsData();
    return allPools[poolAddress] || null;
  }

  /**
   * Create frontend-compatible pool structure from event data
   */
  createFrontendPoolStructure(eventData) {
    const { poolInfo, poolMetadata, stakingTokenInfo, rewardTokenInfo } = eventData;
    
    if (!poolInfo) {
      return null;
    }

    // Pool Data (matching StakingPoolData interface)
    const poolData = {
      stakingToken: poolInfo.stakingToken,
      rewardToken: poolInfo.rewardToken,
      totalStaked: poolInfo.totalStaked,
      rewardPerBlock: poolInfo.rewardPerBlock,
      startBlock: poolInfo.startBlock,
      endBlock: poolInfo.endBlock,
      lastRewardBlock: poolInfo.lastRewardBlock,
      creator: poolInfo.creator
    };

    // Pool Metadata (matching StakingPoolMetadata interface)
    const metadata = poolMetadata ? {
      poolName: poolMetadata.poolName || '',
      poolDescription: poolMetadata.poolDescription || '',
      stakingSymbol: poolMetadata.stakingSymbol || '',
      rewardSymbol: poolMetadata.rewardSymbol || '',
      stakingLogo: poolMetadata.stakingLogo || '',
      rewardLogo: poolMetadata.rewardLogo || ''
    } : null;

    // Pool Stats (without TVL/APY as requested)
    const currentBlock = Math.floor(Date.now() / 2000); // Approximate current block
    const startBlock = BigInt(poolInfo.startBlock);
    const endBlock = BigInt(poolInfo.endBlock);
    const currentBlockBigInt = BigInt(currentBlock);
    
    const hasStarted = currentBlockBigInt >= startBlock;
    const hasEnded = currentBlockBigInt > endBlock;
    const isActive = hasStarted && !hasEnded;
    const blocksRemaining = hasEnded ? 0n : endBlock - currentBlockBigInt;

    const poolStats = {
      blocksRemaining: blocksRemaining.toString(),
      isActive,
      hasStarted,
      hasEnded,
      remainingRewards: '0' // Would need to be calculated from contract
    };

    // Token Information
    const tokenInfo = {
      stakingToken: stakingTokenInfo,
      rewardToken: rewardTokenInfo
    };

    // Creator Profile (simplified - just address)
    const creatorProfile = {
      address: poolInfo.creator,
      username: null, // Not fetching from Arena API as requested
      displayName: null,
      profileImage: null,
      arenaHandle: null
    };

    return {
      address: eventData.poolAddress,
      poolData,
      poolMetadata: metadata,
      poolStats,
      tokenInfo,
      creatorProfile,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAll() {
    try {
      const files = await fs.readdir(this.dataDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.dataDir, file));
        }
      }
      
      this.cache.clear();
      console.log('🗑️  Cleared all event data');
      
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
  }
}

module.exports = JSONStorage;