import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, ExternalLink, User } from 'lucide-react';
import { EcosystemStakingCardSimplified } from './EcosystemStakingCardSimplified';

interface VerifiedFactoryCardProps {
  poolAddress: string;
  creator: {
    username: string;
    profileImage: string;
    arenaHandle: string;
  };
  tokens: {
    staking: {
      logo: string;
      communityUrl: string;
    };
    reward: {
      logo: string;
      communityUrl: string;
    };
  };
}

export const VerifiedFactoryCard: React.FC<VerifiedFactoryCardProps> = ({
  poolAddress,
  creator,
  tokens
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative border-2 border-blue-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
      {/* Verified Badge */}
      <div className="absolute -top-2 -right-2 z-10 bg-blue-500 text-white rounded-full p-2 shadow-lg">
        <CheckCircle className="w-4 h-4" />
      </div>

      {/* Collapsible Header */}
      <div 
        className="p-4 border-b border-blue-500/20 cursor-pointer hover:bg-blue-500/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Staking and Reward Token Logos */}
            <div className="flex items-center -space-x-2">
              <img 
                src={tokens.staking.logo} 
                alt="Staking Token" 
                className="w-8 h-8 rounded-full border-2 border-blue-400/50 bg-white"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/order-logo.jpg';
                }}
              />
              <img 
                src={tokens.reward.logo} 
                alt="Reward Token" 
                className="w-8 h-8 rounded-full border-2 border-blue-400/50 bg-white"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/order-logo.jpg';
                }}
              />
            </div>
            <div>
              <h3 className="font-bold text-blue-400">AYNE / ORDER Pool</h3>
              <p className="text-sm text-text-secondary">Community Created</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-blue-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-400" />
          )}
        </div>
      </div>

      {/* Expanded Content - Only Staking Card */}
      {isExpanded && (
        <div className="p-4">
          <div className="bg-blue-500/5 rounded-lg p-2">
            <EcosystemStakingCardSimplified poolAddress={poolAddress} />
          </div>
          
          {/* Click to collapse */}
          <div 
            className="text-center py-2 mt-2 cursor-pointer hover:bg-blue-500/5 rounded-lg transition-colors"
            onClick={() => setIsExpanded(false)}
          >
            <p className="text-sm text-text-secondary">Click to collapse</p>
          </div>
        </div>
      )}

      {/* Collapsed Preview - Show Creator and Token Info */}
      {!isExpanded && (
        <div className="p-4 space-y-4">
          {/* Creator Info */}
          <div className="bg-blue-500/5 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-4 h-4 text-blue-400" />
              <h4 className="font-medium text-blue-400 text-sm">Pool Creator</h4>
            </div>
            <div className="flex items-center gap-3">
              <img 
                src={creator.profileImage} 
                alt={creator.username}
                className="w-8 h-8 rounded-full border-2 border-blue-400/50"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/assets/arena-logo.png';
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary text-sm">{creator.username}</span>
                  <a 
                    href={`https://arena.social/profile/${creator.arenaHandle}`}
                    target="_top"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-text-secondary">@{creator.arenaHandle}</p>
              </div>
            </div>
          </div>

          {/* Token Info */}
          <div className="bg-blue-500/5 rounded-lg p-3">
            <h4 className="font-medium text-blue-400 mb-3 flex items-center gap-2 text-sm">
              <span>🪙</span>
              Token Information
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Staking Token */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary">Staking Token</p>
                <div className="flex items-center gap-2">
                  <img 
                    src={tokens.staking.logo} 
                    alt="Staking Token"
                    className="w-5 h-5 rounded-full border border-blue-400/30"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/order-logo.jpg';
                    }}
                  />
                  <a 
                    href={tokens.staking.communityUrl}
                    target="_top"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors text-xs flex items-center gap-1"
                  >
                    Community <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Reward Token */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary">Reward Token</p>
                <div className="flex items-center gap-2">
                  <img 
                    src={tokens.reward.logo} 
                    alt="Reward Token"
                    className="w-5 h-5 rounded-full border border-blue-400/30"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/order-logo.jpg';
                    }}
                  />
                  <a 
                    href={tokens.reward.communityUrl}
                    target="_top"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors text-xs flex items-center gap-1"
                  >
                    Community <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Click to expand */}
          <div 
            className="text-center py-2 cursor-pointer hover:bg-blue-500/5 rounded-lg transition-colors"
            onClick={() => setIsExpanded(true)}
          >
            <p className="text-sm text-text-secondary">Click to view staking interface</p>
          </div>
        </div>
      )}
    </div>
  );
};