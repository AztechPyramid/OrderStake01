import { useRouter } from 'next/router';
import TetrisGame from '@/components/tetris/TetrisGame';
import { useWallet } from '@/hooks/useWallet';
import Head from 'next/head';

export default function TetrisPage() {
  const router = useRouter();
  const { isConnected } = useWallet();

  return (
    <>
      <Head>
        <style jsx global>{`
          @keyframes tetris-piece-glow {
            from {
              filter: brightness(1.1) contrast(1.1) drop-shadow(0 0 4px rgba(251, 146, 60, 0.5));
            }
            to {
              filter: brightness(1.3) contrast(1.2) drop-shadow(0 0 8px rgba(251, 146, 60, 0.8));
            }
          }
          
          @keyframes tetris-fire-dance {
            0%, 100% {
              transform: translateY(0px) scale(1);
              opacity: 0.6;
            }
            25% {
              transform: translateY(-2px) scale(1.1);
              opacity: 0.8;
            }
            50% {
              transform: translateY(-1px) scale(0.9);
              opacity: 0.7;
            }
            75% {
              transform: translateY(-3px) scale(1.05);
              opacity: 0.9;
            }
          }
          
          @keyframes tetris-board-pulse {
            0%, 100% {
              box-shadow: 0 0 20px rgba(251, 146, 60, 0.3);
            }
            50% {
              box-shadow: 0 0 30px rgba(251, 146, 60, 0.5);
            }
          }
          
          .tetris-fire-particle {
            animation: tetris-fire-dance 2s ease-in-out infinite;
          }
          
          .tetris-board-glow {
            animation: tetris-board-pulse 3s ease-in-out infinite;
          }
        `}</style>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-4">
            🎮 ORDER Tetris
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Play Tetris and earn ORDER tokens! 50% of entry fees are burned, 50% go to the reward pool. 
            Higher levels earn bigger rewards from the pool.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
          >
            ← Back to Home
          </button>
        </div>

        {/* Game */}
        <div className="max-w-6xl mx-auto">
          <TetrisGame />
        </div>

      </div>
    </div>
    </>
  );
}