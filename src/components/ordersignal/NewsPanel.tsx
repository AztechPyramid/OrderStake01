import React, { useEffect } from 'react';
import { useNews, NewsItem } from '@/hooks/ordersignal/useNews';

interface NewsPanelProps {
  tokenSymbol?: string;
}

export const NewsPanel: React.FC<NewsPanelProps> = ({ tokenSymbol }) => {
  const { news, loading, error, fetchNews } = useNews();

  useEffect(() => {
    fetchNews(tokenSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenSymbol]);

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-400 bg-green-500/10';
      case 'negative':
        return 'text-red-400 bg-red-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return '📈';
      case 'negative':
        return '📉';
      default:
        return '📰';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Latest Crypto News</h3>
          <p className="text-sm text-gray-400">Powered by CryptoCompare</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      )}

      {/* News List */}
      {!loading && !error && news.length > 0 && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-xl bg-gray-900/50 border border-gray-700/50 hover:border-blue-500/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                </div>
                <span className={`text-lg ${getSentimentIcon(item.sentiment)}`}>
                  {getSentimentIcon(item.sentiment)}
                </span>
              </div>
              
              <p className="text-gray-400 text-xs line-clamp-2 mb-3">
                {item.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{item.source}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(item.publishedAt)}</span>
                </div>
                
                {item.sentiment && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getSentimentColor(item.sentiment)}`}>
                    {item.sentiment}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && news.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No recent news available</p>
        </div>
      )}
    </div>
  );
};
