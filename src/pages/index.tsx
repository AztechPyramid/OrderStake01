import { useArenaEnvironment } from '@/hooks/useArenaEnvironment';
import { NormalHomePage, ArenaHomePage } from '@/components/HomePage';

export default function Home() {
  const { isInArena, isLoading } = useArenaEnvironment();

  // Loading state while detecting environment
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-4">
            🏛️ OrderStake
          </div>
          <div className="text-gray-400">
            Detecting environment...
          </div>
        </div>
      </div>
    );
  }

  // Conditional rendering based on environment - CLEAN SEPARATION per ReadmeSDK.md
  return isInArena ? <ArenaHomePage /> : <NormalHomePage />;
}
