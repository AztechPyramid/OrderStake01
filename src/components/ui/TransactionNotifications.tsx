import React, { useState } from 'react';
import { TransactionNotification } from '@/hooks/useTransactionNotification';
import NotificationItem from './NotificationItem';
import { Bell, X } from 'lucide-react';

interface TransactionNotificationsProps {
  notifications: TransactionNotification[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  getExplorerUrl: (hash: string) => string;
  getTypeText: (type: string) => string;
}

const TransactionNotifications: React.FC<TransactionNotificationsProps> = ({
  notifications,
  onRemove,
  onClearAll,
  getExplorerUrl,
  getTypeText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  // Count pending transactions
  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const hasNotifications = notifications.length > 0;

  // Show badge when there are pending transactions or new notifications
  const showBadge = pendingCount > 0 || hasNewNotification;

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewNotification(false);
    }
  };

  // Auto-show panel when there's a new pending transaction
  React.useEffect(() => {
    if (pendingCount > 0 && !isOpen) {
      setHasNewNotification(true);
    }
  }, [pendingCount, isOpen]);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Notification Bell Button */}
      <div className="relative">
        <button
          onClick={togglePanel}
          className={`p-3 rounded-full shadow-lg backdrop-blur-sm border transition-all duration-200 ${
            showBadge
              ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
              : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Bell className="w-5 h-5" />
        </button>
        
        {/* Badge */}
        {showBadge && (
          <div className="absolute -top-1 -right-1">
            <div className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pendingCount > 0 ? pendingCount : '!'}
            </div>
          </div>
        )}
      </div>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute top-16 right-0 w-96 max-h-96 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Transaction Notifications
            </h3>
            <div className="flex items-center gap-2">
              {hasNotifications && (
                <button
                  onClick={onClearAll}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {hasNotifications ? (
              <div className="p-2 space-y-2">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRemove={onRemove}
                    getExplorerUrl={getExplorerUrl}
                    getTypeText={getTypeText}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionNotifications;