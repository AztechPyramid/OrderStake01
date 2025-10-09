import React from 'react';
import { TransactionStatus } from '@/hooks/useTransactionNotification';
import { Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface TransactionStatusToastProps {
  transaction: TransactionStatus;
  getExplorerUrl: (hash: string) => string;
  getTypeText: (type: string) => string;
  onClose?: () => void;
}

const TransactionStatusToast: React.FC<TransactionStatusToastProps> = ({
  transaction,
  getExplorerUrl,
  getTypeText,
  onClose
}) => {
  const { status, type, amount, hash, error } = transaction;

  if (status === 'idle') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          title: 'Transaction Pending',
          message: 'Please wait while your transaction is being processed...'
        };
      case 'success':
        return {
          icon: <Check className="w-5 h-5 text-green-500" />,
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-800 dark:text-green-200',
          title: 'Transaction Successful',
          message: 'Your transaction has been confirmed!'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          title: 'Transaction Failed',
          message: error || 'Something went wrong with your transaction.'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const formatAmount = () => {
    if (!amount || !type) return '';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return ` ${numAmount.toLocaleString()} tokens`;
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md w-full mx-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor} shadow-lg backdrop-blur-sm`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {config.icon}
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {config.title}
            </h3>
            <div className={`mt-1 text-sm ${config.textColor} opacity-90`}>
              <p>{getTypeText(type || '')}{formatAmount()}</p>
              <p className="mt-1">{config.message}</p>
            </div>
            
            {hash && status !== 'pending' && (
              <div className="mt-3">
                <a
                  href={getExplorerUrl(hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center text-xs ${config.textColor} hover:underline font-medium`}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View on Snowtrace
                </a>
              </div>
            )}
          </div>
          
          {onClose && (
            <div className="flex-shrink-0 ml-4">
              <button
                onClick={onClose}
                className={`text-xs ${config.textColor} hover:opacity-75 transition-opacity`}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionStatusToast;