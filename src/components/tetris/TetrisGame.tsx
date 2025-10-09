import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useTetrisGame } from '../../hooks/useTetrisGame';
import { useWallet } from '../../hooks/useWallet';
import { useArenaSDK } from '../../hooks/useArenaSDK';
import { useContractOrderBalance } from '../../hooks/useContractOrderBalance';
import { useBurnedOrderTokens } from '../../hooks/useBurnedOrderTokens';
import { useOrderPrice } from '../../hooks/useOrderPrice';
import { tetrisSounds } from '../../utils/soundEffects';

// Tetris piece shapes
const PIECES = [
  // I-piece
  [
    [1, 1, 1, 1]
  ],
  // O-piece
  [
    [1, 1],
    [1, 1]
  ],
  // T-piece
  [
    [0, 1, 0],
    [1, 1, 1]
  ],
  // S-piece
  [
    [0, 1, 1],
    [1, 1, 0]
  ],
  // Z-piece
  [
    [1, 1, 0],
    [0, 1, 1]
  ],
  // J-piece
  [
    [1, 0, 0],
    [1, 1, 1]
  ],
  // L-piece
  [
    [0, 0, 1],
    [1, 1, 1]
  ]
];

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
// Sadece ORDER logosu kullanılacak
const ORDER_LOGO_PATH = '/order-logo.jpg';

interface Position {
  x: number;
  y: number;
}

interface Piece {
  shape: number[][];
  position: Position;
  color: number;
}

