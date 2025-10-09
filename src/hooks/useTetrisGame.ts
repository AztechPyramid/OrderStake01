import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { TetrisGameABI, TETRIS_GAME_ADDRESS } from '../contracts/TetrisGameABI';
import { ERC20ABI } from '../contracts/ERC20ABI';
import { useWallet } from './useWallet';
import { useArenaSDK } from './useArenaSDK';

export interface PlayerInfo {
  credits: number;
  highScore: number;
  gamesPlayed: number;
  totalEarnings: string;
  isActive: boolean;
}

export interface GameSession {
  player: string;
  score: number;
  level: number;
  lines: number;
  timestamp: number;
  rewardClaimed: boolean;
  rewardAmount: string;
}

export interface GameStats {
  rewardPool: string;
  totalBurned: string;
  totalPlayers: number;
  gameSessionCounter: number;
}

export const useTetrisGame = () => {
  const { address, provider, isConnected } = useWallet();
  const { sdk, isInArena } = useArenaSDK();
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [currentSession, setCurrentSession] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ORDER_TOKEN_ADDRESS = "0x1BEd077195307229FcCBC719C5f2ce6416A58180";

  // Get provider based on environment
  const getProvider = useCallback(() => {
    if (isInArena && sdk?.provider) {
      // Arena environment - use Arena provider
      return new ethers.BrowserProvider(sdk.provider);
    } else if (provider) {
      // Standalone environment - use regular provider
      return provider;
    }
    // Fallback RPC provider
    return new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
  }, [isInArena, sdk, provider]);

  // Get signer for transactions
  const getSigner = useCallback(async () => {
    const currentProvider = getProvider();
    
    // Prioritize Arena SDK provider for transactions
    if (isInArena && sdk?.provider) {
      console.log('🎮 Using Arena provider for transaction');
      try {
        const browserProvider = new ethers.BrowserProvider(sdk.provider);
        const signer = await browserProvider.getSigner();
        console.log('✅ Arena signer obtained successfully');
        return signer;
      } catch (error) {
        console.error('❌ Failed to get Arena signer:', error);
        throw new Error('Failed to connect to Arena wallet');
      }
    }
    
    // Fallback to regular provider
    if (currentProvider instanceof ethers.BrowserProvider) {
      try {
        console.log('🔗 Using regular provider for transaction');
        const signer = await currentProvider.getSigner();
        console.log('✅ Regular signer obtained successfully');
        return signer;
      } catch (error) {
        console.error('❌ Failed to get regular signer:', error);
        throw new Error('Failed to connect to wallet');
      }
    }
    
    throw new Error('No wallet connection available');
  }, [getProvider, isInArena, sdk]);

  // Contract instances for transactions (requires signer)
  const getTetrisGameContract = useCallback(async () => {
    const signer = await getSigner();
    console.log('🎮 Creating Tetris contract with signer address:', await signer.getAddress());
    return new ethers.Contract(TETRIS_GAME_ADDRESS, TetrisGameABI, signer);
  }, [getSigner]);

  const getOrderTokenContract = useCallback(async () => {
    const signer = await getSigner();
    console.log('💰 Creating ORDER token contract with signer address:', await signer.getAddress());
    return new ethers.Contract(ORDER_TOKEN_ADDRESS, ERC20ABI, signer);
  }, [getSigner]);

  // Contract instances for read-only operations (provider only)
  const getTetrisGameContractReadOnly = useCallback(() => {
    const currentProvider = getProvider();
    return new ethers.Contract(TETRIS_GAME_ADDRESS, TetrisGameABI, currentProvider);
  }, [getProvider]);

  const getOrderTokenContractReadOnly = useCallback(() => {
    const currentProvider = getProvider();
    return new ethers.Contract(ORDER_TOKEN_ADDRESS, ERC20ABI, currentProvider);
  }, [getProvider]);

  // Fetch player info
  const fetchPlayerInfo = useCallback(async () => {
    if (!address) return;

    try {
      const contract = getTetrisGameContractReadOnly();
      const info = await contract.getPlayerInfo(address);
      setPlayerInfo({
        credits: Number(info.credits),
        highScore: Number(info.highScore),
        gamesPlayed: Number(info.gamesPlayed),
        totalEarnings: ethers.formatEther(info.totalEarnings),
        isActive: info.isActive
      });
    } catch (err) {
      console.error('Error fetching player info:', err);
      setError('Failed to fetch player info');
    }
  }, [address, getTetrisGameContractReadOnly]);

  // Fetch game stats
  const fetchGameStats = useCallback(async () => {
    try {
      const contract = getTetrisGameContractReadOnly();
      const stats = await contract.getGameStats();
      setGameStats({
        rewardPool: ethers.formatEther(stats._rewardPool),
        totalBurned: ethers.formatEther(stats._totalBurned),
        totalPlayers: Number(stats._totalPlayers),
        gameSessionCounter: Number(stats._gameSessionCounter)
      });
    } catch (err) {
      console.error('Error fetching game stats:', err);
      setError('Failed to fetch game stats');
    }
  }, [getTetrisGameContractReadOnly]);

  // Buy credits
  const buyCredits = useCallback(async (tokenAmount: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const orderContract = await getOrderTokenContract();
      const tetrisContract = await getTetrisGameContract();
      
      const amount = ethers.parseEther(tokenAmount);

      // Check allowance
      const allowance = await orderContract.allowance(address, TETRIS_GAME_ADDRESS);
      
      if (allowance < amount) {
        // Approve tokens
        const approveTx = await orderContract.approve(TETRIS_GAME_ADDRESS, amount);
        await approveTx.wait();
      }

      // Buy credits
      const buyTx = await tetrisContract.buyCredits(amount);
      await buyTx.wait();

      // Refresh data
      await fetchPlayerInfo();
      await fetchGameStats();

    } catch (err: any) {
      console.error('Error buying credits:', err);
      setError(err.message || 'Failed to buy credits');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, getOrderTokenContract, getTetrisGameContract, fetchPlayerInfo, fetchGameStats]);

  // Add reward to pool
  const addRewardToPool = useCallback(async (tokenAmount: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const orderContract = await getOrderTokenContract();
      const tetrisContract = await getTetrisGameContract();
      
      const amount = ethers.parseEther(tokenAmount);

      // Check allowance
      const allowance = await orderContract.allowance(address, TETRIS_GAME_ADDRESS);
      
      if (allowance < amount) {
        // Approve tokens
        const approveTx = await orderContract.approve(TETRIS_GAME_ADDRESS, amount);
        await approveTx.wait();
      }

      // Add to reward pool
      const addTx = await tetrisContract.addRewardToPool(amount);
      await addTx.wait();

      // Refresh stats
      await fetchGameStats();

    } catch (err: any) {
      console.error('Error adding reward to pool:', err);
      setError(err.message || 'Failed to add reward to pool');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, getOrderTokenContract, getTetrisGameContract, fetchGameStats]);

  // Start game
  const startGame = useCallback(async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await getTetrisGameContract();
      const tx = await contract.startGame();
      const receipt = await tx.wait();

      // Get session ID from event
      const gameStartedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'GameStarted';
        } catch {
          return false;
        }
      });

      if (gameStartedEvent) {
        const parsed = contract.interface.parseLog(gameStartedEvent);
        const sessionId = Number(parsed?.args.sessionId);
        setCurrentSession(sessionId);
        await fetchPlayerInfo();
        return sessionId;
      }

      throw new Error('Failed to get session ID');

    } catch (err: any) {
      console.error('Error starting game:', err);
      setError(err.message || 'Failed to start game');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, getTetrisGameContract, fetchPlayerInfo]);

  // End game
  const endGame = useCallback(async (
    sessionId: number,
    score: number,
    level: number,
    lines: number
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    console.log('🎮 EndGame called with params:', { sessionId, score, level, lines });
    console.log('🔗 IsInArena:', isInArena, 'Address:', address);
    console.log('🔗 SDK Provider available:', !!sdk?.provider);

    setLoading(true);
    setError(null);

    try {
      console.log('📝 Getting contract instance...');
      const contract = await getTetrisGameContract();
      console.log('✅ Contract obtained:', contract.target);
      console.log('💼 Contract runner type:', typeof contract.runner);

      // Verify we have a proper signer
      if (!contract.runner || typeof contract.runner.sendTransaction !== 'function') {
        throw new Error('Invalid contract signer - Arena SDK may not be properly connected');
      }

      // Create game hash - using solidityKeccak256 for ethers v5
      const gameHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "uint256", "address"],
        [sessionId, score, level, lines, address]
      );
      console.log('🔐 Game hash generated:', gameHash);

      console.log('📤 Sending transaction with Arena SDK...');
      const txResponse = await contract.endGame(
        sessionId,
        score,
        level,
        lines,
        gameHash,
        0, // v
        ethers.ZeroHash, // r
        ethers.ZeroHash  // s
      );
      
      console.log('⏳ Transaction sent, hash:', txResponse.hash);
      console.log('⏳ Waiting for confirmation...');
      const receipt = await txResponse.wait();
      console.log('✅ Transaction confirmed! Block:', receipt.blockNumber);

      // Refresh data
      await fetchPlayerInfo();
      await fetchGameStats();
      setCurrentSession(null);

    } catch (err: any) {
      console.error('❌ Error ending game:', err);
      console.error('❌ Error details:', err.message, err.code, err.reason);
      setError(err.message || 'Failed to end game');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, getTetrisGameContract, fetchPlayerInfo, fetchGameStats, isInArena, sdk]);

  // Claim reward
  const claimReward = useCallback(async (sessionId: number) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    console.log('🎁 ClaimReward called for session:', sessionId);
    console.log('🔗 IsInArena:', isInArena, 'Address:', address);
    console.log('🔗 SDK Provider available:', !!sdk?.provider);

    setLoading(true);
    setError(null);

    try {
      console.log('📝 Getting contract instance...');
      const contract = await getTetrisGameContract();
      console.log('✅ Contract obtained:', contract.target);
      console.log('💼 Contract runner type:', typeof contract.runner);

      // Verify we have a proper signer
      if (!contract.runner || typeof contract.runner.sendTransaction !== 'function') {
        throw new Error('Invalid contract signer - Arena SDK may not be properly connected');
      }

      console.log('📤 Sending claim transaction with Arena SDK...');
      const txResponse = await contract.claimReward(sessionId);
      console.log('⏳ Claim transaction sent, hash:', txResponse.hash);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await txResponse.wait();
      console.log('✅ Claim transaction confirmed! Block:', receipt.blockNumber);

      // Refresh data
      await fetchPlayerInfo();
      await fetchGameStats();

    } catch (err: any) {
      console.error('❌ Error claiming reward:', err);
      console.error('❌ Error details:', err.message, err.code, err.reason);
      setError(err.message || 'Failed to claim reward');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, getTetrisGameContract, fetchPlayerInfo, fetchGameStats, isInArena, sdk]);

  // Calculate potential reward
  const calculateReward = useCallback(async (level: number): Promise<string> => {
    try {
      const contract = getTetrisGameContractReadOnly();
      const reward = await contract.calculateReward(level);
      return ethers.formatEther(reward);
    } catch (err) {
      console.error('Error calculating reward:', err);
      return "0";
    }
  }, [getTetrisGameContractReadOnly]);

  // Get game session
  const getGameSession = useCallback(async (sessionId: number): Promise<GameSession | null> => {
    try {
      const contract = getTetrisGameContractReadOnly();
      const session = await contract.getGameSession(sessionId);
      return {
        player: session.player,
        score: Number(session.score),
        level: Number(session.level),
        lines: Number(session.lines),
        timestamp: Number(session.timestamp),
        rewardClaimed: session.rewardClaimed,
        rewardAmount: ethers.formatEther(session.rewardAmount)
      };
    } catch (err) {
      console.error('Error fetching game session:', err);
      return null;
    }
  }, [getTetrisGameContractReadOnly]);

  // Get ORDER token balance
  const getOrderBalance = useCallback(async (): Promise<string> => {
    if (!address) return "0";

    try {
      const contract = getOrderTokenContractReadOnly();
      const balance = await contract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Error fetching ORDER balance:', err);
      return "0";
    }
  }, [address, getOrderTokenContractReadOnly]);

  // Initialize data
  useEffect(() => {
    if (isConnected && address) {
      fetchPlayerInfo();
      fetchGameStats();
    }
  }, [isConnected, address, fetchPlayerInfo, fetchGameStats]);

  return {
    // State
    playerInfo,
    gameStats,
    currentSession,
    loading,
    error,

    // Actions
    buyCredits,
    addRewardToPool,
    startGame,
    endGame,
    claimReward,
    calculateReward,
    getGameSession,
    getOrderBalance,

    // Contract access
    getTetrisGameContract,

    // Refresh functions
    refresh: useCallback(() => {
      if (isConnected && address) {
        fetchPlayerInfo();
        fetchGameStats();
      }
    }, [isConnected, address, fetchPlayerInfo, fetchGameStats])
  };
};
