import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { TransactionProvider } from '@/contexts/TransactionContext'

const queryClient = new QueryClient()

// Arena Environment Detection
const useArenaEnvironment = () => {
  const [isInArena, setIsInArena] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isIframe = window !== window.top;
    const referrer = document.referrer;
    const isFromArena = referrer.includes('arena.social');
    const arenaDetected = isIframe && isFromArena;
    
    setIsInArena(arenaDetected);
    
    if (arenaDetected) {
      console.log('🏛️ Arena environment detected - Arena SDK mode');
      
      // Clear wallet-related localStorage for clean Arena operation
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('walletconnect') || 
        key.includes('coinbase') ||
        key.includes('wagmi') ||
        key.includes('rainbowkit') ||
        key.includes('wc@2') ||
        key.includes('reown') ||
        key.includes('connector')
      );
      
      keysToRemove.forEach(key => {
        console.log(`🗑️ CLEARING: ${key}`);
        localStorage.removeItem(key);
      });
      
      // Mark as Arena mode
      (window as typeof window & { __arenaMode?: boolean }).__arenaMode = true;
    }
    
    // Load CoinGecko widget script globally
    const loadCoinGeckoScript = () => {
      const existingScript = document.querySelector('script[src="https://widgets.coingecko.com/gecko-coin-price-chart-widget.js"]');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://widgets.coingecko.com/gecko-coin-price-chart-widget.js';
        script.async = true;
        script.onload = () => {
          console.log('✅ CoinGecko global script loaded');
        };
        script.onerror = () => {
          console.error('❌ Failed to load CoinGecko global script');
        };
        document.head.appendChild(script);

        // Load CoinGecko Marquee Widget Script
        const marqueeScript = document.createElement('script');
        marqueeScript.src = 'https://widgets.coingecko.com/gecko-coin-price-marquee-widget.js';
        marqueeScript.async = true;
        marqueeScript.onload = () => {
          console.log('✅ CoinGecko marquee script loaded');
        };
        marqueeScript.onerror = () => {
          console.error('❌ Failed to load CoinGecko marquee script');
        };
        document.head.appendChild(marqueeScript);
      }
    };
    
    loadCoinGeckoScript();
    setIsLoading(false);
  }, []);

  return { isInArena, isLoading };
};

export default function App({ Component, pageProps }: AppProps) {
  const { isInArena, isLoading } = useArenaEnvironment();

  // Show loading while detecting environment
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      }}>
        <div style={{ 
          color: '#ffd700', 
          fontSize: '18px',
          textAlign: 'center'
        }}>
          <div>🏛️ OrderStake Loading...</div>
          <div style={{ fontSize: '14px', marginTop: '10px', opacity: 0.7 }}>
            {isInArena ? 'Arena Mode' : 'Standalone Mode'}
          </div>
        </div>
      </div>
    );
  }

  // Pure Arena/Standalone mode - NO RainbowKit complexity
  return (
    <QueryClientProvider client={queryClient}>
      <TransactionProvider>
        <div className={isInArena ? "arena-mode" : "standalone-mode"}>
          {/* Environment Indicator - Hidden as requested */}
          {/* <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: isInArena 
              ? 'linear-gradient(45deg, #ff4444, #ff6b35)' 
              : 'linear-gradient(45deg, #4444ff, #35a0ff)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
            zIndex: 10000,
            border: '1px solid #ffaa00',
            boxShadow: '0 2px 8px rgba(255, 68, 68, 0.3)'
          }}>
            {isInArena ? '🏛️ ARENA MODE' : '🌐 STANDALONE MODE'}
          </div> */}
          <Component {...pageProps} />
        </div>
      </TransactionProvider>
    </QueryClientProvider>
  )
}
