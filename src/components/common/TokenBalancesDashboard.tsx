import { TokenBalanceCard } from '@/components/common/TokenBalanceCard';
import { useRemainingTokens } from '@/hooks/useRemainingTokens';

const tokens = [
  {
    symbol: 'ORDER' as const,
    name: 'Order Token',
    logo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg'
  },
  {
    symbol: 'WITCH' as const,
    name: 'Witch Token',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F2b4039e7-40aa-43f4-5328-be3b27fb90371746910733471.jpeg&w=96&q=75'
  },
  {
    symbol: 'KOKSAL' as const,
    name: 'Koksal Token',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2Fbfa8b7d1-a4d1-4fa1-e276-32e4a8505b1c1753997742607.jpeg&w=96&q=75'
  },
  {
    symbol: 'STANK' as const,
    name: 'Stank Token',
    logo: 'https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2Fe6746c46-5124-de74-f0e2-4ce94df1a3a71746580775916.jpeg&w=96&q=75'
  }
];

export const TokenBalancesDashboard = () => {
  const remainingTokens = useRemainingTokens();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tokens.map((token) => (
          <TokenBalanceCard
            key={token.symbol}
            tokenSymbol={token.symbol}
            tokenLogo={token.logo}
            tokenName={token.name}
            formatted={remainingTokens[token.symbol].formatted}
            isLoading={false}
          />
        ))}
      </div>
    </div>
  );
};
