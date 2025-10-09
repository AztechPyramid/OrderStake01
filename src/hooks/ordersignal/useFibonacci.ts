import { useMemo } from 'react';

export interface FibonacciLevel {
  level: number;
  price: number;
  type: 'support' | 'resistance';
  strength: 'weak' | 'medium' | 'strong';
  label: string;
}

export interface FibonacciData {
  supports: FibonacciLevel[];
  resistances: FibonacciLevel[];
  currentPrice: number;
  high24h: number;
  low24h: number;
}

export const useFibonacci = (currentPrice: number, high24h: number, low24h: number): FibonacciData => {
  return useMemo(() => {
    if (!currentPrice || !high24h || !low24h) {
      return {
        supports: [],
        resistances: [],
        currentPrice: 0,
        high24h: 0,
        low24h: 0
      };
    }

    const range = high24h - low24h;
    
    // Fibonacci retracement levels (for supports - below current price)
    // Strength based on trading significance:
    // - Golden ratios (61.8%, 78.6%, 88.6%) are STRONG
    // - Psychological level (50%) is STRONG
    // - Mid-levels (38.2%) are MEDIUM
    // - Shallow levels (23.6%) are WEAK
    const retracementLevels = [
      { level: 0.236, label: '23.6%', strength: 'weak' as const },
      { level: 0.382, label: '38.2%', strength: 'medium' as const },
      { level: 0.5, label: '50%', strength: 'strong' as const },      // Psychological
      { level: 0.618, label: '61.8%', strength: 'strong' as const },  // Golden Ratio
      { level: 0.786, label: '78.6%', strength: 'strong' as const },  // Deep retracement
      { level: 0.886, label: '88.6%', strength: 'strong' as const }   // Very deep - last support
    ];

    // Fibonacci extension levels for resistance (inverted retracement from current to high)
    // Using same percentages as support but calculating upwards
    const resistanceLevels = [
      { level: 0.236, label: '23.6%', strength: 'weak' as const },
      { level: 0.382, label: '38.2%', strength: 'medium' as const },
      { level: 0.5, label: '50%', strength: 'strong' as const },
      { level: 0.618, label: '61.8%', strength: 'strong' as const },
      { level: 0.786, label: '78.6%', strength: 'strong' as const },
      { level: 0.886, label: '88.6%', strength: 'strong' as const }
    ];

    // Calculate support levels (retracement from high to low)
    const supports: FibonacciLevel[] = retracementLevels
      .map(fib => ({
        level: fib.level,
        price: high24h - (range * fib.level),
        type: 'support' as const,
        strength: fib.strength,
        label: fib.label
      }))
      .filter(level => level.price < currentPrice)
      .sort((a, b) => b.price - a.price);

    // Calculate resistance levels (extension from current to high)
    // Use the range from current price to high, then apply Fibonacci levels upward
    const upwardRange = high24h - currentPrice;
    const resistances: FibonacciLevel[] = resistanceLevels
      .map(fib => ({
        level: fib.level,
        price: currentPrice + (upwardRange * fib.level),
        type: 'resistance' as const,
        strength: fib.strength,
        label: fib.label
      }))
      .filter(level => level.price > currentPrice && level.price > currentPrice * 1.01) // At least 1% above current
      .sort((a, b) => a.price - b.price);

    return {
      supports,
      resistances,
      currentPrice,
      high24h,
      low24h
    };
  }, [currentPrice, high24h, low24h]);
};
