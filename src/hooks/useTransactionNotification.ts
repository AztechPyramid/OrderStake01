import { useState, useCallback, useRef } from 'react';

export interface TransactionStatus {
  hash?: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  type?: 'stake' | 'unstake' | 'claim' | 'approve' | 'farm' | 'add-liquidity' | 'remove-liquidity';
  amount?: string | number;
  orderAmount?: string;
  avaxAmount?: string;
  lpAmount?: string;
}

export interface TransactionNotification {
  id: string;
  hash?: string;
  status: 'pending' | 'success' | 'error';
  type: 'stake' | 'unstake' | 'claim' | 'approve' | 'farm' | 'add-liquidity' | 'remove-liquidity';
  amount?: string | number;
  error?: string;
  timestamp: number;
  poolName?: string;
  orderAmount?: string;
  avaxAmount?: string;
  lpAmount?: string;
}

const AVAX_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 1 minute max wait time

export const useTransactionNotification = () => {
  const [notifications, setNotifications] = useState<TransactionNotification[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionStatus>({
    status: 'idle'
  });
  
  const pollCounterRef = useRef<{ [hash: string]: number }>({});
  const intervalRefs = useRef<{ [hash: string]: NodeJS.Timeout }>({});

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const getTransactionTypeText = (type: string): string => {
    const texts = {
      stake: 'Stake',
      unstake: 'Unstake',
      claim: 'Claim Rewards',
      approve: 'Approve',
      farm: 'Farm',
      'add-liquidity': 'Add Liquidity',
      'remove-liquidity': 'Remove Liquidity'
    };
    return texts[type as keyof typeof texts] || type;
  };

  const checkTransactionStatus = async (hash: string): Promise<'pending' | 'success' | 'error'> => {
    try {
      const response = await fetch(AVAX_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [hash],
          id: 1
        })
      });

      const result = await response.json();
      
      if (!result.result) {
        return 'pending';
      }

      const receipt = result.result;
      return receipt.status === '0x1' ? 'success' : 'error';
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return 'pending';
    }
  };

  const pollTransaction = useCallback(async (hash: string, notificationId: string) => {
    const pollCount = (pollCounterRef.current[hash] || 0) + 1;
    pollCounterRef.current[hash] = pollCount;

    if (pollCount > MAX_POLL_ATTEMPTS) {
      // Timeout - mark as error
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, status: 'error' as const, error: 'Transaction timeout' }
          : notif
      ));
      
      if (intervalRefs.current[hash]) {
        clearInterval(intervalRefs.current[hash]);
        delete intervalRefs.current[hash];
      }
      delete pollCounterRef.current[hash];
      return;
    }

    const status = await checkTransactionStatus(hash);
    
    if (status === 'pending') {
      return; // Continue polling
    }

    // Transaction completed (success or error)
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId 
        ? { ...notif, status, ...(status === 'error' && { error: 'Transaction failed' }) }
        : notif
    ));

    setCurrentTransaction(prev => ({
      ...prev,
      status: status === 'success' ? 'success' : 'error',
      error: status === 'error' ? 'Transaction failed' : undefined
    }));

    // Clean up polling
    if (intervalRefs.current[hash]) {
      clearInterval(intervalRefs.current[hash]);
      delete intervalRefs.current[hash];
    }
    delete pollCounterRef.current[hash];
  }, []);

  const startTransaction = useCallback((
    type: 'stake' | 'unstake' | 'claim' | 'approve' | 'farm' | 'add-liquidity' | 'remove-liquidity',
    amount?: string | number,
    poolName?: string,
    liquidityData?: { orderAmount?: string; avaxAmount?: string; lpAmount?: string }
  ) => {
    setCurrentTransaction({
      status: 'pending',
      type,
      amount,
      orderAmount: liquidityData?.orderAmount,
      avaxAmount: liquidityData?.avaxAmount,
      lpAmount: liquidityData?.lpAmount
    });

    const notification: TransactionNotification = {
      id: generateId(),
      status: 'pending',
      type,
      amount,
      timestamp: Date.now(),
      poolName,
      orderAmount: liquidityData?.orderAmount,
      avaxAmount: liquidityData?.avaxAmount,
      lpAmount: liquidityData?.lpAmount
    };

    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep max 10 notifications
    
    return notification.id;
  }, []);

  const updateTransactionHash = useCallback((notificationId: string, hash: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, hash } : notif
    ));

    setCurrentTransaction(prev => ({
      ...prev,
      hash
    }));

    // Start polling for transaction status
    pollCounterRef.current[hash] = 0;
    intervalRefs.current[hash] = setInterval(() => {
      pollTransaction(hash, notificationId);
    }, POLL_INTERVAL);

    // Initial check
    pollTransaction(hash, notificationId);
  }, [pollTransaction]);

  const setTransactionError = useCallback((notificationId: string, error: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId 
        ? { ...notif, status: 'error' as const, error }
        : notif
    ));

    setCurrentTransaction(prev => ({
      ...prev,
      status: 'error',
      error
    }));
  }, []);

  const completeTransaction = useCallback((hash?: string) => {
    setCurrentTransaction({
      status: 'idle'
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    // Clean up any ongoing polling
    Object.values(intervalRefs.current).forEach(interval => clearInterval(interval));
    intervalRefs.current = {};
    pollCounterRef.current = {};
    
    setNotifications([]);
  }, []);

  const getAvaxExplorerUrl = (hash: string) => {
    return `https://snowtrace.io/tx/${hash}`;
  };

  return {
    notifications,
    currentTransaction,
    startTransaction,
    updateTransactionHash,
    setTransactionError,
    completeTransaction,
    removeNotification,
    clearAllNotifications,
    getTransactionTypeText,
    getAvaxExplorerUrl,
    
    // Helper methods
    isTransactionPending: currentTransaction.status === 'pending',
    isTransactionSuccess: currentTransaction.status === 'success',
    isTransactionError: currentTransaction.status === 'error',
  };
};