const TetrisGame: React.FC = () => {
  const { isConnected, address, provider } = useWallet();
  const { sdk, isInArena } = useArenaSDK();
  const {
    playerInfo,
    gameStats,
    currentSession,
    loading,
    error,
    buyCredits,
    addRewardToPool,
    startGame,
    endGame,
    claimReward,
    getOrderBalance,
    calculateReward,
    getGameSession
  } = useTetrisGame();

  // Hook to fetch ORDER balance from Tetris game contract
  const tetrisContractAddress = '0x40cB148d19b6AdA8e8B00C2ad35DA3D8c738d68D';
  const { 
    balance: rewardPoolBalance, 
    balanceFormatted: rewardPoolFormatted, 
    isLoading: rewardPoolLoading 
  } = useContractOrderBalance(tetrisContractAddress);

  // Hook to fetch ORDER price
  const { 
    priceData, 
    isLoading: orderPriceLoading 
  } = useOrderPrice();

  // Hook to fetch burned ORDER tokens from home page (DISABLED for Tetris page)
  // const {
  //   balance: burnedBalance,
  //   balanceFormatted: burnedBalanceFormatted,
  //   usdValue: burnedUsdValue,
  //   usdValueFormatted: burnedUsdValueFormatted,
  //   isLoading: burnedTokensLoading
  // } = useBurnedOrderTokens();

  // State for Tetris contract data
  const [playerInfoData, setPlayerInfoData] = useState<any>(null);
  const [playerInfoLoading, setPlayerInfoLoading] = useState(true);
  const [gameStatsData, setGameStatsData] = useState<any>(null);
  const [gameStatsLoading, setGameStatsLoading] = useState(true);

  // State for last game data (backup claim reward)
  const [lastGameData, setLastGameData] = useState<any>(null);
  const [showBackupClaim, setShowBackupClaim] = useState(false);

  // State for unclaimed rewards
  const [unclaimedRewards, setUnclaimedRewards] = useState<any[]>([]);
  const [unclaimedLoading, setUnclaimedLoading] = useState(false);

  const [board, setBoard] = useState<number[][]>(() =>
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOverModal, setGameOverModal] = useState(false);
  const [orderBalance, setOrderBalance] = useState('0');
  const [creditAmount, setCreditAmount] = useState('10000');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [showSubmitScore, setShowSubmitScore] = useState(false);
  const [showClaimOnly, setShowClaimOnly] = useState(false); // New state for showing only claim button
  const [sessionStats, setSessionStats] = useState<{
    sessionId: number;
    finalScore: number;
    finalLevel: number;
    finalLines: number;
    potentialReward: string;
  } | null>(null);
  const [rewardAmount, setRewardAmount] = useState('1000');
  const [lastSessionId, setLastSessionId] = useState<number | null>(() => {
    // localStorage'dan session ID'yi yükle
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tetris_last_session_id');
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  });
  const [claimableRewardAmount, setClaimableRewardAmount] = useState<string>('0');
  const [pendingEndGameSession, setPendingEndGameSession] = useState<{
    sessionId: number;
    score: number;
    level: number;
    lines: number;
  } | null>(() => {
    // localStorage'dan pending session'ı yükle
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tetris_pending_endgame');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  
  // EndGame backup system states
  const [failedEndGameSession, setFailedEndGameSession] = useState<{
    sessionId: number;
    score: number;
    level: number;
    lines: number;
    gameHash: string;
    potentialReward: string;
  } | null>(() => {
    // localStorage'dan failed endGame session'ı yükle
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tetris_failed_endgame_session');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  
  const [showEndGameDetails, setShowEndGameDetails] = useState(false);
  const [endGameDetails, setEndGameDetails] = useState<{
    sessionId: number;
    score: number;
    level: number;
    lines: number;
    gameHash: string;
  } | null>(null);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<number | null>(null);

  // Load balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected) {
        const balance = await getOrderBalance();
        setOrderBalance(balance);
      }
    };
    fetchBalance();
  }, [isConnected, getOrderBalance]);

  // Load last game data from localStorage on component mount
  useEffect(() => {
    try {
      const savedGameData = localStorage.getItem('tetris_pending_endgame');
      if (savedGameData) {
        const gameData = JSON.parse(savedGameData);
        console.log('🔄 Loaded last game data from localStorage:', gameData);
        setLastGameData({
          sessionId: gameData.sessionId,
          finalScore: gameData.score,
          finalLevel: gameData.level,
          finalLines: gameData.lines,
          potentialReward: gameData.potentialReward,
          timestamp: gameData.timestamp
        });
      }
    } catch (error) {
      console.error('❌ Failed to load last game data:', error);
    }
  }, []); // Run only once on mount

  // Generate a new piece
  const generatePiece = useCallback((): Piece => {
    const shapeIndex = Math.floor(Math.random() * PIECES.length);
    return {
      shape: PIECES[shapeIndex],
      position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
      color: shapeIndex
    };
  }, []);

  // Check if piece can be placed at position
  const canPlacePiece = useCallback((piece: Piece, newPosition?: Position): boolean => {
    const pos = newPosition || piece.position;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = pos.x + x;
          const boardY = pos.y + y;
          
          if (
            boardX < 0 ||
            boardX >= BOARD_WIDTH ||
            boardY >= BOARD_HEIGHT ||
            (boardY >= 0 && board[boardY][boardX])
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }, [board]);

  // Place piece on board
  const placePiece = useCallback((piece: Piece): number[][] => {
    const newBoard = board.map(row => [...row]);
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = piece.position.x + x;
          const boardY = piece.position.y + y;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color + 1;
          }
        }
      }
    }
    return newBoard;
  }, [board]);

  // Clear completed lines
  const clearLines = useCallback((gameBoard: number[][]): { newBoard: number[][]; linesCleared: number } => {
    const newBoard = gameBoard.filter(row => row.some(cell => cell === 0));
    const linesCleared = BOARD_HEIGHT - newBoard.length;
    
    // Add new empty rows at the top
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    
    return { newBoard, linesCleared };
  }, []);

  // Move piece
  const movePiece = useCallback((direction: 'left' | 'right' | 'down') => {
    if (!currentPiece || !isPlaying) return;

    let newPosition: Position;
    switch (direction) {
      case 'left':
        newPosition = { ...currentPiece.position, x: currentPiece.position.x - 1 };
        break;
      case 'right':
        newPosition = { ...currentPiece.position, x: currentPiece.position.x + 1 };
        break;
      case 'down':
        newPosition = { ...currentPiece.position, y: currentPiece.position.y + 1 };
        break;
      default:
        return;
    }

    if (canPlacePiece(currentPiece, newPosition)) {
      setCurrentPiece({ ...currentPiece, position: newPosition });
      // Hareket sesini çal (sadece manuel hareket için)
      if (direction !== 'down') {
        tetrisSounds.playMove(Math.floor(Math.random() * 8));
      }
    } else if (direction === 'down') {
      // Parça artık aşağı hareket edemiyor, yerleştir
      const newBoard = placePiece(currentPiece);
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
      
      // Parça yerleştirme sesi
      tetrisSounds.playPlacement();
      
      // Satır temizleme sesi
      if (linesCleared > 0) {
        tetrisSounds.playLineClear(linesCleared);
      }
      
      setBoard(clearedBoard);
      setLines(prev => prev + linesCleared);
      setScore(prev => prev + (linesCleared * 100 * level + 10));
      
      // Seviye atlama kontrolü
      const newLevel = Math.floor((lines + linesCleared) / 10) + 1;
      if (newLevel > level) {
        tetrisSounds.playLevelUp();
      }
      setLevel(newLevel);

      // Generate next piece
      const nextPieceToUse = nextPiece || generatePiece();
      const newNextPiece = generatePiece();
      
      if (canPlacePiece(nextPieceToUse)) {
        setCurrentPiece(nextPieceToUse);
        setNextPiece(newNextPiece);
      } else {
        // Game over
        handleGameOver();
      }
    }
  }, [currentPiece, isPlaying, canPlacePiece, placePiece, clearLines, level, lines, generatePiece]);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    if (!currentPiece || !isPlaying) return;

    const rotatedShape = currentPiece.shape[0].map((_, index) =>
      currentPiece.shape.map(row => row[index]).reverse()
    );

    const rotatedPiece = { ...currentPiece, shape: rotatedShape };
    
    if (canPlacePiece(rotatedPiece)) {
      setCurrentPiece(rotatedPiece);
      // Döndürme sesi
      tetrisSounds.playRotate();
    }
  }, [currentPiece, isPlaying, canPlacePiece]);

  // Game loop
  useEffect(() => {
    if (isPlaying) {
      const dropInterval = Math.max(100, 1000 - (level - 1) * 100);
      gameLoopRef.current = setInterval(() => {
        movePiece('down');
      }, dropInterval);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [isPlaying, level, movePiece]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePiece('down');
          break;
        case 'ArrowUp':
        case ' ':
          e.preventDefault();
          rotatePiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, movePiece, rotatePiece]);

  // Check claimable reward amount when lastSessionId changes
  useEffect(() => {
    const checkRewardAmount = async () => {
      if (lastSessionId) {
        try {
          const session = await getGameSession(lastSessionId);
          if (session && !session.rewardClaimed) {
            setClaimableRewardAmount(session.rewardAmount);
          } else {
            setClaimableRewardAmount('0');
          }
        } catch (error) {
          console.error('Error checking reward amount:', error);
          setClaimableRewardAmount('0');
        }
      } else {
        setClaimableRewardAmount('0');
      }
    };

    checkRewardAmount();
  }, [lastSessionId, getGameSession]);

  // Save session ID to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (lastSessionId) {
        localStorage.setItem('tetris_last_session_id', lastSessionId.toString());
      } else {
        localStorage.removeItem('tetris_last_session_id');
      }
    }
  }, [lastSessionId]);

  // State for start game countdown
  const [startCountdown, setStartCountdown] = useState<number>(0);
  
  // Fetch player info from Tetris contract
  const fetchPlayerInfoData = useCallback(async () => {
    if (!address) return;
    
    try {
      setPlayerInfoLoading(true);
      
      // Use Arena SDK provider if available, otherwise use RPC
      let provider;
      if (isInArena && sdk?.provider) {
        provider = new ethers.BrowserProvider(sdk.provider);
      } else {
        provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
      }
      
      // Create contract instance with read-only provider
      const tetrisContract = new ethers.Contract(
        '0x40cB148d19b6AdA8e8B00C2ad35DA3D8c738d68D', // Tetris contract address
        ['function getPlayerInfo(address _player) view returns (uint256 credits, uint256 highScore, uint256 gamesPlayed, uint256 totalEarnings, bool isActive)'], // ABI fragment
        provider
      );
      
      const playerData = await tetrisContract.getPlayerInfo(address);
      const formattedPlayerInfo = {
        credits: Number(playerData[0]),
        highScore: Number(playerData[1]),
        gamesPlayed: Number(playerData[2]),
        totalEarnings: parseFloat(ethers.formatEther(playerData[3])).toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 6 
        }),
        isActive: playerData[4]
      };
      
      setPlayerInfoData(formattedPlayerInfo);
      console.log('👤 Tetris player info:', formattedPlayerInfo);
    } catch (error) {
      console.error('❌ Failed to fetch player info:', error);
      setPlayerInfoData(null);
    } finally {
      setPlayerInfoLoading(false);
    }
  }, [address, isInArena, sdk]);

  // Fetch game stats from Tetris contract
  const fetchGameStatsData = useCallback(async () => {
    try {
      setGameStatsLoading(true);
      
      // Use Arena SDK provider if available, otherwise use RPC
      let provider;
      if (isInArena && sdk?.provider) {
        provider = new ethers.BrowserProvider(sdk.provider);
      } else {
        provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
      }
      
      // Create contract instance with read-only provider
      const tetrisContract = new ethers.Contract(
        '0x40cB148d19b6AdA8e8B00C2ad35DA3D8c738d68D', // Tetris contract address
        ['function getGameStats() view returns (uint256, uint256, uint256, uint256)'], // ABI fragment
        provider
      );
      
      const gameStats = await tetrisContract.getGameStats();
      const formattedGameStats = {
        rewardPool: ethers.formatEther(gameStats[0]), // First value is reward pool
        burnedOrderAmount: ethers.formatEther(gameStats[1]), // Second value is burned ORDER
        totalPlayers: Number(gameStats[2]), // Third value is total players
        gameSessionCounter: Number(gameStats[3]), // Fourth value is game session counter
        // Legacy support
        activeGames: Number(gameStats[2]), // Keeping for backward compatibility
        totalGames: Number(gameStats[3]) // Keeping for backward compatibility
      };
      
      setGameStatsData(formattedGameStats);
      console.log('📊 Tetris game stats:', formattedGameStats);
    } catch (error) {
      console.error('❌ Failed to fetch game stats:', error);
      setGameStatsData(null);
    } finally {
      setGameStatsLoading(false);
    }
  }, [isInArena, sdk]);

  // Fetch data on component mount and address change
  useEffect(() => {
    fetchPlayerInfoData();
    fetchGameStatsData();
  }, [fetchPlayerInfoData, fetchGameStatsData]);

  // Fetch unclaimed rewards for connected user - using direct contract calls
  const fetchUnclaimedRewards = useCallback(async () => {
    if (!address || !isConnected) {
      setUnclaimedRewards([]);
      return;
    }

    try {
      setUnclaimedLoading(true);
      
      // Use Arena SDK provider if available, otherwise use RPC
      let provider;
      if (isInArena && sdk?.provider) {
        provider = new ethers.BrowserProvider(sdk.provider);
      } else {
        provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
      }
      
      const tetrisContract = new ethers.Contract(
        '0x40cB148d19b6AdA8e8B00C2ad35DA3D8c738d68D',
        [
          'function getGameSession(uint256) view returns (address, uint256, uint256, uint256, uint256, bool, uint256)',
          'function getGameStats() view returns (uint256, uint256, uint256, uint256)'
        ],
        provider
      );

      // Get total game sessions from contract
      let totalSessions;
      try {
        const [rewardPool, totalBurned, totalPlayers, gameSessionCounter] = await tetrisContract.getGameStats();
        totalSessions = gameSessionCounter;
        console.log('📊 Total game sessions:', totalSessions.toString());
      } catch (error) {
        console.log('⚠️ getGameStats not available, using fallback method');
        // Fallback: check recent session IDs (assuming sequential numbering)
        totalSessions = BigInt(1000); // Check last 1000 sessions max
      }
      
      const unclaimedSessions = [];
      const maxSessionsToCheck = Math.min(Number(totalSessions), 100); // Limit to last 100 sessions for performance
      
      console.log('🔍 Checking last', maxSessionsToCheck, 'sessions for user:', address);
      
      // Check sessions from most recent backwards
      for (let i = Number(totalSessions); i > Number(totalSessions) - maxSessionsToCheck && i > 0; i--) {
        try {
          const sessionData = await tetrisContract.getGameSession(i);
          const [player, score, level, lines, timestamp, rewardClaimed, rewardAmount] = sessionData;
          
          // Check if this session belongs to current user
          if (player.toLowerCase() === address.toLowerCase()) {
            // If reward exists but not claimed, add to unclaimed list
            if (!rewardClaimed && rewardAmount > 0) {
              unclaimedSessions.push({
                sessionId: i.toString(),
                score: score.toString(),
                level: level.toString(),
                lines: lines.toString(),
                timestamp: timestamp.toString(),
                rewardAmount: ethers.formatEther(rewardAmount),
                date: new Date(Number(timestamp) * 1000).toLocaleDateString()
              });
            }
          }
        } catch (error) {
          // Session might not exist, continue to next
          continue;
        }
      }
      
      // Sort by timestamp (newest first)
      unclaimedSessions.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      
      setUnclaimedRewards(unclaimedSessions);
      console.log('🎁 Found unclaimed rewards:', unclaimedSessions);
      
    } catch (error) {
      console.error('❌ Error fetching unclaimed rewards:', error);
      setUnclaimedRewards([]);
    } finally {
      setUnclaimedLoading(false);
    }
  }, [address, isConnected, isInArena, sdk]);

  // Fetch unclaimed rewards when wallet connects
  useEffect(() => {
    fetchUnclaimedRewards();
  }, [fetchUnclaimedRewards]);

  // Refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPlayerInfoData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchPlayerInfoData]);
  
  // Handle start game with enhanced reliability
  const handleStartGame = async () => {
    console.log('🎮 Starting new game countdown...');
    
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!playerInfo?.credits || playerInfo.credits === 0) {
      alert('You need to buy credits first');
      return;
    }

    // Start 5 second countdown
    setStartCountdown(5);
    
    const countdownInterval = setInterval(() => {
      setStartCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Start the actual game after countdown
          startActualGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startActualGame = async () => {
    console.log('🎮 Starting actual game after countdown...');
    
    // Immediately start the game UI - don't wait for blockchain
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)));
    setScore(0);
    setLevel(1);
    setLines(0);
    const firstPiece = generatePiece();
    const secondPiece = generatePiece();
    setCurrentPiece(firstPiece);
    setNextPiece(secondPiece);
    setIsPlaying(true);
    setGameOverModal(false);
    setShowSubmitScore(false);
    setShowClaimOnly(false); // Reset claim only state
    setSessionStats(null);

    // Oyun başlangıç sesi
    tetrisSounds.playGameStart();
    
    console.log('✅ Game UI started, attempting blockchain transaction...');

    // Start blockchain transaction in background
    try {
      console.log('🔗 Starting blockchain session...');
      const sessionId = await startGame();
      if (sessionId && sessionId > 0) {
        sessionIdRef.current = sessionId;
        setLastSessionId(sessionId);
        console.log('✅ Blockchain session started successfully:', sessionId);
      } else {
        console.error('❌ Invalid session ID returned:', sessionId);
        throw new Error('Invalid session ID');
      }
    } catch (error) {
      console.error('❌ Failed to start game on blockchain:', error);
      // Show warning but don't stop the game (removed confirm dialog)
      console.log('⚠️ Playing locally - score submission may not work');
    }
  };

  // Handle end game manually
  const handleEndGame = async () => {
    if (!sessionIdRef.current || !address) return;

    // Calculate game hash
    const gameHash = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256", "uint256", "address"],
      [sessionIdRef.current, score, level, lines, address]
    );

    setEndGameDetails({
      sessionId: sessionIdRef.current,
      score: score,
      level: level,
      lines: lines,
      gameHash: gameHash
    });

    setShowEndGameDetails(true);
    setIsPlaying(false);
    setCurrentPiece(null);
    setNextPiece(null);
  };

  // Handle game over with enhanced reliability
  const handleGameOver = async () => {
    console.log('🎮 Game Over triggered', { score, level, lines, sessionId: sessionIdRef.current });
    
    setIsPlaying(false);
    setCurrentPiece(null);
    setNextPiece(null);
    
    // Oyun bitiş sesi
    tetrisSounds.playGameOver();
    
    // Always show game over modal regardless of session state
    const currentSessionId = sessionIdRef.current;
    
    if (currentSessionId !== null) {
      try {
        console.log('🎯 Calculating reward for level:', level);
        const reward = await calculateReward(level);
        console.log('💰 Calculated reward:', reward);
        
        const gameSession = {
          sessionId: currentSessionId,
          score,
          level,
          lines,
          potentialReward: reward,
          timestamp: Date.now()
        };
        
        console.log('💾 Saving game session:', gameSession);
        
        setSessionStats({
          sessionId: currentSessionId,
          finalScore: score,
          finalLevel: level,
          finalLines: lines,
          potentialReward: reward
        });
        
        // Save last game data for backup claim
        setLastGameData({
          sessionId: currentSessionId,
          finalScore: score,
          finalLevel: level,
          finalLines: lines,
          potentialReward: reward,
          timestamp: Date.now()
        });
        
        // Always save to localStorage as backup
        localStorage.setItem('tetris_pending_endgame', JSON.stringify(gameSession));
        setPendingEndGameSession(gameSession);
        
        // Always show submit button if we have a valid session
        setShowSubmitScore(true);
        console.log('✅ Submit button enabled for session:', currentSessionId);
      } catch (error) {
        console.error('❌ Error calculating reward:', error);
        // Still show modal with minimum reward even if calculation fails
        const fallbackReward = level >= 10 ? '100' : '0'; // Minimum reward for level 10+
        console.log('🔄 Using fallback reward:', fallbackReward);
        
        setSessionStats({
          sessionId: currentSessionId,
          finalScore: score,
          finalLevel: level,
          finalLines: lines,
          potentialReward: fallbackReward
        });
        
        // Save last game data for backup claim (fallback case)
        setLastGameData({
          sessionId: currentSessionId,
          finalScore: score,
          finalLevel: level,
          finalLines: lines,
          potentialReward: fallbackReward,
          timestamp: Date.now()
        });
        
        // Still enable submit if we have a session, even with fallback reward
        if (level >= 10) {
          setShowSubmitScore(true);
          console.log('✅ Submit enabled with fallback reward');
        } else {
          setShowSubmitScore(false);
          console.log('⚠️ Level too low, submit disabled');
        }
      }
    } else {
      console.warn('⚠️ No session ID available for game over');
      // Show modal without submit option
      setSessionStats({
        sessionId: 0,
        finalScore: score,
        finalLevel: level,
        finalLines: lines,
        potentialReward: '0'
      });
      setShowSubmitScore(false);
    }
    
    // Always show the game over modal
    setGameOverModal(true);
    console.log('✅ Game Over modal shown');
  };

  // Handle submit score
  // Enhanced submit score with better error handling and loading state
  const handleSubmitScore = async () => {
    console.log('🔥 handleSubmitScore called!');
    console.log('🔥 sessionStats:', sessionStats);
    console.log('🔥 isSubmitLoading before:', isSubmitLoading);
    console.log('🔗 isConnected:', isConnected, 'address:', address);
    
    if (!sessionStats) {
      console.error('❌ No session stats available for submit');
      alert('Error: No game session data available');
      return;
    }

    if (!isConnected || !address) {
      console.error('❌ Wallet not connected');
      alert('Please connect your wallet first');
      return;
    }

    console.log('🚀 Starting score submission:', sessionStats);

    // Set loading state to true
    setIsSubmitLoading(true);
    console.log('🔥 Set isSubmitLoading to true');

    try {
      console.log('📤 Calling endGame with params:', {
        sessionId: sessionStats.sessionId,
        score: sessionStats.finalScore,
        level: sessionStats.finalLevel,
        lines: sessionStats.finalLines
      });

      await endGame(
        sessionStats.sessionId,
        sessionStats.finalScore,
        sessionStats.finalLevel,
        sessionStats.finalLines
      );
      
      console.log('✅ Score submitted successfully');
      
      // Success feedback
      alert(`🎉 Score submitted successfully! You earned ${parseFloat(sessionStats.potentialReward).toLocaleString('tr-TR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} ORDER tokens!`);
      
      // After successful submit: hide submit button, show only claim button
      setShowSubmitScore(false);
      setShowClaimOnly(true); // Show only claim button
      // setGameOverModal(false); // Keep modal open
      // sessionIdRef.current = null; // Keep session reference
      
      // Clear all stored sessions
      localStorage.removeItem('tetris_pending_endgame');
      setPendingEndGameSession(null);
      setFailedEndGameSession(null);
      setLastGameData(null); // Clear backup claim data
      localStorage.removeItem('tetris_failed_endgame_session');
      
      // DON'T reset session stats - keep for claim button
      // setSessionStats(null); // Keep sessionStats for claim button
      
    } catch (error) {
      console.error('❌ Failed to submit score:', error);
      
      // Save failed attempt for later retry
      const failedSession = {
        sessionId: sessionStats.sessionId,
        score: sessionStats.finalScore,
        level: sessionStats.finalLevel,
        lines: sessionStats.finalLines,
        gameHash: '', // We'll calculate this later if needed
        potentialReward: sessionStats.potentialReward
      };
      
      localStorage.setItem('tetris_failed_endgame_session', JSON.stringify(failedSession));
      setFailedEndGameSession(failedSession);
      
      // User-friendly error message
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to submit score: ${errorMsg}\n\nYour game has been saved and you can retry submission later.`);
    } finally {
      console.log('🔥 Setting isSubmitLoading to false');
      setIsSubmitLoading(false);
    }
  };

  // Handle add reward to pool
  const handleAddReward = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      await addRewardToPool(rewardAmount);
      const balance = await getOrderBalance();
      setOrderBalance(balance);
      alert(`Successfully added ${rewardAmount} ORDER to reward pool!`);
    } catch (error) {
      console.error('Failed to add reward:', error);
      alert('Failed to add reward to pool');
    }
  };

  // Handle claim reward - Updated with better loading and error handling
  const handleClaimReward = async (sessionId?: number) => {
    const targetSessionId = sessionId || sessionStats?.sessionId;
    
    console.log('🎁 handleClaimReward called!');
    console.log('🎁 targetSessionId:', targetSessionId);
    console.log('🔗 isConnected:', isConnected, 'address:', address);
    
    if (!targetSessionId) {
      alert('No valid session to claim rewards from');
      return;
    }

    if (!isConnected || !address) {
      console.error('❌ Wallet not connected');
      alert('Please connect your wallet first');
      return;
    }

    console.log('🎁 Starting reward claim for session:', targetSessionId);
    setIsSubmitLoading(true);

    try {
      const rewardAmount = sessionStats?.potentialReward || 'unknown amount';

      await claimReward(targetSessionId);
      
      console.log('✅ Reward claimed successfully');
      alert(`🎉 Successfully claimed ${rewardAmount} ORDER tokens!`);
      
      // Update ORDER balance
      const balance = await getOrderBalance();
      setOrderBalance(balance);
      
      // ALWAYS close modal after successful claim - regardless of sessionId parameter
      setGameOverModal(false);
      setSessionStats(null);
      setShowSubmitScore(false);
      setShowClaimOnly(false); // Reset claim only state
      sessionIdRef.current = null;
      
    } catch (error) {
      console.error('❌ Failed to claim reward:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to claim reward: ${errorMsg}`);
    } finally {
      setIsSubmitLoading(false);
    }
  };
  const handleBuyCredits = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      await buyCredits(creditAmount);
      const balance = await getOrderBalance();
      setOrderBalance(balance);
    } catch (error) {
      console.error('Failed to buy credits:', error);
      alert('Failed to buy credits');
    }
  };

  // Render game board
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    // Add current piece to display board
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardX = currentPiece.position.x + x;
            const boardY = currentPiece.position.y + y;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color + 1;
            }
          }
        }
      }
    }

    return (
      <div className="relative">
        {/* Fire effect container around the board */}
        <div className="absolute -inset-2 bg-gradient-to-br from-orange-500/20 via-red-500/20 to-yellow-500/20 rounded-lg blur-sm animate-pulse" style={{ animationDuration: '3s' }}></div>
        <div className="absolute -inset-1 bg-gradient-to-br from-red-500/30 via-orange-500/30 to-yellow-500/30 rounded-lg blur-xs animate-ping" style={{ animationDuration: '4s' }}></div>
        
        {/* Game board with responsive sizing and enhanced neon effects */}
        <div 
          className="relative grid grid-cols-10 gap-0.5 bg-gray-800 p-3 rounded-lg border-2 shadow-2xl border-orange-500"
          style={{
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.3), 0 0 60px rgba(249, 115, 22, 0.1)'
          }}
        >
          {displayBoard.flat().map((cell, index) => (
            <div
              key={index}
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 border border-gray-600/50 relative overflow-hidden flex items-center justify-center transition-all duration-200 hover:border-orange-400/50"
              style={{
                backgroundColor: cell ? '#2d3748' : '#1a202c',
                boxShadow: cell ? '0 0 8px rgba(251, 146, 60, 0.3)' : 'none'
              }}
            >
              {cell > 0 && (
                <>
                  <img 
                    src={ORDER_LOGO_PATH} 
                    alt="ORDER piece" 
                    className="w-full h-full object-cover rounded-sm transform scale-95 hover:scale-100 transition-transform duration-200 animate-pulse"
                    style={{ 
                      filter: 'brightness(1.1) contrast(1.1) drop-shadow(0 0 4px rgba(251, 146, 60, 0.5))',
                      animation: currentPiece && 
                        index >= currentPiece.position.y * 10 + currentPiece.position.x && 
                        index <= (currentPiece.position.y + currentPiece.shape.length - 1) * 10 + (currentPiece.position.x + currentPiece.shape[0].length - 1)
                        ? 'tetris-piece-glow 0.5s ease-in-out infinite alternate' : 'none'
                    }}
                  />
                  {/* Enhanced glow effect for active pieces */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-sm animate-pulse" style={{ animationDuration: '2.5s' }}></div>
                  {/* Extra glow for falling pieces */}
                  {currentPiece && 
                    index >= currentPiece.position.y * 10 + currentPiece.position.x && 
                    index <= (currentPiece.position.y + currentPiece.shape.length - 1) * 10 + (currentPiece.position.x + currentPiece.shape[0].length - 1) && (
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-sm animate-ping" style={{ animationDuration: '3s' }}></div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Enhanced fire particles around the board */}
        <div className="absolute -top-2 left-1/4 w-1 h-2 bg-gradient-to-t from-orange-500 to-transparent rounded-full tetris-fire-particle opacity-60"></div>
        <div className="absolute -top-1 right-1/4 w-0.5 h-1.5 bg-gradient-to-t from-red-500 to-transparent rounded-full tetris-fire-particle opacity-70" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute -top-1.5 left-1/2 w-1.5 h-2.5 bg-gradient-to-t from-yellow-500 to-transparent rounded-full tetris-fire-particle opacity-50" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 -left-1 w-1 h-3 bg-gradient-to-r from-orange-500 to-transparent rounded-full tetris-fire-particle opacity-40" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 -right-1 w-1 h-2 bg-gradient-to-l from-red-500 to-transparent rounded-full tetris-fire-particle opacity-40" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute -bottom-1 left-1/3 w-2 h-1 bg-gradient-to-b from-orange-400 to-transparent rounded-full tetris-fire-particle opacity-50" style={{ animationDelay: '0.8s' }}></div>
        <div className="absolute -top-3 left-1/6 w-0.5 h-1 bg-gradient-to-t from-yellow-400 to-transparent rounded-full tetris-fire-particle opacity-30" style={{ animationDelay: '1.2s' }}></div>
        <div className="absolute -top-2 right-1/6 w-1 h-1.5 bg-gradient-to-t from-red-400 to-transparent rounded-full tetris-fire-particle opacity-40" style={{ animationDelay: '1.7s' }}></div>
      </div>
    );
  };

  // Render next piece preview
  const renderNextPiece = () => {
    if (!nextPiece) return null;

    const previewSize = 4; // 4x4 grid for preview
    const previewBoard = Array(previewSize).fill(null).map(() => Array(previewSize).fill(0));
    
    // Center the piece in the preview
    const offsetX = Math.floor((previewSize - nextPiece.shape[0].length) / 2);
    const offsetY = Math.floor((previewSize - nextPiece.shape.length) / 2);
    
    for (let y = 0; y < nextPiece.shape.length; y++) {
      for (let x = 0; x < nextPiece.shape[y].length; x++) {
        if (nextPiece.shape[y][x]) {
          const previewX = offsetX + x;
          const previewY = offsetY + y;
          if (previewY >= 0 && previewY < previewSize && previewX >= 0 && previewX < previewSize) {
            previewBoard[previewY][previewX] = nextPiece.color + 1;
          }
        }
      }
    }

    return (
      <div className="relative">
        <div className="grid grid-cols-4 gap-0.5 bg-gray-800 p-3 rounded-lg border border-orange-400/40">
          {previewBoard.flat().map((cell, index) => (
            <div
              key={index}
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 border border-gray-600/50 relative overflow-hidden flex items-center justify-center"
              style={{
                backgroundColor: cell ? '#2d3748' : '#1a202c',
                boxShadow: cell ? '0 0 6px rgba(251, 146, 60, 0.3)' : 'none'
              }}
            >
              {cell > 0 && (
                <>
                  <img 
                    src={ORDER_LOGO_PATH} 
                    alt="ORDER next piece" 
                    className="w-full h-full object-cover rounded-sm"
                    style={{ 
                      filter: 'brightness(1.1) contrast(1.1) drop-shadow(0 0 3px rgba(251, 146, 60, 0.4))'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400/15 to-red-400/15 rounded-sm animate-pulse" style={{ animationDuration: '2s' }}></div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-full xl:max-w-none 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header with sound controls */}
        <div className="flex justify-end items-center mb-8">
          {/* Sound Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => tetrisSounds.toggleMute()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              title="Ses Aç/Kapat"
            >
              🔊
            </button>
            <button
              onClick={() => tetrisSounds.setVolume(0.1)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
              title="Düşük Ses"
            >
              -
            </button>
            <button
              onClick={() => tetrisSounds.setVolume(0.5)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
              title="Orta Ses"
            >
              =
            </button>
            <button
              onClick={() => tetrisSounds.setVolume(1.0)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
              title="Yüksek Ses"
            >
              +
            </button>
          </div>
        </div>
        
        {/* Total ORDER Reward Pool - Top Section */}
        <div className="mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-orange-900 to-red-900 p-6 rounded-xl text-white border border-orange-500/30 shadow-lg" style={{ backgroundColor: '#2a1a1a' }}>
              <h3 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                🎮 Total ORDER Reward Pool
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-800/30 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-200 text-lg">Pool Balance:</span>
                    <span className="font-bold text-orange-100 text-xl">
                      {rewardPoolLoading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        `${parseFloat(rewardPoolFormatted).toLocaleString()} ORDER`
                      )}
                    </span>
                  </div>
                </div>
                <div className="bg-orange-800/30 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-orange-200 text-sm">Contract Address</div>
                    <div className="text-orange-100 font-mono text-xs break-all">{tetrisContractAddress}</div>
                  </div>
                </div>
              </div>
              <div className="text-center mt-4">
                <div className="text-orange-400 text-sm">
                  🏆 Total rewards available for all players
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 xl:gap-12 items-center xl:items-start justify-center">
          {/* Game Board Section - Centered and Optimized */}
          <div className="flex-1 flex flex-col items-center space-y-6 w-full max-w-4xl xl:max-w-none xl:flex-shrink-0">
            {/* Next Piece Preview - Enhanced */}
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-orange-500/30 shadow-lg">
                <h4 className="text-sm font-bold text-orange-300 mb-2 text-center">Next Piece</h4>
                {renderNextPiece()}
              </div>
            </div>
            
            {/* Game Board Container - Enhanced with better sizing */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl border-2 border-orange-500/40 shadow-2xl shadow-orange-500/20">
                {renderBoard()}
              </div>
            </div>
            
            {/* Mobile Controls - Enhanced */}
            <div className="xl:hidden w-full max-w-sm">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-orange-500/30 shadow-lg">
                <h4 className="text-sm font-bold text-orange-300 mb-3 text-center">Controls</h4>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div></div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      rotatePiece();
                    }}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 p-4 rounded-lg text-center font-bold select-none shadow-lg text-white transition-all duration-150"
                  >
                    <span className="text-xl">↻</span>
                    <div className="text-xs mt-1">Rotate</div>
                  </button>
                  <div></div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      movePiece('left');
                    }}
                    className="bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 active:scale-95 p-4 rounded-lg text-center font-bold select-none shadow-lg text-white transition-all duration-150"
                  >
                    <span className="text-xl">←</span>
                    <div className="text-xs mt-1">Left</div>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      movePiece('down');
                    }}
                    className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:scale-95 p-4 rounded-lg text-center font-bold select-none shadow-lg text-white transition-all duration-150"
                  >
                    <span className="text-xl">↓</span>
                    <div className="text-xs mt-1">Drop</div>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      movePiece('right');
                    }}
                    className="bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 active:scale-95 p-4 rounded-lg text-center font-bold select-none shadow-lg text-white transition-all duration-150"
                  >
                    <span className="text-xl">→</span>
                    <div className="text-xs mt-1">Right</div>
                  </button>
                </div>
                
                {/* Start Game Button - Below mobile controls */}
                <button
                  onClick={handleStartGame}
                  disabled={loading || !isConnected || isPlaying || !playerInfo?.credits || startCountdown > 0}
                  className="w-full bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 p-4 rounded-lg font-bold text-white shadow-lg transition-all duration-150"
                >
                  {startCountdown > 0 ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Starting in {startCountdown}...
                    </div>
                  ) : isPlaying ? 'Game in Progress' : 'Start Game'}
                </button>
              </div>
              
              <p className="text-xs text-gray-400 text-center mt-3">Touch controls for mobile</p>
            </div>

            {/* Desktop Instructions - Enhanced */}
            <div className="hidden xl:block bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-orange-500/30 shadow-lg">
              <h4 className="text-sm font-bold text-orange-300 mb-2 text-center">🎮 Controls</h4>
              <div className="text-sm text-gray-300 text-center space-y-1">
                <p>⬅️ ➡️ <span className="text-gray-400">Arrow keys to move</span></p>
                <p>⬆️ <span className="text-gray-400">Up arrow to rotate</span></p>
                <p>🚀 <span className="text-gray-400">Space bar to rotate</span></p>
                <p>⬇️ <span className="text-gray-400">Down arrow to drop</span></p>
              </div>
            </div>

            {/* Backup Claim Reward Button */}
            {lastGameData && (
              <div className="bg-gradient-to-br from-yellow-800 to-orange-900 p-4 rounded-xl border border-yellow-500/30 shadow-lg">
                <h4 className="text-sm font-bold text-yellow-300 mb-3 text-center">🏆 Claim Reward</h4>
                <p className="text-xs text-yellow-200 text-center mb-3">
                  Last game data available. Click if you didn't receive your reward.
                </p>
                <button
                  onClick={() => setShowBackupClaim(true)}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 p-3 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  💰 Claim Last Game Reward
                </button>
                <div className="text-xs text-yellow-300 text-center mt-2">
                  Score: {lastGameData.finalScore} • Level: {lastGameData.finalLevel} • Reward: {parseFloat(lastGameData.potentialReward).toLocaleString('tr-TR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })} ORDER
                </div>
              </div>
            )}

            {/* Quick Buy Credits - Mobile and Desktop */}
            <div className="bg-gradient-to-br from-green-800 to-emerald-900 p-4 rounded-xl border border-green-500/30 shadow-lg min-w-full">
              <h4 className="text-sm font-bold text-green-300 mb-3 text-center">⚡ Quick Buy</h4>
              <button
                onClick={async () => {
                  if (!isConnected) {
                    alert('Please connect your wallet first');
                    return;
                  }
                  
                  try {
                    await buyCredits('10000'); // 10k ORDER
                    alert('🎉 Successfully bought 1 credit with 10,000 ORDER!');
                    
                    // Refresh ORDER balance
                    const balance = await getOrderBalance();
                    setOrderBalance(balance);
                  } catch (error) {
                    console.error('Failed to buy credits:', error);
                    alert('❌ Failed to buy credits. Please try again.');
                  }
                }}
                disabled={loading || !isConnected}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 p-3 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Buying...
                  </div>
                ) : (
                  '💰 Buy 1 Credit (10k ORDER)'
                )}
              </button>
              <p className="text-xs text-green-300 text-center mt-2">Instant credit purchase</p>
            </div>

            {/* Wallet Info - Enhanced */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-orange-500/30 shadow-lg min-w-full">
              <h4 className="text-sm font-bold text-orange-300 mb-3 text-center">💰 Wallet Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">ORDER Balance:</span>
                  <span className="font-bold text-green-400">{parseFloat(orderBalance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">Status:</span>
                  <span className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? '🟢 Connected' : '🔴 Not Connected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Unclaimed Rewards Card */}
            {isConnected && (
              <div className="bg-gradient-to-br from-yellow-800 to-orange-900 p-4 rounded-xl border border-yellow-500/30 shadow-lg min-w-full">
                <h4 className="text-sm font-bold text-yellow-300 mb-3 text-center">🏆 Unclaimed Rewards</h4>
                <div className="text-xs text-yellow-200 mb-2">
                  <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
                  <div>Address: {address}</div>
                  <div>Unclaimed Count: {unclaimedRewards.length}</div>
                  <div>Loading: {unclaimedLoading ? 'Yes' : 'No'}</div>
                </div>
                {unclaimedLoading ? (
                  <div className="text-center">
                    <span className="animate-pulse text-yellow-200">Loading...</span>
                  </div>
                ) : unclaimedRewards.length > 0 ? (
                  <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                    {unclaimedRewards.map((reward, index) => (
                      <div key={reward.sessionId} className="bg-yellow-800/30 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-yellow-200 font-medium">Session #{reward.sessionId}</span>
                          <span className="text-yellow-100 font-bold">{parseFloat(reward.rewardAmount).toLocaleString('tr-TR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })} ORDER</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-yellow-300">Score: {Number(reward.score).toLocaleString()}</div>
                          <div className="text-yellow-300">Level: {reward.level}</div>
                          <div className="text-yellow-300">Lines: {reward.lines}</div>
                          <div className="text-yellow-300">Date: {reward.date}</div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              console.log('🎁 Claiming reward for session:', reward.sessionId);
                              await claimReward(Number(reward.sessionId));
                              // Refresh unclaimed rewards and player info after claim
                              await fetchUnclaimedRewards();
                              await fetchPlayerInfoData();
                            } catch (error) {
                              console.error('Failed to claim reward:', error);
                              alert('❌ Failed to claim reward. Please try again.');
                            }
                          }}
                          disabled={loading}
                          className="w-full mt-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 p-2 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed text-xs"
                        >
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                              Claiming...
                            </div>
                          ) : (
                            `🎁 Claim ${parseFloat(reward.rewardAmount).toFixed(0)} ORDER`
                          )}
                        </button>
                      </div>
                    ))}
                    <div className="text-xs text-yellow-400 text-center mt-2">
                      💡 These are rewards from completed games you haven't claimed yet
                    </div>
                  </div>
                ) : (
                  <div className="text-yellow-300 text-center">
                    🎮 No unclaimed rewards found
                  </div>
                )}
              </div>
            )}

            {/* Player Info Card - From Tetris Contract */}
            <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-4 rounded-xl border border-blue-500/30 shadow-lg min-w-full">
              <h4 className="text-sm font-bold text-blue-300 mb-3 text-center">👤 Player Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-blue-800/30 rounded-lg">
                  <span className="text-blue-200">Credits:</span>
                  <span className="font-bold text-blue-100">
                    {playerInfoLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : playerInfoData ? (
                      playerInfoData.credits
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-800/30 rounded-lg">
                  <span className="text-blue-200">High Score:</span>
                  <span className="font-bold text-blue-100">
                    {playerInfoLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : playerInfoData ? (
                      playerInfoData.highScore.toLocaleString()
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-800/30 rounded-lg">
                  <span className="text-blue-200">Games Played:</span>
                  <span className="font-bold text-blue-100">
                    {playerInfoLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : playerInfoData ? (
                      playerInfoData.gamesPlayed
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-800/30 rounded-lg">
                  <span className="text-blue-200">Total Earnings:</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-100 block">
                      {playerInfoLoading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : playerInfoData ? (
                        (() => {
                          try {
                            // Safely format the totalEarnings value
                            const earningsValue = playerInfoData.totalEarnings;
                            if (!earningsValue || earningsValue === '0') return '0 ORDER';
                            
                            const formattedEarnings = ethers.formatEther(earningsValue.toString());
                            return `${parseFloat(formattedEarnings).toLocaleString('tr-TR', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 2 
                            })} ORDER`;
                          } catch (error) {
                            console.error('Error formatting totalEarnings:', error);
                            return `${playerInfoData.totalEarnings} ORDER (raw)`;
                          }
                        })()
                      ) : (
                        'N/A'
                      )}
                    </span>
                    {(() => {
                      // Check if we should show USD value
                      if (playerInfoLoading || orderPriceLoading || !playerInfoData || !priceData?.price) {
                        return null;
                      }
                      
                      try {
                        const earningsValue = playerInfoData.totalEarnings;
                        if (!earningsValue || earningsValue === '0') return null;
                        
                        const formattedEarnings = ethers.formatEther(earningsValue.toString());
                        const earningsFloat = parseFloat(formattedEarnings);
                        
                        if (earningsFloat <= 0) return null;
                        
                        const usdValue = earningsFloat * priceData.price;
                        return (
                          <span className="text-xs text-blue-300">
                            ${usdValue.toLocaleString('tr-TR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </span>
                        );
                      } catch (error) {
                        console.error('Error calculating USD value:', error);
                        return null;
                      }
                    })()}
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-800/30 rounded-lg">
                  <span className="text-blue-200">Status:</span>
                  <span className={`font-bold ${playerInfoData?.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {playerInfoLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : playerInfoData ? (
                      playerInfoData.isActive ? '🟢 Active' : '🔴 Inactive'
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="text-xs text-blue-400 text-center">
                  📊 Live data from Tetris contract • getPlayerInfo() function
                </div>
              </div>
            </div>

            {/* Global Game Stats Card - From Tetris Contract */}
            <div className="bg-gradient-to-br from-purple-800 to-indigo-900 p-4 rounded-xl border border-purple-500/30 shadow-lg min-w-full">
              <h4 className="text-sm font-bold text-purple-300 mb-3 text-center">🌍 Global Game Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-purple-800/30 rounded-lg">
                  <span className="text-purple-200">Burned ORDER:</span>
                  <div className="text-right">
                    <span className="font-bold text-purple-100 block">
                      {gameStatsLoading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : gameStatsData ? (
                        `${parseFloat(gameStatsData.burnedOrderAmount).toLocaleString('tr-TR', { 
                          minimumFractionDigits: 0, 
                          maximumFractionDigits: 0 
                        })} ORDER`
                      ) : (
                        'N/A'
                      )}
                    </span>
                    {!gameStatsLoading && !orderPriceLoading && gameStatsData && priceData?.price && (
                      <span className="text-xs text-purple-300">
                        ${(parseFloat(gameStatsData.burnedOrderAmount) * priceData.price).toLocaleString('tr-TR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-800/30 rounded-lg">
                  <span className="text-purple-200">Total Players:</span>
                  <span className="font-bold text-purple-100">
                    {gameStatsLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : gameStatsData ? (
                      gameStatsData.totalPlayers.toLocaleString()
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-800/30 rounded-lg">
                  <span className="text-purple-200">Game Sessions:</span>
                  <span className="font-bold text-purple-100">
                    {gameStatsLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : gameStatsData ? (
                      gameStatsData.gameSessionCounter.toLocaleString()
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-800/30 rounded-lg">
                  <span className="text-purple-200">Active Games:</span>
                  <span className="font-bold text-purple-100">
                    {gameStatsLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : gameStatsData ? (
                      gameStatsData.activeGames
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="text-xs text-purple-400 text-center">
                  🎮 Global statistics • getGameStats() function
                </div>
              </div>
            </div>
          </div>

          {/* Game Info & Controls - Enhanced */}
          <div className="w-full xl:w-80 2xl:w-96 xl:flex-shrink-0 space-y-6">
            {/* Wallet Info - MOVED TO MOBILE AREA */}

            {/* Tetris Reward Pool - MOVED TO TOP */}

            {/* Claim Reward Section - HIDDEN (using pop-up instead)
            <div className="bg-gray-800 p-4 rounded-lg text-white" style={{ backgroundColor: '#2a3441' }}>
              <h3 className="text-lg font-bold mb-2">Claim Reward</h3>
              <p className="text-sm text-gray-300 mb-3">Claim rewards from your last game session</p>
              <div className="space-y-2">
                <div className="bg-gray-700 p-2 rounded">
                  <label className="block text-xs font-medium mb-1">Last Session ID:</label>
                  <div className="text-sm font-mono">
                    {lastSessionId ? lastSessionId : 'Checking...'}
                  </div>
                </div>
                
                <div className="bg-gray-700 p-2 rounded">
                  <label className="block text-xs font-medium mb-1">Claimable Reward:</label>
                  <div className="text-sm font-mono text-green-400">
                    {claimableRewardAmount && parseFloat(claimableRewardAmount) > 0 
                      ? `${parseFloat(claimableRewardAmount).toFixed(4)} ORDER` 
                      : 'Checking...'}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!lastSessionId) {
                      alert('No session ID available');
                      return;
                    }
                    
                    try {
                      await claimReward(lastSessionId);
                      // Başarılı claim sonrası session ID'yi temizle
                      setLastSessionId(null);
                      setClaimableRewardAmount('0');
                      alert('Reward claimed successfully!');
                    } catch (error) {
                      console.error('Failed to claim reward:', error);
                      alert('Failed to claim reward or already claimed');
                    }
                  }}
                  disabled={loading || !isConnected || !lastSessionId}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 p-2 rounded font-bold"
                >
                  {loading ? 'Claiming...' : 'Claim Reward'}
                </button>
                <p className="text-xs text-gray-400">Contract: claimReward(uint256 _sessionId)</p>
              </div>
            </div>
            */}

            {/* Submit Failed Game Section */}
            {failedEndGameSession && (
              <div className="bg-red-900 p-4 rounded-lg text-white" style={{ backgroundColor: '#3a1a1a' }}>
                <h3 className="text-lg font-bold mb-2">⚠️ Submit Failed Game</h3>
                <p className="text-sm text-gray-300 mb-3">Retry submitting your last game session that failed</p>
                <div className="space-y-2">
                  <div className="bg-red-800 p-2 rounded">
                    <label className="block text-xs font-medium mb-1">Session ID:</label>
                    <div className="text-sm font-mono">
                      {failedEndGameSession.sessionId}
                    </div>
                  </div>
                  
                  <div className="bg-red-800 p-2 rounded">
                    <label className="block text-xs font-medium mb-1">Game Stats:</label>
                    <div className="text-sm font-mono">
                      Score: {failedEndGameSession.score} | Level: {failedEndGameSession.level} | Lines: {failedEndGameSession.lines}
                    </div>
                  </div>
                  
                  <div className="bg-red-800 p-2 rounded">
                    <label className="block text-xs font-medium mb-1">Game Hash:</label>
                    <div className="text-xs font-mono break-all">
                      {failedEndGameSession.gameHash}
                    </div>
                  </div>
                  
                  <div className="bg-red-800 p-2 rounded">
                    <label className="block text-xs font-medium mb-1">Potential Reward:</label>
                    <div className="text-sm font-mono text-green-400">
                      {failedEndGameSession.potentialReward} ORDER
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (!failedEndGameSession) return;
                      
                      try {
                        await endGame(
                          failedEndGameSession.sessionId,
                          failedEndGameSession.score,
                          failedEndGameSession.level,
                          failedEndGameSession.lines
                        );
                        
                        // Başarılı submission sonrası backup'ı temizle
                        setFailedEndGameSession(null);
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('tetris_failed_endgame_session');
                        }
                        
                        alert(`Game submitted successfully! Reward: ${failedEndGameSession.potentialReward} ORDER`);
                      } catch (error) {
                        console.error('Failed to submit failed game:', error);
                        alert('Failed to submit game. Please try again or contact support.');
                      }
                    }}
                    disabled={loading || !isConnected}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 p-2 rounded font-bold"
                  >
                    {loading ? 'Submitting...' : 'Retry Submit Game'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setFailedEndGameSession(null);
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('tetris_failed_endgame_session');
                      }
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 p-1 rounded text-sm"
                  >
                    Clear Failed Session
                  </button>
                  
                  <p className="text-xs text-gray-400">Contract: endGame(uint256 _sessionId, uint256 _score, uint256 _level, uint256 _lines, bytes32 _gameHash, uint8 _v, bytes32 _r, bytes32 _s)</p>
                </div>
              </div>
            )}

            {/* End Game Section - HIDDEN (using pop-up instead) 
            <div className="bg-gray-800 p-4 rounded-lg text-white" style={{ backgroundColor: '#2a3441' }}>
              <h3 className="text-lg font-bold mb-2">End Game</h3>
              <p className="text-sm text-gray-300 mb-3">Submit your last game session to blockchain</p>
              <div className="space-y-2">
                <div className="bg-gray-700 p-2 rounded">
                  <label className="block text-xs font-medium mb-1">Pending Session ID:</label>
                  <div className="text-sm font-mono">
                    {pendingEndGameSession ? pendingEndGameSession.sessionId : 'No pending session'}
                  </div>
                </div>
                
                {pendingEndGameSession && (
                  <>
                    <div className="bg-gray-700 p-2 rounded">
                      <label className="block text-xs font-medium mb-1">Final Score:</label>
                      <div className="text-sm font-mono text-blue-400">
                        {pendingEndGameSession.score.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 p-2 rounded">
                      <label className="block text-xs font-medium mb-1">Level & Lines:</label>
                      <div className="text-sm font-mono text-purple-400">
                        Level {pendingEndGameSession.level} • {pendingEndGameSession.lines} lines
                      </div>
                    </div>
                  </>
                )}
                
                <button
                  onClick={async () => {
                    if (!pendingEndGameSession) {
                      alert('No pending session to submit');
                      return;
                    }
                    
                    try {
                      await endGame(
                        pendingEndGameSession.sessionId,
                        pendingEndGameSession.score,
                        pendingEndGameSession.level,
                        pendingEndGameSession.lines
                      );
                      localStorage.removeItem('tetris_pending_endgame');
                      setPendingEndGameSession(null);
                      setLastGameData(null); // Clear backup claim data after successful submit
                      alert('Game session submitted successfully!');
                    } catch (error) {
                      console.error('Failed to submit game session:', error);
                      alert('Failed to submit game session');
                    }
                  }}
                  disabled={loading || !isConnected || !pendingEndGameSession}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 p-2 rounded font-bold"
                >
                  {loading ? 'Submitting...' : 'Submit Game to Blockchain'}
                </button>
                <p className="text-xs text-gray-400">Contract: endGame(uint256 _sessionId, uint256 _score, uint256 _level, uint256 _lines, bytes32 _gameHash, uint8 _v, bytes32 _r, bytes32 _s)</p>
              </div>
            </div>
            */}

            {/* Credits Section - HIDDEN (using pop-up instead)
            <div className="bg-gray-800 p-4 rounded-lg text-white" style={{ backgroundColor: '#2a3441' }}>
              <h3 className="text-lg font-bold mb-2">Buy Credits</h3>
              <div className="space-y-2">
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
                  placeholder="ORDER amount"
                />
                <button
                  onClick={handleBuyCredits}
                  disabled={loading || !isConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-2 rounded font-bold"
                >
                  {loading ? 'Buying...' : `Buy Credits (${creditAmount} ORDER = ${Math.floor(parseFloat(creditAmount) / 10000)} credits)`}
                </button>
                <p className="text-xs text-gray-400">10,000 ORDER = 1 game credit</p>
              </div>
            </div>
            */}

            {/* Add Reward to Pool - HIDDEN (not needed in game interface)
            <div className="bg-gray-800 p-4 rounded-lg text-white" style={{ backgroundColor: '#2a3441' }}>
              <h3 className="text-lg font-bold mb-2">Add Reward to Pool</h3>
              <p className="text-sm text-gray-300 mb-2">Help increase the reward pool for all players!</p>
              <div className="space-y-2">
                <input
                  type="number"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  className="w-full bg-gray-700 text-white p-2 rounded"
                  placeholder="Amount in ORDER"
                  min="1"
                />
                <button
                  onClick={handleAddReward}
                  disabled={loading || !isConnected}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 p-2 rounded font-bold"
                >
                  {loading ? 'Adding...' : `Add ${rewardAmount} ORDER to Pool`}
                </button>
                <p className="text-xs text-gray-400">Directly increases reward pool for everyone</p>
              </div>
            </div>
            */}

            {/* Game Controls - Hidden because controls are already in the game area */}
            {/* 
            <div className="bg-gray-800 p-4 rounded-lg text-white" style={{ backgroundColor: '#2a3441' }}>
              <h3 className="text-lg font-bold mb-2">Game Controls</h3>
              <div className="space-y-2">
                <button
                  onClick={handleStartGame}
                  disabled={loading || !isConnected || isPlaying || !playerInfo?.credits || startCountdown > 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 p-2 rounded font-bold"
                >
                  {startCountdown > 0 ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Starting in {startCountdown}...
                    </div>
                  ) : isPlaying ? 'Game in Progress' : 'Start Game'}
                </button>
                
                {isPlaying && (
                  <button
                    onClick={handleEndGame}
                    className="w-full bg-red-600 hover:bg-red-700 p-2 rounded font-bold"
                  >
                    End Game
                  </button>
                )}
              </div>
            </div>
            */}

            {/* Arena SDK Debug Panel - Development Only */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-800 p-4 rounded-lg text-white border border-blue-500/30">
                <h3 className="text-lg font-bold mb-2 text-blue-300">🔧 Arena SDK Debug</h3>
                <div className="text-sm space-y-1">
                  <p>Is In Arena: <span className={isInArena ? 'text-green-400' : 'text-red-400'}>{isInArena ? 'Yes' : 'No'}</span></p>
                  <p>SDK Available: <span className={sdk ? 'text-green-400' : 'text-red-400'}>{sdk ? 'Yes' : 'No'}</span></p>
                  <p>Provider Available: <span className={sdk?.provider ? 'text-green-400' : 'text-red-400'}>{sdk?.provider ? 'Yes' : 'No'}</span></p>
                  <p>Wallet Connected: <span className={isConnected ? 'text-green-400' : 'text-red-400'}>{isConnected ? 'Yes' : 'No'}</span></p>
                  <p>Address: <span className="text-gray-300">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}</span></p>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-900 text-red-200 p-4 rounded-lg">
                <h3 className="font-bold">Error</h3>
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* End Game Details Modal */}
        {showEndGameDetails && endGameDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-white">End Game Details</h3>
              
              <div className="space-y-3 mb-6 text-white">
                <div className="bg-gray-800 p-3 rounded">
                  <label className="block text-sm font-medium mb-1">Session ID:</label>
                  <input 
                    type="text" 
                    value={endGameDetails.sessionId} 
                    readOnly 
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                
                <div className="bg-gray-800 p-3 rounded">
                  <label className="block text-sm font-medium mb-1">Score:</label>
                  <input 
                    type="text" 
                    value={endGameDetails.score} 
                    readOnly 
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                
                <div className="bg-gray-800 p-3 rounded">
                  <label className="block text-sm font-medium mb-1">Level:</label>
                  <input 
                    type="text" 
                    value={endGameDetails.level} 
                    readOnly 
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                
                <div className="bg-gray-800 p-3 rounded">
                  <label className="block text-sm font-medium mb-1">Lines:</label>
                  <input 
                    type="text" 
                    value={endGameDetails.lines} 
                    readOnly 
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                
                <div className="bg-gray-800 p-3 rounded">
                  <label className="block text-sm font-medium mb-1">Game Hash:</label>
                  <textarea 
                    value={endGameDetails.gameHash} 
                    readOnly 
                    rows={3}
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 text-xs font-mono"
                  />
                </div>

                <div className="bg-blue-900 p-3 rounded text-sm">
                  <h4 className="font-bold mb-2">Smart Contract Parameters:</h4>
                  <div className="space-y-1 font-mono text-xs">
                    <div>endGame(uint256 _sessionId, uint256 _score, uint256 _level, uint256 _lines, bytes32 _gameHash, uint8 _v, bytes32 _r, bytes32 _s)</div>
                    <div className="mt-2 text-gray-300">
                      • _v, _r, _s are signature parameters (set to 0 for now)<br/>
                      • _gameHash is calculated automatically from game data
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={async () => {
                    try {
                      await endGame(
                        endGameDetails.sessionId,
                        endGameDetails.score,
                        endGameDetails.level,
                        endGameDetails.lines
                      );
                      setShowEndGameDetails(false);
                      setEndGameDetails(null);
                      sessionIdRef.current = null;
                      alert('Game ended successfully!');
                    } catch (error) {
                      console.error('Failed to end game:', error);
                      alert('Failed to end game');
                    }
                  }}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 p-2 rounded font-bold text-white"
                >
                  {loading ? 'Ending Game...' : 'Submit to Blockchain'}
                </button>
                
                <button
                  onClick={() => {
                    setShowEndGameDetails(false);
                    setEndGameDetails(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 p-2 rounded font-bold text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Game Over Modal */}
        {gameOverModal && sessionStats && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // Prevent closing if submit is in progress
              if (isSubmitLoading) {
                e.preventDefault();
                e.stopPropagation();
                alert('Please wait for the current operation to complete');
                return;
              }
              // Only close if clicking the backdrop, not the modal content
              if (e.target === e.currentTarget) {
                console.log('🚪 Closing game over modal via backdrop');
                setGameOverModal(false);
                setSessionStats(null);
                setShowSubmitScore(false);
              }
            }}
          >
            <div 
              className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl max-w-lg w-full border-2 border-orange-500/30 shadow-2xl shadow-orange-500/20"
              onClick={(e) => e.stopPropagation()} // Prevent modal content clicks from bubbling
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-3">🎮</div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
                  Game Over!
                </h3>
                <p className="text-gray-400">Here are your final results</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Final Score:</span>
                    <span className="font-bold text-green-400 text-xl">{sessionStats.finalScore.toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-600/30">
                    <div className="text-gray-400 text-sm">Level Reached</div>
                    <div className="font-bold text-blue-400">{sessionStats.finalLevel}</div>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-600/30">
                    <div className="text-gray-400 text-sm">Lines Cleared</div>
                    <div className="font-bold text-purple-400">{sessionStats.finalLines}</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-800/30 to-emerald-800/30 p-4 rounded-lg border border-green-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-green-300">Potential Reward:</span>
                    <span className="font-bold text-green-400 text-xl">
                      {parseFloat(sessionStats.potentialReward).toLocaleString('tr-TR', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} ORDER 🪙
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Debug info for troubleshooting */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 p-2 bg-gray-800/30 rounded">
                    Debug: showSubmitScore={showSubmitScore.toString()}, sessionId={sessionStats.sessionId}, reward={sessionStats.potentialReward}
                  </div>
                )}
                
                {/* Submit button with improved conditions */}
                {showSubmitScore && sessionStats.sessionId !== 0 && parseFloat(sessionStats.potentialReward) > 0 ? (
                  <div className="space-y-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔥 Submit button clicked! Session:', sessionStats);
                        console.log('🔥 Is Submit Loading:', isSubmitLoading);
                        console.log('🔥 HandleSubmitScore function:', typeof handleSubmitScore);
                        handleSubmitScore();
                      }}
                      disabled={isSubmitLoading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 p-4 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                    >
                      {isSubmitLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          Submitting...
                        </div>
                      ) : (
                        `🚀 Submit & Earn ${parseFloat(sessionStats.potentialReward).toLocaleString('tr-TR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })} ORDER (No Confirmation)`
                      )}
                    </button>
                    
                    {/* Separate Claim Reward Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎁 Claim reward button clicked for session:', sessionStats.sessionId);
                        handleClaimReward();
                      }}
                      disabled={isSubmitLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 p-3 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                    >
                      {isSubmitLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Processing...
                        </div>
                      ) : (
                        `🎁 Instant Claim (No Confirmation)`
                      )}
                    </button>
                  </div>
                ) : showClaimOnly && sessionStats && sessionStats.sessionId !== 0 ? (
                  /* Show only claim button after successful submit */
                  <div className="space-y-3">
                    <div className="w-full bg-green-800/50 p-4 rounded-lg border border-green-500/30">
                      <div className="text-center text-green-300">
                        <div className="text-2xl mb-2">✅</div>
                        <div className="font-bold mb-1">Score Submitted!</div>
                        <div className="text-sm">Your score has been submitted to the blockchain. Click below to claim your reward.</div>
                      </div>
                    </div>
                    
                    {/* Only Claim Reward Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎁 Claim reward button clicked for session:', sessionStats.sessionId);
                        handleClaimReward();
                      }}
                      disabled={isSubmitLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 p-4 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                    >
                      {isSubmitLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          Claiming...
                        </div>
                      ) : (
                        `🎁 Claim ${parseFloat(sessionStats.potentialReward).toLocaleString('tr-TR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })} ORDER Reward`
                      )}
                    </button>
                  </div>
                ) : sessionStats.sessionId === 0 ? (
                  <div className="w-full bg-red-800/50 p-4 rounded-lg border border-red-500/30">
                    <div className="text-center text-red-300">
                      <div className="text-2xl mb-2">⚠️</div>
                      <div className="font-bold mb-1">No Valid Session</div>
                      <div className="text-sm">Game session not found. Score cannot be submitted.</div>
                    </div>
                  </div>
                ) : parseFloat(sessionStats.potentialReward) <= 0 ? (
                  <div className="w-full bg-yellow-800/50 p-4 rounded-lg border border-yellow-500/30">
                    <div className="text-center text-yellow-300">
                      <div className="text-2xl mb-2">🏁</div>
                      <div className="font-bold mb-1">No Reward Available</div>
                      <div className="text-sm">Level {sessionStats.finalLevel} doesn't qualify for rewards. Reach level 10+ to earn ORDER tokens!</div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-gray-800/50 p-4 rounded-lg border border-gray-500/30">
                    <div className="text-center text-gray-300">
                      <div className="text-2xl mb-2">🎮</div>
                      <div className="font-bold mb-1">Submission Not Available</div>
                      <div className="text-sm">Unable to submit score at this time.</div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    if (isSubmitLoading) {
                      alert('Please wait for the current operation to complete');
                      return;
                    }
                    console.log('🚪 Closing game over modal');
                    setGameOverModal(false);
                    setSessionStats(null);
                    setShowSubmitScore(false);
                  }}
                  disabled={isSubmitLoading}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:from-gray-500 disabled:to-gray-600 p-3 rounded-lg font-bold text-white transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {isSubmitLoading ? 'Processing...' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backup Claim Reward Modal */}
        {showBackupClaim && lastGameData && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black p-6 rounded-2xl border-2 border-orange-500/30 shadow-2xl max-w-md w-full relative">
              {/* Modal Header */}
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
                  🎮
                </div>
                <h2 className="text-2xl font-bold text-orange-400 mb-2">Claim Reward!</h2>
                <p className="text-gray-300 text-sm">Your last game data is available for claiming</p>
              </div>

              {/* Game Results */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">Final Score:</span>
                  <span className="font-bold text-green-400">{lastGameData.finalScore.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700/30 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm text-gray-400">Level Reached</div>
                    <div className="text-blue-400 font-semibold">{lastGameData.finalLevel}</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-sm text-gray-400">Lines Cleared</div>
                    <div className="text-purple-400 font-semibold">{lastGameData.finalLines}</div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-800/30 to-emerald-800/30 border border-green-500/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-green-300 font-medium">Potential Reward:</div>
                    <div className="text-green-400 font-bold text-xl">{parseFloat(lastGameData.potentialReward).toLocaleString('tr-TR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} ORDER 💰</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    // Use the same submit score logic but with lastGameData
                    console.log('🏆 Claiming backup reward:', lastGameData);
                    
                    // Set sessionStats from lastGameData for compatibility with existing submit logic
                    setSessionStats({
                      sessionId: lastGameData.sessionId,
                      finalScore: lastGameData.finalScore,
                      finalLevel: lastGameData.finalLevel,
                      finalLines: lastGameData.finalLines,
                      potentialReward: lastGameData.potentialReward
                    });
                    
                    // Close backup modal
                    setShowBackupClaim(false);
                    
                    // Show the original game over modal for submission
                    setGameOverModal(true);
                    setShowSubmitScore(true);
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 p-3 rounded-lg font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  🚀 Submit Score & Claim Reward
                </button>
                <button
                  onClick={() => setShowBackupClaim(false)}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 p-3 rounded-lg font-bold text-white transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TetrisGame;