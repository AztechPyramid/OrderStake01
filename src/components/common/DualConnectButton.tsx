import { useWallet } from '@/hooks/useWallet';

export const DualConnectButton = () => {
  const { isConnected, address } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-orange-400">🏛️ Arena</span>
        <span className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-2 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border-2 border-orange-500/50 rounded-lg px-4 py-3">
      <span className="text-orange-200 text-sm font-medium">
        🏛️ Arena Experience Required
      </span>
      <a 
        href="https://arena.social"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-transform"
      >
        Open in Arena →
      </a>
    </div>
  );
};
