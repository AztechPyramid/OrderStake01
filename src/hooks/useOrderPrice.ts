import { useState, useEffect } from 'react';
import { priceService, TokenPrice } from '@/services/priceService';

export const useOrderPrice = () => {
  const [priceData, setPriceData] = useState<TokenPrice>({
    price: 0,
    priceChange24h: 0,
    volume24h: 0,
    marketCap: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const price = await priceService.getOrderPrice();
        setPriceData(price);
        
      } catch (err) {
        console.error('Error fetching ORDER price:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch price');
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch price immediately
    fetchPrice();

    // Refresh price every 2 minutes
    const interval = setInterval(fetchPrice, 120000);

    return () => clearInterval(interval);
  }, []);

  return {
    priceData,
    isLoading,
    error,
    formatPrice: priceService.formatPrice,
    formatTvl: priceService.formatTvl,
    formatPriceChange: priceService.formatPriceChange,
    calculateTvlUsd: priceService.calculateTvlUsd,
  };
};
