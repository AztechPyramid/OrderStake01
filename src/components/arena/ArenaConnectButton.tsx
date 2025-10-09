import { useArenaSDK } from '@/hooks/useArenaSDK';
import { useEffect } from 'react';

export const ArenaConnectButton = () => {
  const { isInArena, isConnected: arenaConnected, address: arenaAddress, profile, sdk, isLoading } = useArenaSDK();

  // Debug Arena connection status
  useEffect(() => {
    console.log('🏛️ ARENA CONNECT DEBUG:', {
      isInArena,
      arenaConnected,
      arenaAddress,
      profile: profile?.userHandle,
      isLoading,
      sdkExists: !!sdk
    });
  }, [isInArena, arenaConnected, arenaAddress, profile, isLoading, sdk]);

  // If we're not in Arena, show Arena promotion
  if (!isInArena) {
    return (
      <div className="flex flex-col items-center space-y-1 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-lg px-2 py-2 sm:px-3 sm:py-2">
        <span className="text-orange-200 text-xs sm:text-sm font-medium text-center">
          🏛️ <span className="hidden sm:inline">Arena Experience Required</span>
          <span className="sm:hidden">Arena</span>
        </span>
        <a 
          href="https://arena.social"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs font-semibold hover:scale-105 transition-transform"
        >
          <span className="hidden sm:inline">Open in Arena →</span>
          <span className="sm:hidden">Open →</span>
        </a>
      </div>
    );
  }

  // Arena environment - connected state
  if (arenaConnected && arenaAddress) {
    return (
      <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-lg px-3 py-2 min-w-0 flex-1 max-w-xs">
        {profile?.userImageUrl && (
          <img 
            src={profile.userImageUrl} 
            alt="Arena Profile"
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-orange-400 flex-shrink-0"
          />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center space-x-1 min-w-0">
            <img 
              src="https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F095b3954-73e0-79e6-8b8f-14548c3c622e1749436384057.jpeg&w=96&q=75" 
              alt="Arena Logo" 
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-orange-400 bg-white flex-shrink-0"
            />
            <span className="text-orange-400 text-xs font-bold flex-shrink-0">
              <span className="hidden sm:inline">Arena Connect</span>
              <span className="sm:hidden">Arena</span>
            </span>
            {profile?.userHandle && (
              <span className="text-white text-xs sm:text-sm font-medium truncate min-w-0">@{profile.userHandle}</span>
            )}
          </div>
          <span className="text-orange-200/80 text-xs font-mono">
            {arenaAddress.slice(0, 6)}...{arenaAddress.slice(-4)}
          </span>
        </div>
      </div>
    );
  }

  // Arena environment - loading/connecting state (automatic connection happening)
  return (
    <div className="flex flex-col space-y-1 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-lg px-2 py-2 sm:px-3 sm:py-2">
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="w-4 h-4 sm:w-5 sm:h-5 border border-orange-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-orange-200 text-xs sm:text-sm">
          <span className="hidden sm:inline">{isLoading ? '🏛️ Connecting Arena wallet...' : '🏛️ Arena connection ready...'}</span>
          <span className="sm:hidden">🏛️ Connecting...</span>
        </span>
      </div>
      <div className="text-xs text-orange-300/60 font-mono hidden sm:block">
        Arena: {String(isInArena)} | Connected: {String(arenaConnected)} | Loading: {String(isLoading)}
        {arenaAddress && <div>Address: {arenaAddress.slice(0, 8)}...</div>}
        {profile?.userHandle && <div>Profile: {profile.userHandle}</div>}
      </div>
    </div>
  );
};
