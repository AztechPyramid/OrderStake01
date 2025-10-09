import React from 'react';
import { X, Crown, Flame, CheckCircle, Clock, Shield } from 'lucide-react';

interface AccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWhitelisted: boolean;
  hasMonthlyAccess: boolean;
  accessInfo: any;
  orderBalance: string;
  onPurchaseAccess: () => void;
  isPurchasing: boolean;
}

export const AccessModal: React.FC<AccessModalProps> = ({
  isOpen,
  onClose,
  isWhitelisted,
  hasMonthlyAccess,
  accessInfo,
  orderBalance,
  onPurchaseAccess,
  isPurchasing
}) => {
  if (!isOpen) return null;

  const formatRemainingTime = () => {
    if (!accessInfo) return '';
    const { daysLeft, hoursLeft, minutesLeft } = accessInfo;
    
    if (daysLeft! > 0) {
      return `${daysLeft}d ${hoursLeft}h remaining`;
    } else if (hoursLeft! > 0) {
      return `${hoursLeft}h ${minutesLeft}m remaining`;
    } else {
      return `${minutesLeft}m remaining`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gradient-surface border-2 border-accent-primary rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-yellow-500/30 p-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-2.5 rounded-full">
                <Crown className="w-7 h-7 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Get Access to Create Pools</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Whitelist Status */}
          {isWhitelisted && (
            <div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-400" />
                <div>
                  <h3 className="text-base font-bold text-green-400">✅ Whitelisted Account</h3>
                  <p className="text-xs text-text-secondary">You can create unlimited pools without any fees!</p>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Access Status */}
          {hasMonthlyAccess && accessInfo && (
            <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-base font-bold text-yellow-400">🎉 Panel Access Active</h3>
                  <p className="text-xs text-text-secondary">
                    {formatRemainingTime()} • You can create pools (1M ORDER per pool)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Access Explanation */}
          {!isWhitelisted && (
            <div className="space-y-4">
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <Flame className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-orange-400 mb-2">How It Works:</h3>
                    <div className="space-y-2 text-sm text-text-secondary">
                      <div className="flex items-start gap-2">
                        <span className="text-orange-400 font-bold">1.</span>
                        <span>Burn <span className="text-accent-primary font-bold">1,000,000 ORDER</span> to unlock the Create Pool panel for <span className="text-accent-primary font-bold">30 days</span></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-400 font-bold">2.</span>
                        <span>Each time you create a pool, burn <span className="text-accent-primary font-bold">1,000,000 ORDER</span> more</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <div className="bg-surface-secondary border border-border-primary rounded-lg p-5">
                <div className="bg-surface-primary rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-tertiary">Unlock for 30 days:</span>
                    <span className="text-lg font-bold text-accent-primary">1,000,000 ORDER</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">Your balance:</span>
                    <span className={`text-xs font-semibold ${
                      Number(orderBalance) >= 1000000 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {Number(orderBalance).toLocaleString()} ORDER
                    </span>
                  </div>
                </div>

                {hasMonthlyAccess ? (
                  <div className="text-center py-2.5 text-green-400 font-semibold text-sm">
                    ✅ Panel Access Already Active
                  </div>
                ) : (
                  <button
                    onClick={onPurchaseAccess}
                    disabled={isPurchasing || Number(orderBalance) < 1000000}
                    className={`w-full py-3.5 px-4 rounded-lg font-bold text-white transition-all ${
                      Number(orderBalance) >= 1000000
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:shadow-lg hover:scale-105'
                        : 'bg-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {isPurchasing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : Number(orderBalance) < 1000000 ? (
                      '❌ Insufficient ORDER Balance'
                    ) : (
                      <>
                        <Flame className="inline w-4 h-4 mr-2" />
                        Burn 1M ORDER to Unlock Panel
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Note */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  💡 <span className="font-semibold">Note:</span> After unlocking the panel, each pool creation will require an additional 1M ORDER burn.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-primary p-5 bg-surface-secondary rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-lg font-semibold text-text-secondary border border-border-primary hover:bg-surface-tertiary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
