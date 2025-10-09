'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useFactoryHook } from '@/hooks/useFactoryHook';
import { useArenaSDK } from '@/hooks/useArenaSDK';
import { Loader2, X } from 'lucide-react';
import { ethers, Contract, BrowserProvider } from 'ethers';
import { FACTORY_ADDRESS } from '@/config/contracts';
import { ERC20ABI } from '@/contracts/ERC20ABI';

interface CreateStakingFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  onCancel?: () => void;
}

export const CreateStakingForm: React.FC<CreateStakingFormProps> = ({ onSuccess, onClose, onCancel }) => {
  const {
    burnRequirement,
    orderBalance,
    orderAllowance,
    isLoading,
    error,
    createPool,
    approveOrder,
    isWhitelisted
  } = useFactoryHook();

  const { address, sdk, isConnected } = useArenaSDK();

  const [formData, setFormData] = useState({
    stakingToken: '',
    rewardToken: '',
    totalRewardAmount: '',
    poolName: '',
    description: '',
    stakingSymbol: '',
    rewardSymbol: '',
    stakingTokenLogo: '',
    rewardTokenLogo: '',
    startBlock: '',
    endBlock: ''
  });

  const [currentBlock, setCurrentBlock] = useState(0);
  const [fixedStartBlock, setFixedStartBlock] = useState(0); // Start block sabit kalacak
  const [currentStep, setCurrentStep] = useState<'approve' | 'create'>('approve');
  const [orderApprovalPending, setOrderApprovalPending] = useState(false);
  const [poolCreationSuccess, setPoolCreationSuccess] = useState<string | null>(null);
  const [rewardTokenAllowance, setRewardTokenAllowance] = useState('0');
  const [rewardTokenBalance, setRewardTokenBalance] = useState('0');
  const [rewardTokenDecimals, setRewardTokenDecimals] = useState(18);
  const [rewardTokenApprovalLoading, setRewardTokenApprovalLoading] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState(50); // Default %50
  const [hasAutoFilledBlocks, setHasAutoFilledBlocks] = useState(false); // Track if we already auto-filled

  const needsApproval = !isWhitelisted && Number(orderAllowance) < Number(burnRequirement);
  const hasEnoughOrder = isWhitelisted || Number(orderBalance) >= Number(burnRequirement);

  // Current block'u al ve otomatik block değerlerini set et
  useEffect(() => {
    const getCurrentBlock = async () => {
      if (!sdk?.provider) return;
      try {
        const provider = new BrowserProvider(sdk.provider);
        const blockNumber = await provider.getBlockNumber();
        setCurrentBlock(blockNumber);
        console.log('📦 Current block:', blockNumber);
        
        // İlk kez block alındığında start block'u SABİT olarak set et
        if (fixedStartBlock === 0) {
          const startBlock = blockNumber + 1000;
          setFixedStartBlock(startBlock);
          console.log('🔒 Fixed start block set to:', startBlock);
        }
        
        // Otomatik end block değerini set et (sadece ilk kez, daha önce doldurulmadıysa)
        if (!hasAutoFilledBlocks && !formData.endBlock && fixedStartBlock > 0) {
          const suggestedEnd = fixedStartBlock + 3000000; // 3 milyon blok farkı (minimum)
          
          setFormData(prev => ({
            ...prev,
            startBlock: '', // Start block artık kullanılmayacak
            endBlock: suggestedEnd.toString()
          }));
          
          setHasAutoFilledBlocks(true); // Mark as auto-filled so we don't do it again
          
          console.log('🎯 Auto-filled end block (one-time):', {
            currentBlock: blockNumber,
            fixedStart: fixedStartBlock,
            end: suggestedEnd,
            duration: `${Math.round(3000000 * 2 / 3600)} hours`
          });
        }
      } catch (error) {
        console.error('Error getting current block:', error);
      }
    };

    getCurrentBlock();
    const interval = setInterval(getCurrentBlock, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [sdk, fixedStartBlock, hasAutoFilledBlocks, formData.endBlock]);

  // Block to date conversion utility
  const blockToDate = (blockNumber: number): Date => {
    const blockDiff = blockNumber - currentBlock;
    const secondsDiff = blockDiff * 2; // Avalanche: 2 seconds per block
    return new Date(Date.now() + (secondsDiff * 1000));
  };

  // Per block reward hesaplama fonksiyonu
  const calculateRewardPerBlock = useCallback(() => {
    if (!formData.endBlock || !formData.totalRewardAmount) {
      return '0';
    }

    // Start block SABİT fixedStartBlock kullan
    if (!fixedStartBlock || fixedStartBlock === 0) {
      return '0'; // Henüz start block hesaplanmadı
    }
    
    const startBlock = fixedStartBlock;
    const endBlock = Number(formData.endBlock);
    
    if (endBlock <= startBlock) {
      return '0';
    }

    const totalBlocks = endBlock - startBlock;
    
    if (totalBlocks <= 0) {
      return '0';
    }

    const rewardPerBlock = Number(formData.totalRewardAmount) / totalBlocks;
    return rewardPerBlock.toFixed(6);
  }, [formData.endBlock, formData.totalRewardAmount, fixedStartBlock]);

  const rewardPerBlock = calculateRewardPerBlock();

  useEffect(() => {
    if (isWhitelisted) {
      setCurrentStep('create');
    }
  }, [isWhitelisted]);

  // ORDER token allowance değişikliklerini dinle ve step'i güncelle
  useEffect(() => {
    if (isWhitelisted) {
      setCurrentStep('create');
      setOrderApprovalPending(false);
    } else if (Number(orderAllowance) >= Number(burnRequirement)) {
      setCurrentStep('create');
      setOrderApprovalPending(false);
    } else {
      setCurrentStep('approve');
    }
    console.log('🔄 Step updated:', {
      isWhitelisted,
      orderAllowance,
      burnRequirement,
      needsApproval: Number(orderAllowance) < Number(burnRequirement),
      step: isWhitelisted ? 'create' : (Number(orderAllowance) >= Number(burnRequirement) ? 'create' : 'approve')
    });
  }, [isWhitelisted, orderAllowance, burnRequirement]);

  // Check reward token allowance
  useEffect(() => {
    async function checkAllowance() {
      if (!formData.rewardToken) {
        console.log('🔄 Missing token address - skipping balance check');
        return;
      }
      if (!isConnected || !address || !sdk?.provider) {
        console.log('🔄 Wallet not connected - skipping balance check');
        return;
      }
      try {
        console.log('🔄 useEffect: Checking token:', formData.rewardToken);
        
        // Create fresh provider for read operations
        const provider = new BrowserProvider(sdk.provider);
        const signer = await provider.getSigner();
        console.log('🔄 useEffect: Got signer for address:', address);
        const contract = new Contract(formData.rewardToken, ERC20ABI, signer);
        
        // Token'ın decimal sayısını al
        const decimals = await contract.decimals();
        console.log('🔄 useEffect: Token decimals:', decimals);
        setRewardTokenDecimals(decimals); // Decimals'ı state'e kaydet
        
        const allowance = await contract.allowance(address, FACTORY_ADDRESS);
        const balance = await contract.balanceOf(address);
        
        console.log('🔄 useEffect: Raw balance:', balance.toString());
        console.log('🔄 useEffect: Raw allowance:', allowance.toString());
        
        // Doğru decimal sayısıyla formatla
        const formattedAllowance = ethers.formatUnits(allowance, decimals);
        const formattedBalance = ethers.formatUnits(balance, decimals);
        
        console.log('🔄 useEffect: Formatted balance:', formattedBalance);
        console.log('🔄 useEffect: Formatted allowance:', formattedAllowance);
        
        setRewardTokenAllowance(formattedAllowance);
        setRewardTokenBalance(formattedBalance);
      } catch (err) {
        console.error('🔄 useEffect: Error checking reward token:', err);
        setRewardTokenAllowance('0');
        setRewardTokenBalance('0');
      }
    }
    checkAllowance();
  }, [formData.rewardToken, isConnected, address, sdk]); // sdk dependency eklendi

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: value
      };
      
      // Aynı token seçilmişse ve totalRewardAmount 1.1M'dan azsa, otomatik 1.1M yap
      if ((name === 'stakingToken' || name === 'rewardToken') && 
          newFormData.stakingToken && 
          newFormData.rewardToken &&
          newFormData.stakingToken.toLowerCase() === newFormData.rewardToken.toLowerCase()) {
        
        // Aynı token seçilmişse ve totalRewardAmount 1.1M'dan azsa, otomatik 1.1M yap
        const currentAmount = Number(newFormData.totalRewardAmount) || 0;
        if (currentAmount < 1100000) {
          newFormData.totalRewardAmount = '1100000';
        }
      }
      
      return newFormData;
    });
  };

  // Percentage seçildiğinde total reward amount'u hesapla
  const handlePercentageSelect = (percentage: number) => {
    setSelectedPercentage(percentage);
    if (rewardTokenBalance && Number(rewardTokenBalance) > 0) {
      // Tam sayı olarak hesapla (ondalık kısmı at)
      const calculatedAmount = Math.floor(Number(rewardTokenBalance) * percentage / 100);
      setFormData({
        ...formData,
        totalRewardAmount: calculatedAmount.toString()
      });
    }
  };

  // Test fonksiyonu - manual balance check
  const testTokenBalance = async () => {
    if (!formData.rewardToken) {
      console.log('❌ Please enter a token address first');
      return;
    }
    
    try {
      console.log('🔍 Testing token:', formData.rewardToken);
      
      // Sadece token bilgilerini test et (wallet olmadan)
      const provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
      const contract = new Contract(formData.rewardToken, ERC20ABI, provider);
      
      // Token bilgilerini al
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();
      
      console.log('🪙 Token info:', { name, symbol, decimals });
      console.log(`📊 TOKEN TEST: ${name} (${symbol}) - Decimals: ${decimals}`);
      
    } catch (err: any) {
      console.error('❌ Token test error:', err);
      console.log('Token address might be invalid or not on Avalanche network');
    }
  };

  const handleApprove = async () => {
    try {
      console.log('🔄 Starting ORDER approval...');
      setOrderApprovalPending(true);
      const success = await approveOrder();
      if (success) {
        console.log('✅ ORDER approval successful');
        // Wait a bit for blockchain state to update
        setTimeout(() => {
          console.log('🔄 Checking if step should switch to create...');
          setOrderApprovalPending(false);
          if (Number(orderAllowance) >= Number(burnRequirement)) {
            console.log('✅ Allowance sufficient, switching to create step');
            setCurrentStep('create');
          } else {
            console.log('⚠️ Allowance still insufficient, will wait for useEffect to update');
          }
        }, 3000); // 3 second wait for blockchain confirmation
      } else {
        console.log('❌ ORDER approval failed');
        setOrderApprovalPending(false);
      }
    } catch (error) {
      console.error('❌ Approval error:', error);
      setOrderApprovalPending(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Önce tüm approval'ları kontrol et
      console.log('🔍 ====== PRE-CREATION CHECKS ======');
      console.log('🔍 ORDER Token Check:');
      console.log('  - Whitelisted:', isWhitelisted);
      console.log('  - Balance:', orderBalance);
      console.log('  - Allowance:', orderAllowance);
      console.log('  - Required:', burnRequirement);
      
      console.log('🔍 Reward Token Check:');
      console.log('  - Address:', formData.rewardToken);
      console.log('  - Balance:', rewardTokenBalance);
      console.log('  - Allowance:', rewardTokenAllowance);
      console.log('  - Required:', formData.totalRewardAmount);
      console.log('🔍 ==================================');
      
      // Reward token approval kontrolü
      if (Number(rewardTokenAllowance) < Number(formData.totalRewardAmount)) {
        alert('Please approve the reward token first! Click the "Approve Unlimited Access" button above.');
        return;
      }
      
      // ORDER token approval kontrolü (whitelisted değilse)
      if (!isWhitelisted && Number(orderAllowance) < Number(burnRequirement)) {
        alert('Please approve ORDER tokens first! Go back to Step 1.');
        return;
      }
      
      // Block'lardan timestamp'e çevir - Start block SABİT (ilk hesaplanan değer)
      const startBlock = fixedStartBlock;
      const endBlock = Number(formData.endBlock);
      
      // Eğer fixedStartBlock henüz set edilmediyse hata ver
      if (!startBlock || startBlock === 0) {
        alert('Please wait while calculating start block...');
        return;
      }
      
      const totalBlocks = endBlock - startBlock;
      
      // Reward per block hesaplama - CONTRACT İLE TUTARLI OLMALI
      // Contract: totalRewardAmount >= rewardPerBlock * totalBlocks
      // Bu yüzden: rewardPerBlock = totalRewardAmount / totalBlocks olmalı
      
      // String olarak işlem yapalım ki precision kaybı olmasın
      const totalRewardWei = ethers.parseUnits(formData.totalRewardAmount, rewardTokenDecimals);
      const totalBlocksBigInt = BigInt(totalBlocks);
      const rewardPerBlockWei = totalRewardWei / totalBlocksBigInt;
      
      // Wei'den ether'e çevir ama parseUnits için değil, direkt wei olarak gönderelim
      // VEYA: Wei'den geri ether string'e çevir
      const rewardPerBlockEther = ethers.formatUnits(rewardPerBlockWei, rewardTokenDecimals);
      
      console.log('📝 ====== CREATE POOL DEBUG ======');
      console.log('📝 Creating pool with reward token decimals:', rewardTokenDecimals);
      console.log('📝 Total reward amount (ether):', formData.totalRewardAmount);
      console.log('📝 Total reward amount (wei):', totalRewardWei.toString());
      console.log('📝 Total blocks:', totalBlocks);
      console.log('📝 Reward per block (wei):', rewardPerBlockWei.toString());
      console.log('📝 Reward per block (ether):', rewardPerBlockEther);
      console.log('📝 Verification (wei):', (rewardPerBlockWei * totalBlocksBigInt).toString(), '<=', totalRewardWei.toString());
      console.log('📝 Start block (FIXED):', startBlock);
      console.log('📝 End block:', endBlock);
      console.log('📝 Current block:', currentBlock);
      console.log('📝 Current allowance:', rewardTokenAllowance);
      console.log('📝 Current balance:', rewardTokenBalance);
      console.log('📝 ===============================');
      
      const poolAddress = await createPool(
        formData.stakingToken,
        formData.rewardToken,
        rewardPerBlockEther, // Ether string - hook parseUnits yapacak
        formData.totalRewardAmount, // Ether string - hook parseUnits yapacak
        BigInt(startBlock),
        BigInt(endBlock),
        formData.poolName,
        formData.description,
        formData.stakingSymbol,
        formData.rewardSymbol,
        formData.stakingTokenLogo,
        formData.rewardTokenLogo,
        rewardTokenDecimals // Decimal bilgisini geç
      );

      if (poolAddress) {
        console.log(`🎉 Pool created successfully!`);
        console.log(`📍 Pool Address: ${poolAddress}`);
        console.log(`🔗 Snowtrace: https://snowtrace.io/address/${poolAddress}`);
        console.log(`Pool Details:`);
        console.log(`- Reward per block: ${rewardPerBlockEther} ${formData.rewardSymbol}`);
        console.log(`- Total blocks: ${totalBlocks}`);
        console.log(`- Total rewards: ${formData.totalRewardAmount} ${formData.rewardSymbol}`);
        console.log(`✅ Contract will be automatically verified by Snowtrace (similar bytecode detection)`);
        
        // Set success state with pool address
        setPoolCreationSuccess(poolAddress);
        
        // Wait 3 seconds before closing to show success message
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 3000);
      }
    } catch (err) {
      console.error('❌ Error creating pool:', err);
      const errorMsg = (err as Error).message;
      
      // Daha anlaşılır hata mesajları
      if (errorMsg.includes('ERC20: insufficient allowance') || errorMsg.includes('execution reverted')) {
        alert('Approval Error: Please make sure you have approved both ORDER tokens (if not whitelisted) and reward tokens before creating the pool. Check the approval buttons above.');
      } else {
        alert('Error: ' + errorMsg);
      }
    }
  };

  // Approve reward token
  const handleApproveRewardToken = async () => {
    setRewardTokenApprovalLoading(true);
    try {
      if (!isConnected || !address || !sdk?.provider) throw new Error('Wallet not connected');
      
      // Create fresh provider to avoid stale state
      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const contract = new Contract(formData.rewardToken, ERC20ABI, signer);
      
      // Token'ın decimal sayısını al
      const decimals = await contract.decimals();
      
      // Unlimited approval (max uint256)
      const maxAmount = ethers.MaxUint256;
      console.log('🔓 Approving unlimited amount for reward token');
      
      const tx = await contract.approve(FACTORY_ADDRESS, maxAmount);
      console.log('⏳ Waiting for approval confirmation...');
      await tx.wait();
      console.log('✅ Unlimited reward token approval successful!');
      
      // Wait a bit for blockchain state to update
      setTimeout(async () => {
        try {
          // Re-check allowance with correct decimals
          const allowance = await contract.allowance(address, FACTORY_ADDRESS);
          const formattedAllowance = ethers.formatUnits(allowance, decimals);
          setRewardTokenAllowance(formattedAllowance);
          console.log('🔄 Updated reward token allowance:', formattedAllowance);
          setRewardTokenApprovalLoading(false);
        } catch (err) {
          console.error('❌ Error updating allowance:', err);
          setRewardTokenApprovalLoading(false);
        }
      }, 3000); // 3 second wait for blockchain confirmation
      
    } catch (err: any) {
      console.error('❌ Error approving reward token:', err);
      
      // Handle user rejection specifically
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        alert('Transaction was rejected. Please try again.');
      } else {
        alert(`Error approving reward token: ${err.message}`);
      }
      setRewardTokenApprovalLoading(false);
    }
  };

  const isFormValid = 
    formData.stakingToken &&
    formData.rewardToken &&
    formData.totalRewardAmount &&
    formData.poolName &&
    formData.description &&
    formData.stakingSymbol &&
    formData.rewardSymbol &&
    formData.stakingTokenLogo &&
    formData.rewardTokenLogo &&
    formData.endBlock &&
    fixedStartBlock > 0 && // Start block hazır mı kontrol et
    Number(formData.endBlock) > fixedStartBlock && // End block must be after fixed start
    Number(formData.endBlock) >= fixedStartBlock + 3000000 && // Minimum 3M blok farkı from fixed start
    Number(rewardPerBlock) > 0 &&
    Number(rewardTokenAllowance) >= Number(formData.totalRewardAmount) && // Reward token approval kontrolü eklendi
    (isWhitelisted || Number(orderAllowance) >= Number(burnRequirement)) && // ORDER token approval kontrolü (whitelisted değilse)
    // Same token minimum 1M check
    (formData.stakingToken.toLowerCase() !== formData.rewardToken.toLowerCase() || Number(formData.totalRewardAmount) >= 1100000);

  // Show success message if pool was created
  if (poolCreationSuccess) {
    return (
      <div className="bg-card-bg border border-card-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-green-400">🎉 Pool Created Successfully!</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-xl font-bold text-green-400 mb-4">Your staking pool is now live!</h3>
          
          <div className="space-y-3 text-sm">
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-text-tertiary mb-1">Pool Contract Address:</div>
              <div className="font-mono text-text-primary break-all">{poolCreationSuccess}</div>
              <a
                href={`https://snowtrace.io/address/${poolCreationSuccess}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary hover:text-accent-secondary text-xs mt-1 inline-block"
              >
                View on Snowtrace →
              </a>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-surface-secondary rounded p-2">
                <div className="text-text-tertiary">Pool Name</div>
                <div className="text-text-primary font-medium">{formData.poolName}</div>
              </div>
              <div className="bg-surface-secondary rounded p-2">
                <div className="text-text-tertiary">Total Rewards</div>
                <div className="text-text-primary font-medium">{formData.totalRewardAmount} {formData.rewardSymbol}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-text-secondary text-sm">
            ✅ Pool will appear in the ecosystem list within 1 minute<br/>
            ✅ Users can start staking immediately<br/>
            ✅ Contract verified automatically on Snowtrace
          </div>
          
          <div className="mt-4 text-xs text-text-tertiary">
            This dialog will close automatically in a few seconds...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg border border-card-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Create Pool</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className={`border rounded-lg p-4 mb-6 ${isWhitelisted ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
        <h3 className={`text-sm font-semibold mb-2 ${isWhitelisted ? 'text-green-400' : 'text-yellow-400'}`}>
          {isWhitelisted ? 'Whitelisted Creator' : 'Burn Requirement'}
        </h3>
        {isWhitelisted ? (
          <p className="text-xs text-text-secondary animate-pulse">
            🔥 <span className="text-orange-400 font-bold">ATTENTION:</span> You need to burn <span className="text-red-400 font-bold">1M ORDER</span> for each pool creation!
          </p>
        ) : (
          <p className="text-xs text-text-secondary mb-2">
            Creating a staking pool requires burning {burnRequirement} ORDER tokens
          </p>
        )}
      </div>

      {/* Action Buttons Section - Fresh UX like ecosystem staking cards */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-text-primary mb-4">🚀 Pool Creation Steps</h3>
        
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              !isWhitelisted && Number(orderAllowance) < Number(burnRequirement)
                ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30'
                : 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
            }`}>
              {!isWhitelisted && Number(orderAllowance) < Number(burnRequirement) ? '1' : '✓'}
            </div>
            <span className={`text-sm font-medium ${
              !isWhitelisted && Number(orderAllowance) < Number(burnRequirement)
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}>
              {isWhitelisted ? 'Whitelisted' : 'ORDER Approval'}
            </span>
          </div>
          
          <div className="flex-1 h-0.5 mx-3 bg-border-primary"></div>
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              !formData.rewardToken || Number(rewardTokenAllowance) < Number(formData.totalRewardAmount)
                ? 'bg-gray-500/20 text-gray-400 border-2 border-gray-500/30'
                : 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
            }`}>
              {!formData.rewardToken || Number(rewardTokenAllowance) < Number(formData.totalRewardAmount) ? '2' : '✓'}
            </div>
            <span className={`text-sm font-medium ${
              !formData.rewardToken || Number(rewardTokenAllowance) < Number(formData.totalRewardAmount)
                ? 'text-gray-400'
                : 'text-green-400'
            }`}>
              Reward Approval
            </span>
          </div>
          
          <div className="flex-1 h-0.5 mx-3 bg-border-primary"></div>
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              !isFormValid
                ? 'bg-gray-500/20 text-gray-400 border-2 border-gray-500/30'
                : 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/30'
            }`}>
              {!isFormValid ? '3' : '🚀'}
            </div>
            <span className={`text-sm font-medium ${
              !isFormValid ? 'text-gray-400' : 'text-blue-400'
            }`}>
              Create Pool
            </span>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* Step 1: ORDER Approval (only if not whitelisted) */}
          {!isWhitelisted && (
            <div className="bg-surface-secondary border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                    🔥
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Step 1: ORDER Burn Approval</h4>
                    <p className="text-xs text-text-secondary">
                      Approve burning {Number(burnRequirement).toLocaleString()} ORDER tokens for pool creation
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-tertiary">Balance</div>
                  <div className="text-sm font-bold text-text-primary">
                    {Number(orderBalance).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleApprove}
                disabled={isLoading || !hasEnoughOrder || orderApprovalPending || Number(orderAllowance) >= Number(burnRequirement)}
                className={`w-full font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg border ${
                  Number(orderAllowance) >= Number(burnRequirement)
                    ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-default'
                    : orderApprovalPending
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 cursor-wait'
                    : hasEnoughOrder
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-orange-600/20 hover:shadow-orange-600/40 border-orange-500/30 hover:scale-[1.02]'
                    : 'bg-gray-600/20 text-gray-400 border-gray-500/30 cursor-not-allowed'
                }`}
              >
                {Number(orderAllowance) >= Number(burnRequirement) ? (
                  <span className="flex items-center justify-center">
                    ✅ ORDER Approved for Burning
                  </span>
                ) : orderApprovalPending ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Waiting for Confirmation...
                  </span>
                ) : !hasEnoughOrder ? (
                  `❌ Insufficient ORDER (Need ${Number(burnRequirement).toLocaleString()})`
                ) : (
                  '🔥 Approve ORDER for Burning'
                )}
              </button>
              
              {!hasEnoughOrder && (
                <p className="text-xs text-red-400 mt-2 text-center">
                  You need {Number(burnRequirement).toLocaleString()} ORDER tokens to create a pool
                </p>
              )}
            </div>
          )}

          {/* Step 2: Reward Token Approval */}
          {formData.rewardToken && Number(formData.totalRewardAmount) > 0 && (
            <div className="bg-surface-secondary border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    💰
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Step 2: Reward Token Approval</h4>
                    <p className="text-xs text-text-secondary">
                      Approve {Number(formData.totalRewardAmount).toLocaleString()} {formData.rewardSymbol} for rewards
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-tertiary">Balance</div>
                  <div className="text-sm font-bold text-text-primary">
                    {Number(rewardTokenBalance).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleApproveRewardToken}
                disabled={rewardTokenApprovalLoading || Number(rewardTokenAllowance) >= Number(formData.totalRewardAmount)}
                className={`w-full font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg border ${
                  Number(rewardTokenAllowance) >= Number(formData.totalRewardAmount)
                    ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-default'
                    : rewardTokenApprovalLoading
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 cursor-wait'
                    : Number(rewardTokenBalance) >= Number(formData.totalRewardAmount)
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-600/20 hover:shadow-blue-600/40 border-blue-500/30 hover:scale-[1.02]'
                    : 'bg-gray-600/20 text-gray-400 border-gray-500/30 cursor-not-allowed'
                }`}
              >
                {Number(rewardTokenAllowance) >= Number(formData.totalRewardAmount) ? (
                  <span className="flex items-center justify-center">
                    ✅ {formData.rewardSymbol} Approved for Rewards
                  </span>
                ) : rewardTokenApprovalLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Waiting for Confirmation...
                  </span>
                ) : Number(rewardTokenBalance) < Number(formData.totalRewardAmount) ? (
                  `❌ Insufficient ${formData.rewardSymbol} Balance`
                ) : (
                  `💰 Approve ${formData.rewardSymbol} Tokens`
                )}
              </button>
              
              {Number(rewardTokenBalance) < Number(formData.totalRewardAmount) && (
                <p className="text-xs text-red-400 mt-2 text-center">
                  Insufficient balance. You have {Number(rewardTokenBalance).toLocaleString()} but need {Number(formData.totalRewardAmount).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Create Pool */}
          <div className="bg-surface-secondary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  🚀
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Step 3: Create Staking Pool</h4>
                  <p className="text-xs text-text-secondary">
                    Deploy your staking pool contract to the blockchain
                  </p>
                </div>
              </div>
              {rewardPerBlock && Number(rewardPerBlock) > 0 && (
                <div className="text-right">
                  <div className="text-xs text-text-tertiary">Reward/Block</div>
                  <div className="text-sm font-bold text-accent-primary">
                    {rewardPerBlock}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleCreate}
              disabled={isLoading || !isFormValid}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg border ${
                isFormValid
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-600/20 hover:shadow-green-600/40 border-green-500/30 hover:scale-[1.02]'
                  : 'bg-gray-600/20 text-gray-400 border-gray-500/30 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Pool Contract...
                </span>
              ) : isFormValid ? (
                '🚀 Create Staking Pool'
              ) : (
                '📝 Complete All Steps Above'
              )}
            </button>
            
            {!isFormValid && (
              <div className="mt-3 text-xs text-text-tertiary text-center">
                Complete the form and approvals above to create your pool
              </div>
            )}
          </div>
        </div>

        {/* Overall Status Summary */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className={`text-center px-3 py-2 rounded-lg text-xs font-medium ${
            isWhitelisted || Number(orderAllowance) >= Number(burnRequirement)
              ? 'bg-green-500/20 text-green-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {isWhitelisted ? '👑 Whitelisted' : (Number(orderAllowance) >= Number(burnRequirement) ? '🔥 ORDER Ready' : '🔥 ORDER Pending')}
          </div>
          
          <div className={`text-center px-3 py-2 rounded-lg text-xs font-medium ${
            formData.rewardToken && Number(rewardTokenAllowance) >= Number(formData.totalRewardAmount)
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {formData.rewardToken && Number(rewardTokenAllowance) >= Number(formData.totalRewardAmount) ? '💰 Rewards Ready' : '💰 Rewards Pending'}
          </div>
          
          <div className={`text-center px-3 py-2 rounded-lg text-xs font-medium ${
            isFormValid
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {isFormValid ? '📝 Form Complete' : '📝 Form Incomplete'}
          </div>
        </div>
      </div>
        <div className="space-y-6">
          <h3 className="font-semibold text-text-primary mb-4">
            Pool Configuration
          </h3>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Pool Name *
            </label>
            <input
              type="text"
              name="poolName"
              value={formData.poolName}
              onChange={handleInputChange}
              placeholder="e.g., ORDER Staking Pool"
              className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of your staking pool"
              rows={3}
              className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Staking Token Address *
              </label>
              <input
                type="text"
                name="stakingToken"
                value={formData.stakingToken}
                onChange={handleInputChange}
                placeholder="0x..."
                className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Reward Token Address *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="rewardToken"
                  value={formData.rewardToken}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  className="flex-1 bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                />
                <button
                  type="button"
                  onClick={testTokenBalance}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Test
                </button>
              </div>
            </div>
          </div>

          {/* Same token warning */}
          {formData.stakingToken && 
           formData.rewardToken && 
           formData.stakingToken.toLowerCase() === formData.rewardToken.toLowerCase() && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0">
                  ⚠️
                </div>
                <div>
                  <h4 className="text-yellow-400 font-medium text-sm mb-1">
                    Same Token Selected
                  </h4>
                  <p className="text-yellow-200 text-xs leading-relaxed">
                    When stake token and reward token are the same, a minimum of <strong>1,100,000 tokens</strong> must be distributed as rewards. 
                    This restriction prevents theft of staked tokens from the pool.
                  </p>
                  {Number(formData.totalRewardAmount) >= 1100000 && (
                    <p className="text-green-400 text-xs mt-1">
                      ✅ Minimum reward amount requirement is satisfied.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Staking Token Logo URL *
              </label>
              <input
                type="url"
                name="stakingTokenLogo"
                value={formData.stakingTokenLogo}
                onChange={handleInputChange}
                placeholder="https://example.com/token-logo.png"
                className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Reward Token Logo URL *
              </label>
              <input
                type="url"
                name="rewardTokenLogo"
                value={formData.rewardTokenLogo}
                onChange={handleInputChange}
                placeholder="https://example.com/token-logo.png"
                className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Staking Token Symbol *
              </label>
              <input
                type="text"
                name="stakingSymbol"
                value={formData.stakingSymbol}
                onChange={handleInputChange}
                placeholder="e.g., AVAX"
                className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Reward Token Symbol *
              </label>
              <input
                type="text"
                name="rewardSymbol"
                value={formData.rewardSymbol}
                onChange={handleInputChange}
                placeholder="e.g., ORDER"
                className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Total Reward Amount *
            </label>
            <input
              type="number"
              step="1"
              min={formData.stakingToken && 
                   formData.rewardToken && 
                   formData.stakingToken.toLowerCase() === formData.rewardToken.toLowerCase() 
                   ? "1100000" : "1"}
              name="totalRewardAmount"
              value={formData.totalRewardAmount}
              onChange={handleInputChange}
              placeholder={formData.stakingToken && 
                          formData.rewardToken && 
                          formData.stakingToken.toLowerCase() === formData.rewardToken.toLowerCase() 
                          ? "Minimum: 1,100,000" : "e.g., 10000"}
              className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
            <p className="text-xs text-text-tertiary mt-1">
              Total reward tokens that will be transferred to the pool contract. Balance: {rewardTokenBalance}
              {formData.stakingToken && 
               formData.rewardToken && 
               formData.stakingToken.toLowerCase() === formData.rewardToken.toLowerCase() && 
               <span className="text-yellow-400 ml-2">(Minimum: 1,100,000 for same token pools)</span>}
            </p>
            
            {/* Percentage Selector */}
            {Number(rewardTokenBalance) > 0 && (
              <div className="mt-2">
                <p className="text-xs text-text-secondary mb-2">Quick select percentage of your balance:</p>
                <div className="flex flex-wrap gap-2">
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 99].map((percentage) => (
                    <button
                      key={percentage}
                      type="button"
                      onClick={() => handlePercentageSelect(percentage)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        selectedPercentage === percentage
                          ? 'bg-accent-primary text-white'
                          : 'bg-surface-tertiary text-text-secondary hover:bg-surface-secondary'
                      }`}
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {Number(rewardPerBlock) > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">Calculated Pool Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-text-tertiary">Reward per Block:</span>
                  <span className="text-text-primary font-mono ml-2">{rewardPerBlock} {formData.rewardSymbol || 'tokens'}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Estimated Duration:</span>
                  <span className="text-text-primary ml-2">
                    {formData.startBlock && formData.endBlock ? 
                      `${Math.round((Number(formData.endBlock) - Number(formData.startBlock)) * 2 / 3600)} hours (${Number(formData.endBlock) - Number(formData.startBlock)} blocks)` 
                      : 'TBD'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Current Block Info */}
          <div className="bg-surface-secondary rounded-lg p-4 mb-6">
            <div className="text-sm text-text-secondary mb-2">Current Network Status</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Current Block:</span>
                <span className="text-text-primary font-mono">{currentBlock.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Fixed Start Block:</span>
                <span className="text-text-primary font-mono">
                  {fixedStartBlock > 0 ? fixedStartBlock.toLocaleString() : 'Calculating...'}
                </span>
              </div>
            </div>
            {fixedStartBlock > 0 && (
              <p className="text-xs text-text-tertiary mt-2">
                Start block is fixed at {fixedStartBlock.toLocaleString()} and won't change. 
                (≈ {blockToDate(fixedStartBlock).toLocaleString()})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              End Block *
            </label>
            <input
              type="number"
              name="endBlock"
              value={formData.endBlock}
              onChange={handleInputChange}
              min={fixedStartBlock + 3000000}
              placeholder={fixedStartBlock > 0 ? `Minimum: ${(fixedStartBlock + 3000000).toLocaleString()}` : 'Calculating...'}
              className="w-full bg-surface-secondary border border-border-primary rounded-lg px-4 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
            <p className="text-xs text-text-tertiary mt-1">
              Pool will end at this block (minimum 3M blocks = ~69 days from start)
              {formData.endBlock && fixedStartBlock > 0 && (
                <span className="block text-accent-primary mt-1">
                  ≈ {blockToDate(Number(formData.endBlock)).toLocaleString()}
                  <span className="ml-2">
                    (Duration: {Math.round((Number(formData.endBlock) - fixedStartBlock) * 2 / 3600 / 24)} days)
                  </span>
                </span>
              )}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
    </div>
  );
};