import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { CONTRACT_ADDRESSES } from '@/utils/constants';

// AMM Router ABI - sadece ihtiyacımız olan fonksiyonlar
const AMM_ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "amountTokenDesired", "type": "uint256" },
      { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" },
      { "internalType": "uint256", "name": "amountAVAXMin", "type": "uint256" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "addLiquidityAVAX",
    "outputs": [
      { "internalType": "uint256", "name": "amountToken", "type": "uint256" },
      { "internalType": "uint256", "name": "amountAVAX", "type": "uint256" },
      { "internalType": "uint256", "name": "liquidity", "type": "uint256" }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "liquidity", "type": "uint256" },
      { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" },
      { "internalType": "uint256", "name": "amountAVAXMin", "type": "uint256" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "removeLiquidityAVAX",
    "outputs": [
      { "internalType": "uint256", "name": "amountToken", "type": "uint256" },
      { "internalType": "uint256", "name": "amountAVAX", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export interface TransactionStatus {
  hash: string;
  type: 'add-liquidity' | 'remove-liquidity';
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  timestamp?: number;
  orderAmount?: string;
  avaxAmount?: string;
  lpAmount?: string;
}

export interface TransactionMonitorResult {
  pendingTransactions: TransactionStatus[];
  monitorTransaction: (hash: string, type: 'add-liquidity' | 'remove-liquidity', metadata?: any) => void;
  clearTransaction: (hash: string) => void;
  clearAllTransactions: () => void;
  isMonitoring: boolean;
}

export const useTransactionMonitor = (): TransactionMonitorResult => {
  const { address, provider } = useWallet();
  const [pendingTransactions, setPendingTransactions] = useState<TransactionStatus[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitoringIntervals = useRef<{ [hash: string]: NodeJS.Timeout }>({});

  // Transaction monitoring fonksiyonu
  const monitorTransaction = useCallback(async (
    hash: string, 
    type: 'add-liquidity' | 'remove-liquidity',
    metadata?: { orderAmount?: string; avaxAmount?: string; lpAmount?: string }
  ) => {
    if (!provider || !address) {
      console.warn('Provider or address not available for transaction monitoring');
      return;
    }

    // Transaction'ı pending listesine ekle
    const newTransaction: TransactionStatus = {
      hash,
      type,
      status: 'pending',
      timestamp: Date.now(),
      orderAmount: metadata?.orderAmount,
      avaxAmount: metadata?.avaxAmount,
      lpAmount: metadata?.lpAmount
    };

    setPendingTransactions(prev => {
      const existing = prev.find(tx => tx.hash === hash);
      if (existing) return prev;
      return [...prev, newTransaction];
    });

    setIsMonitoring(true);

    // Polling ile transaction durumunu kontrol et
    const checkTransaction = async () => {
      try {
        // ethers v6 için getTransactionReceipt
        const receipt = await provider.getTransactionReceipt(hash);
        
        if (receipt) {
          // Transaction confirmed veya failed
          const status = receipt.status === 1 ? 'confirmed' : 'failed';
          
          setPendingTransactions(prev => 
            prev.map(tx => 
              tx.hash === hash 
                ? {
                    ...tx,
                    status,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    effectiveGasPrice: receipt.gasPrice?.toString()
                  }
                : tx
            )
          );

          // Monitoring'i durdur
          if (monitoringIntervals.current[hash]) {
            clearInterval(monitoringIntervals.current[hash]);
            delete monitoringIntervals.current[hash];
          }

          // Eğer başka monitoring transaction yoksa isMonitoring'i false yap
          setTimeout(() => {
            setPendingTransactions(prev => {
              const stillPending = prev.filter(tx => tx.status === 'pending');
              setIsMonitoring(stillPending.length > 0);
              return prev;
            });
          }, 100);

          // Success/Error callback'leri burada çağırılabilir
          if (status === 'confirmed') {
            console.log(`✅ ${type} transaction confirmed:`, hash);
            // Burada success notification gösterilebilir
          } else {
            console.log(`❌ ${type} transaction failed:`, hash);
            // Burada error notification gösterilebilir
          }
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }
    };

    // İlk kontrolü hemen yap
    await checkTransaction();

    // Eğer transaction hala pending ise, polling başlat
    const receipt = await provider.getTransactionReceipt(hash);
    if (!receipt) {
      monitoringIntervals.current[hash] = setInterval(checkTransaction, 3000); // 3 saniyede bir kontrol et
    }
  }, [provider, address]);

  // Transaction'ı listeden kaldır
  const clearTransaction = useCallback((hash: string) => {
    setPendingTransactions(prev => prev.filter(tx => tx.hash !== hash));
    
    // Monitoring'i durdur
    if (monitoringIntervals.current[hash]) {
      clearInterval(monitoringIntervals.current[hash]);
      delete monitoringIntervals.current[hash];
    }

    // isMonitoring güncelle
    setTimeout(() => {
      setPendingTransactions(prev => {
        const stillPending = prev.filter(tx => tx.status === 'pending');
        setIsMonitoring(stillPending.length > 0);
        return prev;
      });
    }, 100);
  }, []);

  // Tüm transaction'ları temizle
  const clearAllTransactions = useCallback(() => {
    setPendingTransactions([]);
    setIsMonitoring(false);
    
    // Tüm monitoring'leri durdur
    Object.values(monitoringIntervals.current).forEach(interval => {
      clearInterval(interval);
    });
    monitoringIntervals.current = {};
  }, []);

  // Component unmount olduğunda monitoring'leri temizle
  useEffect(() => {
    return () => {
      Object.values(monitoringIntervals.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, []);

  // Wallet değiştiğinde transaction'ları temizle
  useEffect(() => {
    if (!address) {
      clearAllTransactions();
    }
  }, [address, clearAllTransactions]);

  return {
    pendingTransactions,
    monitorTransaction,
    clearTransaction,
    clearAllTransactions,
    isMonitoring
  };
};

// Helper hook - Contract event'lerini dinlemek için (opsiyonel)
export const useContractEventListener = () => {
  const { provider } = useWallet();

  const listenToLiquidityEvents = useCallback(async (userAddress: string) => {
    if (!provider) return;

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.contracts.AMM_ROUTER,
        AMM_ROUTER_ABI,
        provider
      );

      // Add Liquidity eventi dinle (eğer varsa)
      contract.on('LiquidityAdded', (user, orderAmount, avaxAmount, lpTokens, event) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          console.log('🔥 Liquidity Added Event:', {
            user,
            orderAmount: orderAmount.toString(),
            avaxAmount: avaxAmount.toString(),
            lpTokens: lpTokens.toString(),
            txHash: event.transactionHash
          });
        }
      });

      // Remove Liquidity eventi dinle (eğer varsa)
      contract.on('LiquidityRemoved', (user, orderAmount, avaxAmount, lpTokens, event) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          console.log('🔥 Liquidity Removed Event:', {
            user,
            orderAmount: orderAmount.toString(),
            avaxAmount: avaxAmount.toString(),
            lpTokens: lpTokens.toString(),
            txHash: event.transactionHash
          });
        }
      });

      return () => {
        contract.removeAllListeners();
      };
    } catch (error) {
      console.error('Error setting up contract event listeners:', error);
    }
  }, [provider]);

  return { listenToLiquidityEvents };
};