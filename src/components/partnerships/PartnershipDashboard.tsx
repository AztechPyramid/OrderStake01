import React, { useState } from 'react';
import { useWitchOrderLP } from '@/hooks/useWitchOrderLP';
import { ExternalLink, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { partnerships } from './partnershipsData';

export const PartnershipDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openCards, setOpenCards] = useState<{[key:string]: boolean}>({});
  const { lpData, isLoading } = useWitchOrderLP();

  const handleToggle = (key: string) => {
    setOpenCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = partnerships.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent mb-2 flex items-center justify-center gap-2">
          {/* Partner logos for tab */}
          <img src="/assets/witch.png" alt="WITCH" className="w-7 h-7 rounded-full border-2 border-blue-400 bg-black" />
          <img src="/assets/stank.png" alt="STANK" className="w-7 h-7 rounded-full border-2 border-blue-400 bg-black" />
          <img src="/assets/koksal.png" alt="KOKSAL" className="w-7 h-7 rounded-full border-2 border-blue-400 bg-black" />
          <span>🤝 Partnership Ecosystem</span>
        </h1>
        <p className="text-gray-400 text-lg">
          Strategic partnerships and collaborations within the ORDER ecosystem
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search partnerships..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
        />
      </div>

      {/* Partnership Cards */}
      {filtered.map((p) => (
        <div key={p.key} className="mb-4">
          <button
            onClick={() => handleToggle(p.key)}
            className="w-full flex items-center justify-between px-6 py-4 bg-gray-900 border border-gray-700 rounded-xl shadow hover:bg-gray-800 transition-all"
          >
            <div className="flex items-center gap-4">
              <img src={p.logo} alt={p.token} className="w-10 h-10 rounded-full border-2 border-blue-500 bg-black" />
              <span className="text-lg font-bold text-white">{p.name}</span>
            </div>
            {openCards[p.key] ? <ChevronUp className="w-6 h-6 text-blue-400" /> : <ChevronDown className="w-6 h-6 text-blue-400" />}
          </button>
          {openCards[p.key] && (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-gray-600/50 rounded-b-xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <img src="/order-logo.jpg" alt="ORDER" className="w-10 h-10 rounded-full border-2 border-orange-500 shadow-lg" />
                  <span className="text-2xl font-bold text-gray-300">×</span>
                  <img src={p.logo} alt={p.token} className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-lg bg-black" />
                </div>
                <a href={p.external.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition-transform shadow-lg">
                  <span>{p.external.label}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="bg-black/20 rounded-xl p-6 mb-6 border border-gray-500/30">
                <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center space-x-2">
                  <span>🏗️</span>
                  <span>Partnership Overview</span>
                </h3>
                <p className="text-gray-300 leading-relaxed">{p.description}</p>
              </div>
              <div className="bg-black/20 rounded-xl p-6 border border-gray-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-300 flex items-center space-x-2">
                    <span>💧</span>
                    <span>{p.pool.label}</span>
                  </h3>
                  <span className="text-xs text-gray-400">LP Address: <span className="font-mono text-blue-300">{p.pool.lpAddress}</span></span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-4 border border-orange-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-orange-300 font-medium flex items-center space-x-2">
                          <img src="/order-logo.jpg" alt="ORDER" className="w-5 h-5 rounded-full" />
                          <span>{p.pool.orderToken} Reserve</span>
                        </span>
                      </div>
                      <div className="text-xl font-bold text-orange-200">
                        {p.key === 'witch' && !isLoading ? (
                          <>{lpData.orderReserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
                        ) : '...'}
                      </div>
                      <div className="text-sm text-orange-300/80">Token reserve amount</div>
                    </div>
                    <div className="bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-lg p-4 border border-gray-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 font-medium flex items-center space-x-2">
                          <img src={p.logo} alt={p.token} className="w-5 h-5 rounded-full border-2 border-blue-500 bg-black" />
                          <span>{p.pool.partnerToken} Reserve</span>
                        </span>
                      </div>
                      <div className="text-xl font-bold text-gray-200">
                        {p.key === 'witch' && !isLoading ? (
                          <>{lpData.witchReserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
                        ) : '...'}
                      </div>
                      <div className="text-sm text-gray-400">Token reserve amount</div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-6 border border-green-500/30 text-center">
                      <h4 className="text-green-300 font-medium mb-2 flex items-center justify-center space-x-2">
                        <span>💎</span>
                        <span>Total Pool Value</span>
                      </h4>
                      <div className="text-3xl font-bold text-green-200 mb-2">
                        {p.key === 'witch' && !isLoading ? (
                          <>${lpData.totalTVL.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
                        ) : '...'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
