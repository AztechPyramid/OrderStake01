import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { useArenaSDK } from './useArenaSDK';
import { ERC20ABI } from '@/contracts/ERC20ABI';
import { FACTORY_ADDRESS, ORDER_TOKEN, STAKING_CONFIG } from '@/config/contracts';

const BURN_AMOUNT = STAKING_CONFIG.BURN_AMOUNT;

const FACTORY_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "stakingToken",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "rewardToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "rewardPerBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalRewardAmount",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "poolName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "poolDescription",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "stakingSymbol",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "rewardSymbol",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "stakingLogo",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "rewardLogo",
            "type": "string"
          }
        ],
        "internalType": "struct EcosystemStakingFactory.CreateParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "createStakingPool",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "whitelistedCreators",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poolCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_limit",
        "type": "uint256"
      }
    ],
    "name": "getAllPools",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_pool",
        "type": "address"
      }
    ],
    "name": "getPoolInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "poolAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "stakingToken",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "rewardToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "rewardPerBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endBlock",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct EcosystemStakingFactory.PoolInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export interface PoolData {
  poolAddress: string;
  creator: string;
  stakingToken: string;
  rewardToken: string;
  createdAt: number;
  startBlock: bigint;
  endBlock: bigint;
  rewardPerBlock: bigint;
}

