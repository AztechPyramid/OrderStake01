import { useRouter } from 'next/router';
import { OrderSignalPage } from '@/components/ordersignal/OrderSignalPage';
import Head from 'next/head';

export default function OrderSignalPageRoute() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>OrderPremium+ - Advanced Trading Signals | ORDER Platform</title>
        <meta 
          name="description" 
          content="Premium trading signals for Avalanche pairs. 20+ technical indicators, multi-timeframe analysis, and real-time buy/sell signals." 
        />
        <meta property="og:title" content="OrderPremium+ - Advanced Trading Signals" />
        <meta property="og:description" content="Professional trading signals with 20+ technical indicators" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      
      <OrderSignalPage />
    </>
  );
}
