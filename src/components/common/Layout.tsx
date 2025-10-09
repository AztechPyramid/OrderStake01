import { PropsWithChildren } from 'react';
import { DualConnectButton } from './DualConnectButton';
import { Navigation } from './Navigation';
import TransactionNotifications from '../ui/TransactionNotifications';
import TransactionStatusToast from '../ui/TransactionStatusToast';
import { useTransactionContext } from '@/contexts/TransactionContext';

export const Layout = ({ children }: PropsWithChildren) => {
  const {
    notifications,
    currentTransaction,
    removeNotification,
    clearAllNotifications,
    getTransactionTypeText,
    getAvaxExplorerUrl,
    completeTransaction
  } = useTransactionContext();

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* New Navigation */}
      <Navigation />
      
      {/* Connect Button Header */}
      <header className="bg-gradient-surface border-b border-border-primary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg" 
                alt="ORDER Token"
                className="w-8 h-8 rounded-full"
              />
              <span className="text-text-secondary text-sm">Powered by</span>
              <img 
                src="https://arena.social/_next/image?url=https%3A%2F%2Fstatic.starsarena.com%2Fuploads%2F095b3954-73e0-79e6-8b8f-14548c3c622e1749436384057.jpeg&w=96&q=75" 
                alt="The Arena"
                className="w-8 h-8 rounded-full border border-border-primary"
              />
              <span className="text-lg font-bold text-text-primary">The Arena</span>
            </div>
            <DualConnectButton />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4">
        {children}
      </main>

      {/* Transaction Notification System */}
      <TransactionNotifications
        notifications={notifications}
        onRemove={removeNotification}
        onClearAll={clearAllNotifications}
        getExplorerUrl={getAvaxExplorerUrl}
        getTypeText={getTransactionTypeText}
      />

      {/* Transaction Status Toast */}
      <TransactionStatusToast
        transaction={currentTransaction}
        getExplorerUrl={getAvaxExplorerUrl}
        getTypeText={getTransactionTypeText}
        onClose={() => completeTransaction()}
      />
    </div>
  );
};
