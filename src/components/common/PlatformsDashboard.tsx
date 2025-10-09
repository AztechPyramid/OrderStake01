import React, { useState } from 'react';
import { PlatformCard } from './PlatformCard';

const platforms = [
  {
    title: 'OrderStake Global',
    description: 'Global version with external wallet support (MetaMask, WalletConnect, Coinbase).',
    url: 'https://externalwallet-orderstake.netlify.app/',
    logo: 'https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg',
    category: 'Staking Platform',
    isNative: false // External link
  }
];

interface PlatformsDashboardProps {
  searchQuery?: string;
}

export const PlatformsDashboard = ({ searchQuery = '' }: PlatformsDashboardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter platforms based on search query
  const filteredPlatforms = platforms.filter(platform => 
    platform.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    platform.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    platform.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <>
      {/* Arena Ecosystem Card - Clickable */}
      <div className="space-y-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full text-center mb-8 cursor-pointer hover:scale-105 transition-transform duration-200 bg-gradient-to-br from-gray-800/40 via-gray-800/60 to-orange-900/20 border-2 border-orange-600/30 rounded-xl p-6 shadow-lg shadow-orange-600/10 hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">� Global Connection</h2>
          <p className="text-orange-200/80 mb-4">
            Connect to global staking platform with external wallet support
          </p>
          {searchQuery && (
            <p className="text-sm text-orange-400 mt-2">
              🌐 Showing {filteredPlatforms.length} platform(s) matching &quot;{searchQuery}&quot;
            </p>
          )}
          <div className="text-center text-orange-300/70 text-sm mt-4">
            Click to explore the full ecosystem →
          </div>
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[45] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-orange-900/20 border-2 border-orange-600/50 rounded-xl p-6 shadow-2xl max-w-6xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-center flex-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">� Global Connection</h2>
                <p className="text-orange-200/80">
                  Connect to global staking platform with external wallet support
                </p>
                {searchQuery && (
                  <p className="text-sm text-orange-400 mt-2">
                    🌐 Showing {filteredPlatforms.length} platform(s) matching &quot;{searchQuery}&quot;
                  </p>
                )}
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-orange-400 hover:text-white text-2xl font-bold bg-gray-700/50 rounded-full w-8 h-8 flex items-center justify-center ml-4"
              >
                ×
              </button>
            </div>

            {/* Platforms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlatforms.map((platform) => (
                <PlatformCard
                  key={platform.title}
                  title={platform.title}
                  description={platform.description}
                  url={platform.url}
                  logo={platform.logo}
                  category={platform.category}
                  isNative={platform.isNative}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
