// Mock remaining tokens implementation for Arena-only approach
export const useRemainingTokens = () => {
  // Mock realistic remaining token amounts
  const mockRemaining = {
    ORDER: 2845671.23,
    xORDER: 1000000000, // 1 milyar xORDER remaining (100 milyar total supply'ın %1'i)
    WITCH: 1456783.89,
    KOKSAL: 987654.32,
    STANK: 3456789.01
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return {
    ORDER: {
      remaining: mockRemaining.ORDER,
      formatted: formatAmount(mockRemaining.ORDER)
    },
    xORDER: {
      remaining: mockRemaining.xORDER,
      formatted: formatAmount(mockRemaining.xORDER)
    },
    WITCH: {
      remaining: mockRemaining.WITCH,
      formatted: formatAmount(mockRemaining.WITCH)
    },
    KOKSAL: {
      remaining: mockRemaining.KOKSAL,
      formatted: formatAmount(mockRemaining.KOKSAL)
    },
    STANK: {
      remaining: mockRemaining.STANK,
      formatted: formatAmount(mockRemaining.STANK)
    }
  };
};
