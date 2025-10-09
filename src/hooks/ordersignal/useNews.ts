import { useState, useCallback } from 'react';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export const useNews = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (tokenSymbol?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Using CryptoCompare News API as it's completely free
      const response = await fetch(
        `https://min-api.cryptocompare.com/data/v2/news/?lang=EN`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const data = await response.json();

      // Check different possible response formats
      if (data && data.Data && Array.isArray(data.Data)) {
        const formattedNews: NewsItem[] = data.Data.slice(0, 10).map((item: any) => ({
          id: item.id?.toString() || Math.random().toString(),
          title: item.title || 'No title',
          description: (item.body || '').substring(0, 150) + '...',
          url: item.url || item.guid || '#',
          source: item.source_info?.name || item.source || 'Unknown',
          publishedAt: item.published_on 
            ? new Date(item.published_on * 1000).toISOString() 
            : new Date().toISOString(),
          sentiment: 'neutral'
        }));

        if (formattedNews.length > 0) {
          setNews(formattedNews);
        } else {
          throw new Error('No news articles found');
        }
      } else {
        // If no data, don't throw error, just set empty
        console.warn('News API response format unexpected:', data);
        setNews([]);
      }
    } catch (err) {
      console.error('News fetch error:', err);
      // Don't show error to user, just log it
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    news,
    loading,
    error,
    fetchNews
  };
};
