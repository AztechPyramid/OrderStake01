import { useArenaConnect } from '@/hooks/useArenaConnect';

export const ArenaConnectButton = () => {
  const { connect, disconnect, isConnected, address } = useArenaConnect();

  return (
    <button
      onClick={isConnected ? disconnect : connect}
      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
    >
      🏟️ {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Arena Connect'}
    </button>
  );
};
