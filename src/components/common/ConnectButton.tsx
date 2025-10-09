import { useArenaSDK } from '@/hooks/useArenaSDK';

export const ConnectButton = () => {
  const { isConnected, address } = useArenaSDK();

  return (
    <div className="px-4 py-2 bg-primary text-white rounded-lg">
      {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Not Connected'}
    </div>
  );
};
