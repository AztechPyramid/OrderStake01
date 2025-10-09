/**
 * GitHub Static Data Service
 * Fetches indexer data directly from GitHub repository
 */

// API configuration - Use Netlify directly
const NETLIFY_API_URL = `https://orderstake.netlify.app/api`;

export interface PoolData {
  address: string;
  poolData: {
    stakingToken: string;
    rewardToken: string;
    totalStaked: string;
    rewardPerBlock: string;
    startBlock: string;
    endBlock: string;
    lastRewardBlock: string;
    creator: string;
  };
  poolMetadata: {
    poolName: string;
    poolDescription: string;
    stakingSymbol: string;
    rewardSymbol: string;
    stakingLogo: string;
    rewardLogo: string;
  };
  poolStats: {
    blocksRemaining: string;
    isActive: boolean;
    hasStarted: boolean;
    hasEnded: boolean;
    remainingRewards: string;
  };
  tokenInfo: {
    stakingToken: any;
    rewardToken: any;
  };
  creatorProfile: {
    address: string;
    username: null;
    displayName: null;
    profileImage: null;
    arenaHandle: null;
  };
  lastUpdated: string;
}

class NetlifyDataService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number;

  constructor() {
    this.baseUrl = NETLIFY_API_URL; // Direct Netlify API only
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Fetch data from Netlify API with caching
   */
  private async fetchFromNetlify<T>(path: string): Promise<T> {
    const cacheKey = path;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/${path}`;
      console.log(`📡 Fetching from Netlify: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the data
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      console.log(`✅ Successfully fetched ${path} from Netlify`);
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch ${path} from Netlify:`, error);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.warn(`⚠️ Using expired cache for ${path}`);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Get all pools data
   */
  async getAllPools(): Promise<Record<string, PoolData>> {
    try {
      return await this.fetchFromNetlify<Record<string, PoolData>>('pools.json');
    } catch (error) {
      console.error('Error fetching pools data:', error);
      return {};
    }
  }

  /**
   * Get pools as array for frontend components
   */
  async getPoolsArray(): Promise<PoolData[]> {
    try {
      const pools = await this.getAllPools();
      return Object.values(pools);
    } catch (error) {
      console.error('Error getting pools array:', error);
      return [];
    }
  }

  /**
   * Get specific pool data
   */
  async getPool(address: string): Promise<PoolData | null> {
    try {
      const pools = await this.getAllPools();
      return pools[address] || null;
    } catch (error) {
      console.error(`Error fetching pool ${address}:`, error);
      return null;
    }
  }

  /**
   * Get staking events
   */
  async getStakingEvents(): Promise<any[]> {
    try {
      return await this.fetchFromNetlify<any[]>('staking.json');
    } catch (error) {
      console.error('Error fetching staking events:', error);
      return [];
    }
  }

  /**
   * Get latest events (last N events)
   */
  async getLatestEvents(limit: number = 10): Promise<any[]> {
    try {
      const events = await this.getStakingEvents();
      return events
        .sort((a, b) => b.blockNumber - a.blockNumber)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching latest events:', error);
      return [];
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string): Promise<any[]> {
    try {
      const events = await this.getStakingEvents();
      return events.filter(event => event.eventName === eventType);
    } catch (error) {
      console.error(`Error fetching ${eventType} events:`, error);
      return [];
    }
  }

  /**
   * Check if data is available (health check)
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.fetchFromNetlify('pools.json');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get last update timestamp
   */
  async getLastUpdate(): Promise<Date | null> {
    try {
      const pools = await this.getAllPools();
      const poolValues = Object.values(pools);
      
      if (poolValues.length === 0) return null;
      
      const lastUpdated = poolValues
        .map(pool => new Date(pool.lastUpdated))
        .sort((a, b) => b.getTime() - a.getTime())[0];
        
      return lastUpdated;
    } catch {
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Create singleton instance
export const netlifyDataService = new NetlifyDataService();

// Convenience functions for React hooks (keep same interface)
export const GitHubPoolAPI = {
  async getPoolsForEcosystem() {
    return netlifyDataService.getPoolsArray();
  },

  async getPoolData(address: string) {
    return netlifyDataService.getPool(address);
  },

  async getLatestActivity(limit?: number) {
    return netlifyDataService.getLatestEvents(limit);
  },

  async isDataAvailable() {
    return netlifyDataService.isAvailable();
  },

  async getLastDataUpdate() {
    return netlifyDataService.getLastUpdate();
  }
};

// Export for backward compatibility
export const githubDataService = netlifyDataService;
export default netlifyDataService;