export const useFactoryHook = () => {
  const { address, sdk, isConnected } = useArenaSDK();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<PoolData[]>([]);
  const [orderBalance, setOrderBalance] = useState<string>('0');
  const [orderAllowance, setOrderAllowance] = useState<string>('0');
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(false);

  const getProvider = useCallback(() => {
    if (!sdk?.provider) return null;
    return new BrowserProvider(sdk.provider);
  }, [sdk]);

  const fetchOrderInfo = useCallback(async () => {
    try {
      const provider = getProvider();
      if (!provider || !address) return;
      
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 43114) {
        setOrderBalance('0');
        setOrderAllowance('0');
        setIsWhitelisted(false);
        return;
      }
      
      const orderContract = new Contract(ORDER_TOKEN, ERC20ABI, provider);
      const factoryContract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      
      const [balance, allowance, whitelisted] = await Promise.all([
        orderContract.balanceOf(address),
        orderContract.allowance(address, FACTORY_ADDRESS),
        factoryContract.whitelistedCreators(address)
      ]);
      
      setOrderBalance(ethers.formatEther(balance));
      setOrderAllowance(ethers.formatEther(allowance));
      setIsWhitelisted(whitelisted);
      
    } catch (err: any) {
      console.error('Error fetching ORDER info:', err);
      setOrderBalance('0');
      setOrderAllowance('0');
      setIsWhitelisted(false);
    }
  }, [getProvider, address]);

  // Add pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 1, // Single pool per page for optimal performance and UX
    totalPools: 0,
    hasMore: true,
    isLoadingMore: false
  });

  // Separate state for total pools count from factory
  const [totalPoolsCount, setTotalPoolsCount] = useState(0);

  // Search with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term - 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch total pools count from factory
  const fetchTotalPoolsCount = useCallback(async () => {
    try {
      const provider = getProvider();
      if (!provider) return;
      
      const contract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const poolCount = await contract.poolCount();
      setTotalPoolsCount(Number(poolCount));
    } catch (err: any) {
      console.error('Error fetching total pools count:', err);
    }
  }, [getProvider]);

  const fetchPools = useCallback(async () => {
    try {
      const provider = getProvider();
      if (!provider) return;
      
      const contract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const poolCount = await contract.poolCount();
      
      if (poolCount === 0n) {
        setPools([]);
        setPagination(prev => ({ ...prev, totalPools: 0, hasMore: false }));
        return;
      }

      // Fetch newest pool first (reverse pagination)
      const pageSize = pagination.pageSize;
      const reverseIndex = Number(poolCount) - 1; // Start from the newest pool
      const poolAddresses = await contract.getAllPools(reverseIndex, Math.min(Number(poolCount), pageSize));
      
      const poolsData = await Promise.all(
        poolAddresses.map(async (addr: string) => {
          const info = await contract.getPoolInfo(addr);
          return {
            poolAddress: info.poolAddress,
            creator: info.creator,
            stakingToken: info.stakingToken,
            rewardToken: info.rewardToken,
            createdAt: Number(info.createdAt),
            startBlock: info.startBlock,
            endBlock: info.endBlock,
            rewardPerBlock: info.rewardPerBlock
          };
        })
      );
      
      setPools(poolsData);
      setPagination(prev => ({
        ...prev,
        totalPools: Number(poolCount), // Use actual poolCount from factory
        hasMore: Number(poolCount) > pageSize,
        currentPage: 1
      }));
    } catch (err: any) {
      console.error('Error fetching pools:', err);
      setError(err.message);
    }
  }, [getProvider, pagination.pageSize]);

  // Get all pools where user has stake
  const getUserStakedPools = useCallback(async () => {
    if (!address) return [];
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      if (!provider) return [];
      
      const contract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const poolCount = await contract.poolCount();
      
      if (poolCount === 0n) return [];
      
      // Get all pools and check user stake in each
      const allPoolAddresses = await contract.getAllPools(0, Number(poolCount));
      const stakedPools = [];
      
      for (const addr of allPoolAddresses) {
        try {
          // Check if user has stake in this pool
          const poolContract = new Contract(addr, [
            "function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)"
          ], provider);
          
          const userInfo = await poolContract.userInfo(address);
          if (userInfo.amount > 0n) {
            const info = await contract.getPoolInfo(addr);
            stakedPools.push({
              poolAddress: info.poolAddress,
              creator: info.creator,
              stakingToken: info.stakingToken,
              rewardToken: info.rewardToken,
              createdAt: Number(info.createdAt),
              startBlock: info.startBlock,
              endBlock: info.endBlock,
              rewardPerBlock: info.rewardPerBlock
            });
          }
        } catch (err) {
          console.warn(`Failed to check stake for pool ${addr}:`, err);
        }
      }
      
      // Sort by newest first
      stakedPools.sort((a, b) => b.createdAt - a.createdAt);
      
      setPools(stakedPools);
      setPagination(prev => ({
        ...prev,
        currentPage: 1,
        totalPools: stakedPools.length,
        hasMore: false
      }));
      
      return stakedPools;
    } catch (err: any) {
      console.error('Error fetching user staked pools:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [address, getProvider]);

  // Get all pools created by user  
  const getUserCreatedPools = useCallback(async () => {
    if (!address) return [];
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      if (!provider) return [];
      
      const contract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const poolCount = await contract.poolCount();
      
      if (poolCount === 0n) return [];
      
      // Get all pools and filter by creator
      const allPoolAddresses = await contract.getAllPools(0, Number(poolCount));
      const createdPools = [];
      
      for (const addr of allPoolAddresses) {
        try {
          const info = await contract.getPoolInfo(addr);
          if (info.creator.toLowerCase() === address.toLowerCase()) {
            createdPools.push({
              poolAddress: info.poolAddress,
              creator: info.creator,
              stakingToken: info.stakingToken,
              rewardToken: info.rewardToken,
              createdAt: Number(info.createdAt),
              startBlock: info.startBlock,
              endBlock: info.endBlock,
              rewardPerBlock: info.rewardPerBlock
            });
          }
        } catch (err) {
          console.warn(`Failed to get info for pool ${addr}:`, err);
        }
      }
      
      // Sort by newest first
      createdPools.sort((a, b) => b.createdAt - a.createdAt);
      
      setPools(createdPools);
      setPagination(prev => ({
        ...prev,
        currentPage: 1,
        totalPools: createdPools.length,
        hasMore: false
      }));
      
      return createdPools;
    } catch (err: any) {
      console.error('Error fetching user created pools:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [address, getProvider]);

  // Search pools function - searches through all pools by various criteria
  const searchPools = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      fetchPools(); // Reset to normal pagination
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const provider = getProvider();
      if (!provider) return;
      
      const contract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const poolCount = await contract.poolCount();
      
      if (poolCount === 0n) {
        setPools([]);
        setPagination(prev => ({ ...prev, totalPools: 0, hasMore: false }));
        return;
      }

      // Get all pools for searching
      const allPoolAddresses = await contract.getAllPools(0, Number(poolCount));
      const searchResults = [];
      const search = searchTerm.toLowerCase();
      
      for (const addr of allPoolAddresses) {
        try {
          const info = await contract.getPoolInfo(addr);
          let isMatch = false;

          // Check pool contract address
          if (addr.toLowerCase().includes(search)) {
            isMatch = true;
          }

          // Check creator address  
          if (info.creator.toLowerCase().includes(search)) {
            isMatch = true;
          }

          // Check token addresses
          if (info.stakingToken.toLowerCase().includes(search)) {
            isMatch = true;
          }

          if (info.rewardToken.toLowerCase().includes(search)) {
            isMatch = true;
          }

          // Get pool metadata for additional searching
          try {
            const poolContract = new Contract(addr, [
              "function poolName() view returns (string)",
              "function stakingTokenSymbol() view returns (string)", 
              "function rewardTokenSymbol() view returns (string)"
            ], provider);

            // Check pool name
            try {
              const poolName = await poolContract.poolName();
              if (poolName.toLowerCase().includes(search)) {
                isMatch = true;
              }
            } catch (e) {
              // Pool might not have poolName function
            }

            // Check staking token symbol
            try {
              const stakingSymbol = await poolContract.stakingTokenSymbol();
              if (stakingSymbol.toLowerCase().includes(search)) {
                isMatch = true;
              }
            } catch (e) {
              // Try to get symbol from token contract
              try {
                const tokenContract = new Contract(info.stakingToken, [
                  "function symbol() view returns (string)"
                ], provider);
                const symbol = await tokenContract.symbol();
                if (symbol.toLowerCase().includes(search)) {
                  isMatch = true;
                }
              } catch (e2) {
                // Token might not have symbol function
              }
            }

            // Check reward token symbol
            try {
              const rewardSymbol = await poolContract.rewardTokenSymbol();
              if (rewardSymbol.toLowerCase().includes(search)) {
                isMatch = true;
              }
            } catch (e) {
              // Try to get symbol from token contract
              try {
                const tokenContract = new Contract(info.rewardToken, [
                  "function symbol() view returns (string)"
                ], provider);
                const symbol = await tokenContract.symbol();
                if (symbol.toLowerCase().includes(search)) {
                  isMatch = true;
                }
              } catch (e2) {
                // Token might not have symbol function
              }
            }
          } catch (e) {
            // Pool contract might not have metadata functions
          }

          // If any criteria matched, add to results
          if (isMatch) {
            searchResults.push({
              poolAddress: info.poolAddress,
              creator: info.creator,
              stakingToken: info.stakingToken,
              rewardToken: info.rewardToken,
              createdAt: Number(info.createdAt),
              startBlock: info.startBlock,
              endBlock: info.endBlock,
              rewardPerBlock: info.rewardPerBlock
            });
          }
        } catch (err) {
          console.warn(`Failed to search pool ${addr}:`, err);
        }
      }
      
      // Sort by newest first
      searchResults.sort((a, b) => b.createdAt - a.createdAt);
      
      setPools(searchResults);
      setPagination(prev => ({
        ...prev,
        currentPage: 1,
        totalPools: searchResults.length,
        hasMore: false // No pagination in search results
      }));
    } catch (err: any) {
      console.error('Error searching pools:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getProvider, fetchPools]);

  // Page navigation functions for single pool per page
  const navigateToPage = useCallback(async (targetPage: number) => {
    if (targetPage < 1 || pagination.isLoadingMore) return;
    
    try {
      setPagination(prev => ({ ...prev, isLoadingMore: true }));
      
      const provider = getProvider();
      if (!provider) return;
      
      const contract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const poolCount = await contract.poolCount();
      
      if (targetPage > Number(poolCount)) {
        setPagination(prev => ({ ...prev, isLoadingMore: false }));
        return;
      }
      
      // Reverse pagination: newest pools first
      // For page 1, get the last pool (newest)
      // For page 2, get the second-to-last pool, etc.
      const reverseIndex = Number(poolCount) - targetPage;
      const poolAddresses = await contract.getAllPools(reverseIndex, pagination.pageSize);
      
      if (poolAddresses.length === 0) {
        setPagination(prev => ({ ...prev, isLoadingMore: false }));
        return;
      }

      const poolsData = await Promise.all(
        poolAddresses.map(async (addr: string) => {
          const info = await contract.getPoolInfo(addr);
          return {
            poolAddress: info.poolAddress,
            creator: info.creator,
            stakingToken: info.stakingToken,
            rewardToken: info.rewardToken,
            createdAt: Number(info.createdAt),
            startBlock: info.startBlock,
            endBlock: info.endBlock,
            rewardPerBlock: info.rewardPerBlock
          };
        })
      );
      
      setPools(poolsData);
      setPagination(prev => ({
        ...prev,
        currentPage: targetPage,
        totalPools: Number(poolCount), // Use actual poolCount from factory
        hasMore: targetPage < Number(poolCount),
        isLoadingMore: false
      }));
    } catch (err: any) {
      console.error('Error navigating to page:', err);
      setPagination(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [getProvider, pagination.pageSize, pagination.isLoadingMore]);

  const nextPage = useCallback(() => {
    if (pagination.hasMore) {
      navigateToPage(pagination.currentPage + 1);
    }
  }, [pagination.hasMore, pagination.currentPage, navigateToPage]);

  const previousPage = useCallback(() => {
    if (pagination.currentPage > 1) {
      navigateToPage(pagination.currentPage - 1);
    }
  }, [pagination.currentPage, navigateToPage]);

  // Load more pools function (keeping for backward compatibility but redirecting to next page)
  const loadMorePools = useCallback(async () => {
    nextPage();
  }, [nextPage]);

  const approveOrder = useCallback(async () => {
    try {
      if (!address || !sdk?.provider) throw new Error('Wallet not connected');

      setIsLoading(true);
      setError(null);

      // Create fresh provider to avoid stale state
      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const orderContract = new Contract(ORDER_TOKEN, ERC20ABI, signer);

      // Use unlimited approval (MaxUint256) for better UX - user won't need to approve again
      console.log('🔓 Approving unlimited ORDER tokens for factory contract');
      const tx = await orderContract.approve(FACTORY_ADDRESS, ethers.MaxUint256);
      console.log('⏳ Waiting for ORDER approval transaction...');
      await tx.wait();
      console.log('✅ ORDER tokens approved successfully!');

      await fetchOrderInfo();
      return true;
    } catch (err: any) {
      console.error('❌ Error approving ORDER:', err);
      
      // Handle user rejection specifically
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Approval failed');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, sdk, fetchOrderInfo]);

  const createPool = useCallback(async (
    stakingToken: string,
    rewardToken: string,
    rewardPerBlock: string,
    totalRewardAmount: string,
    startBlock: bigint,
    endBlock: bigint,
    poolName: string,
    poolDescription: string,
    stakingSymbol: string,
    rewardSymbol: string,
    stakingLogo: string,
    rewardLogo: string,
    rewardTokenDecimals: number = 18
  ) => {
    try {
      if (!address || !sdk?.provider) throw new Error('Wallet not connected');

      setIsLoading(true);
      setError(null);

      // Create fresh provider to avoid stale state
      const provider = new BrowserProvider(sdk.provider);
      const signer = await provider.getSigner();
      const contract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      console.log('🏭 Creating pool with decimals:', rewardTokenDecimals);
      console.log('🏭 Reward per block (string):', rewardPerBlock);
      console.log('🏭 Total reward amount (string):', totalRewardAmount);

      const params = {
        stakingToken,
        rewardToken,
        rewardPerBlock: ethers.parseUnits(rewardPerBlock, rewardTokenDecimals),
        startBlock,
        endBlock,
        totalRewardAmount: ethers.parseUnits(totalRewardAmount, rewardTokenDecimals),
        poolName,
        poolDescription,
        stakingSymbol,
        rewardSymbol,
        stakingLogo,
        rewardLogo
      };

      console.log('🏭 Parsed rewardPerBlock:', params.rewardPerBlock.toString());
      console.log('🏭 Parsed totalRewardAmount:', params.totalRewardAmount.toString());

      console.log('🏭 Requesting pool creation transaction...');
      const tx = await contract.createStakingPool(params);
      console.log('⏳ Pool creation transaction sent, waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Pool created successfully!');
      
      const event = receipt?.logs?.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'PoolCreated';
        } catch {
          return false;
        }
      });
      
      let poolAddress;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        poolAddress = parsed?.args?.poolAddress;
      }

      await fetchPools();
      await fetchOrderInfo();
      return poolAddress;
    } catch (err: any) {
      console.error('❌ Error creating pool:', err);
      
      // Handle user rejection specifically
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected') || err.code === 5000) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(err.message || 'Pool creation failed');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, sdk, fetchPools, fetchOrderInfo]);

  const getPoolsByCreator = useCallback(async (creatorAddress: string) => {
    try {
      const provider = getProvider();
      if (!provider) return [];
      const contract = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      return await contract.getPoolsByCreator(creatorAddress);
    } catch (err: any) {
      console.error('Error fetching pools by creator:', err);
      return [];
    }
  }, [getProvider]);

  useEffect(() => {
    if (isConnected && sdk && address) {
      fetchOrderInfo();
      fetchPools();
      fetchTotalPoolsCount(); // Fetch total pools count separately
    }
  }, [isConnected, sdk, address, fetchOrderInfo, fetchPools, fetchTotalPoolsCount]);

  return {
    pools,
    pagination,
    totalPoolsCount, // Factory'den gelen toplam pool sayısı
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm, // 1 saniye debounce'lu search terimi
    orderBalance,
    orderAllowance,
    burnRequirement: BURN_AMOUNT,
    isLoading,
    error,
    isConnected,
    isWhitelisted,
    approveOrder,
    createPool,
    fetchPools,
    fetchTotalPoolsCount,
    loadMorePools,
    navigateToPage,
    nextPage,
    previousPage,
    searchPools,
    getUserStakedPools,
    getUserCreatedPools,
    getPoolsByCreator,
  };
};