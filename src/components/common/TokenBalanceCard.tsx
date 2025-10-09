interface TokenBalanceCardProps {
  tokenSymbol: 'ORDER' | 'WITCH' | 'KOKSAL' | 'STANK';
  tokenLogo: string;
  tokenName: string;
  formatted: string;
  isLoading?: boolean;
}

export const TokenBalanceCard = ({ 
  tokenSymbol, 
  tokenLogo, 
  tokenName, 
  formatted, 
  isLoading = false 
}: TokenBalanceCardProps) => {

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-primary/50 transition-all duration-300">
      <div className="flex items-center space-x-3">
        <img 
          src={tokenLogo} 
          alt={tokenSymbol}
          className="w-12 h-12 rounded-full border-2 border-gray-700"
        />
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            {tokenSymbol === 'ORDER' && (
              <img src="/order-logo.jpg" alt="ORDER" className="w-5 h-5 rounded-full" />
            )}
            <span>{tokenSymbol}</span>
          </h3>
          <p className="text-gray-400 text-sm">{tokenName}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Remaining</p>
          {isLoading ? (
            <div className="animate-pulse bg-gray-700 h-6 w-20 rounded"></div>
          ) : (
            <p className="text-primary font-bold text-xl">{formatted}</p>
          )}
        </div>
      </div>
    </div>
  );
};
