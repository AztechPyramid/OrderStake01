interface TokenPrice {
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
}

interface DexScreenerResponse {
  pair: {
    priceUsd: string;
    priceChange: {
      h24: number;
    };
    volume: {
      h24: number;
    };
    fdv: number;
  };
}

class PriceService {
  private cache = new Map<string, { data: TokenPrice; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute cache
  
  // ORDER token pair address from DexScreener (Avalanche)
  private readonly ORDER_PAIR_ADDRESS = '0x5147fff4794fd96c1b0e64dcca921ca0ee1cda8d';
  
  async getOrderPrice(): Promise<TokenPrice> {
    const cacheKey = 'ORDER_PRICE';
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    try {
      console.log('🔍 Fetching ORDER price from DexScreener...');
      
      // DexScreener API for ORDER pair on Avalanche  
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/avalanche/${this.ORDER_PAIR_ADDRESS}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }
      
      const data: DexScreenerResponse = await response.json();
      
      if (!data.pair) {
        throw new Error('No trading pair data found for ORDER token');
      }
      
      // Use the pair data directly
      const pair = data.pair;
      
      const tokenPrice: TokenPrice = {
        price: parseFloat(pair.priceUsd) || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        volume24h: pair.volume?.h24 || 0,
        marketCap: pair.fdv || 0,
      };
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: tokenPrice,
        timestamp: Date.now(),
      });
      
      console.log('💰 ORDER Price Data:', tokenPrice);
      
      return tokenPrice;
      
    } catch (error) {
      console.error('❌ Error fetching ORDER price:', error);
      
      // Return cached data if available, otherwise return zero values
      if (cached) {
        console.log('📦 Using cached ORDER price data');
        return cached.data;
      }
      
      return {
        price: 0,
        priceChange24h: 0,
        volume24h: 0,
        marketCap: 0,
      };
    }
  }
  
  // Calculate TVL in USD
  calculateTvlUsd(orderAmount: number, orderPrice: number): number {
    return orderAmount * orderPrice;
  }
  
  // Format price for display
  formatPrice(price: number): string {
    if (price === 0) return '$0.00';
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  }
  
  // Format TVL for display
  formatTvl(tvlUsd: number): string {
    if (tvlUsd === 0) return '$0';
    if (tvlUsd < 1000) return `$${tvlUsd.toFixed(2)}`;
    if (tvlUsd < 1000000) return `$${(tvlUsd / 1000).toFixed(1)}K`;
    return `$${(tvlUsd / 1000000).toFixed(1)}M`;
  }
  
  // Format percentage change
  formatPriceChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }
}

export const priceService = new PriceService();
export type { TokenPrice };
