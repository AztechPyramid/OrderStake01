/**
 * Date to Block Number Converter for Avalanche C-Chain
 * Average block time: ~2 seconds
 */

export interface BlockTimeInfo {
  currentBlock: number;
  currentTimestamp: number;
  avgBlockTime: number; // seconds
}

/**
 * Get current block info from provider
 */
export const getCurrentBlockInfo = async (provider: any): Promise<BlockTimeInfo> => {
  try {
    const currentBlock = await provider.getBlockNumber();
    const blockData = await provider.getBlock(currentBlock);
    
    // Avalanche average block time is ~2 seconds
    const avgBlockTime = 2;
    
    return {
      currentBlock,
      currentTimestamp: blockData.timestamp,
      avgBlockTime
    };
  } catch (error) {
    console.error('Error getting block info:', error);
    // Fallback values
    const now = Math.floor(Date.now() / 1000);
    return {
      currentBlock: 0,
      currentTimestamp: now,
      avgBlockTime: 2
    };
  }
};

/**
 * Convert date to approximate block number
 */
export const dateToBlockNumber = (
  targetDate: Date,
  blockInfo: BlockTimeInfo
): number => {
  const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
  const timeDiff = targetTimestamp - blockInfo.currentTimestamp;
  const blockDiff = Math.floor(timeDiff / blockInfo.avgBlockTime);
  
  return Math.max(blockInfo.currentBlock + blockDiff, blockInfo.currentBlock + 1);
};

/**
 * Convert block number to approximate date
 */
export const blockNumberToDate = (
  blockNumber: number,
  blockInfo: BlockTimeInfo
): Date => {
  const blockDiff = blockNumber - blockInfo.currentBlock;
  const timeDiff = blockDiff * blockInfo.avgBlockTime;
  const targetTimestamp = (blockInfo.currentTimestamp + timeDiff) * 1000;
  
  return new Date(targetTimestamp);
};

/**
 * Get suggested dates (start: +1 hour, end: +1 week)
 */
export const getSuggestedDates = () => {
  const now = new Date();
  const startDate = new Date(now.getTime() + 1 * 60 * 60 * 1000); // +1 hour
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +1 week
  
  return { startDate, endDate };
};

/**
 * Format date for HTML datetime-local input
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Parse datetime-local input to Date
 */
export const parseDateFromInput = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Validate date range
 */
export const validateDateRange = (startDate: Date, endDate: Date): string | null => {
  const now = new Date();
  
  if (startDate <= now) {
    return 'Start date must be in the future';
  }
  
  if (endDate <= startDate) {
    return 'End date must be after start date';
  }
  
  const minDuration = 1 * 60 * 60 * 1000; // 1 hour
  if (endDate.getTime() - startDate.getTime() < minDuration) {
    return 'Pool duration must be at least 1 hour';
  }
  
  const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year
  if (endDate.getTime() - startDate.getTime() > maxDuration) {
    return 'Pool duration cannot exceed 1 year';
  }
  
  return null;
};

/**
 * Calculate pool duration info
 */
export const calculatePoolDuration = (startDate: Date, endDate: Date) => {
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.floor(durationMs / (24 * 60 * 60 * 1000));
  const durationHours = Math.floor((durationMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  const totalBlocks = Math.floor(durationMs / (1000 * 2)); // ~2 seconds per block
  
  return {
    days: durationDays,
    hours: durationHours,
    totalBlocks,
    durationText: durationDays > 0 
      ? `${durationDays} days ${durationHours} hours`
      : `${durationHours} hours`
  };
};