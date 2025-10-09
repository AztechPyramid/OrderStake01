import React, { createContext, useContext, ReactNode } from 'react';
import { useTransactionNotification, TransactionNotification, TransactionStatus } from '@/hooks/useTransactionNotification';

interface TransactionContextType {
  notifications: TransactionNotification[];
  currentTransaction: TransactionStatus;
  startTransaction: (
    type: 'stake' | 'unstake' | 'claim' | 'approve' | 'farm',
    amount?: string | number,
    poolName?: string
  ) => string;
  updateTransactionHash: (notificationId: string, hash: string) => void;
  setTransactionError: (notificationId: string, error: string) => void;
  completeTransaction: (hash?: string) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getTransactionTypeText: (type: string) => string;
  getAvaxExplorerUrl: (hash: string) => string;
  isTransactionPending: boolean;
  isTransactionSuccess: boolean;
  isTransactionError: boolean;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransactionContext = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const transactionNotification = useTransactionNotification();

  return (
    <TransactionContext.Provider value={transactionNotification}>
      {children}
    </TransactionContext.Provider>
  );
};