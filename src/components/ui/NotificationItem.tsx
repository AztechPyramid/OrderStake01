import React from 'react';
import { TransactionNotification } from '@/hooks/useTransactionNotification';
import { ExternalLink, X, Check, Loader2, AlertCircle } from 'lucide-react';

interface NotificationItemProps {
  notification: TransactionNotification;
  onRemove: (id: string) => void;
  getExplorerUrl: (hash: string) => string;
  getTypeText: (type: string) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRemove,
  getExplorerUrl,
  getTypeText
}) => {
  const { status, type, amount, hash, error, poolName } = notification;

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'success':
        return 'border-green-500/20 bg-green-500/5';
      case 'error':
        return 'border-red-500/20 bg-red-500/5';
      default:
        return 'border-gray-500/20 bg-gray-500/5';
    }
  };

  const formatAmount = (amt: string | number | undefined) => {
    if (!amt) return '';
    const numAmount = typeof amt === 'string' ? parseFloat(amt) : amt;
    return ` ${numAmount.toLocaleString()} tokens`;
  };

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()} backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {getTypeText(type)}{formatAmount(amount)}
              </span>
              {poolName && (
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {poolName}
                </span>
              )}
            </div>
            
            {status === 'pending' && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Transaction pending...
              </p>
            )}
            
            {status === 'success' && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Transaction successful!
              </p>
            )}
            
            {status === 'error' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {error || 'Transaction failed'}
              </p>
            )}
            
            {hash && (
              <div className="mt-2">
                <a
                  href={getExplorerUrl(hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Explorer
                </a>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={() => onRemove(notification.id)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationItem;