import { useMemo } from 'react';
import { SMA, EMA, RSI, MACD, BollingerBands } from 'technicalindicators';
import { Timeframe, SignalType } from './useSignals';
import { PairData } from './useSignals';

interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export const useTechnicalAnalysis = (
  pairData: PairData | null,
  currentPrice: number,
  timeframe: Timeframe
) => {
  return useMemo(() => {
    if (!pairData || !currentPrice) {
      return null;
    }

    // Generate price history based on current price and volatility
    // In production, you'd fetch real historical data
    const generatePriceHistory = (periods: number): number[] => {
      const prices: number[] = [];
      let price = currentPrice;
      
      // Parse price changes for trend
      const h1Change = parseFloat(pairData.priceChange?.h1 || '0');
      const h24Change = parseFloat(pairData.priceChange?.h24 || '0');
      
      const trend = (h1Change + h24Change) / 2;
      const volatility = 0.02; // 2% volatility
      
      for (let i = periods; i > 0; i--) {
        const randomChange = (Math.random() - 0.5) * volatility;
        const trendInfluence = (trend / 100) * 0.1; // Small trend influence
        price = price * (1 + randomChange + trendInfluence);
        prices.unshift(price);
      }
      
      prices.push(currentPrice);
      return prices;
    };

    try {
      const prices = generatePriceHistory(100); // Last 100 periods
      
      // Calculate SMA
      const sma20Result = SMA.calculate({ period: 20, values: prices });
      const sma50Result = SMA.calculate({ period: 50, values: prices });
      
      // Calculate EMA
      const ema12Result = EMA.calculate({ period: 12, values: prices });
      const ema26Result = EMA.calculate({ period: 26, values: prices });
      
      // Calculate RSI
      const rsiResult = RSI.calculate({ period: 14, values: prices });
      
      // Calculate MACD
      const macdResult = MACD.calculate({
        values: prices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });
      
      // Calculate Bollinger Bands
      const bbResult = BollingerBands.calculate({
        period: 20,
        values: prices,
        stdDev: 2
      });

      const indicators: TechnicalIndicators = {
        sma20: sma20Result[sma20Result.length - 1] || currentPrice,
        sma50: sma50Result[sma50Result.length - 1] || currentPrice,
        ema12: ema12Result[ema12Result.length - 1] || currentPrice,
        ema26: ema26Result[ema26Result.length - 1] || currentPrice,
        rsi: rsiResult[rsiResult.length - 1] || 50,
        macd: {
          macd: macdResult[macdResult.length - 1]?.MACD || 0,
          signal: macdResult[macdResult.length - 1]?.signal || 0,
          histogram: macdResult[macdResult.length - 1]?.histogram || 0
        },
        bollingerBands: bbResult[bbResult.length - 1] || { 
          upper: currentPrice * 1.02, 
          middle: currentPrice, 
          lower: currentPrice * 0.98 
        }
      };

      return indicators;
    } catch (error) {
      console.error('Technical analysis calculation error:', error);
      return null;
    }
  }, [pairData, currentPrice, timeframe]);
};

export const generateTechnicalSignals = (
  indicators: TechnicalIndicators | null,
  currentPrice: number,
  timeframe: Timeframe
): { score: number; reasons: string[] } => {
  if (!indicators) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];

  // 1. Moving Average Crossovers
  if (currentPrice > indicators.sma20) {
    score += 15;
    reasons.push('📈 Price above SMA(20)');
  } else {
    score -= 15;
    reasons.push('📉 Price below SMA(20)');
  }

  if (currentPrice > indicators.sma50) {
    score += 10;
    reasons.push('✅ Price above SMA(50) - uptrend');
  } else {
    score -= 10;
    reasons.push('⚠️ Price below SMA(50) - downtrend');
  }

  // 2. EMA Golden/Death Cross
  if (indicators.ema12 > indicators.ema26) {
    score += 20;
    reasons.push('🌟 Golden Cross: EMA(12) > EMA(26)');
  } else {
    score -= 20;
    reasons.push('💀 Death Cross: EMA(12) < EMA(26)');
  }

  // 3. RSI Analysis
  const rsi = indicators.rsi;
  if (rsi < 30) {
    score += 25;
    reasons.push(`🔥 RSI Oversold (${rsi.toFixed(1)}) - buy opportunity`);
  } else if (rsi > 70) {
    score -= 25;
    reasons.push(`❄️ RSI Overbought (${rsi.toFixed(1)}) - sell signal`);
  } else if (rsi >= 45 && rsi <= 55) {
    reasons.push(`⚖️ RSI Neutral (${rsi.toFixed(1)})`);
  } else if (rsi > 55) {
    score += 10;
    reasons.push(`📊 RSI Bullish (${rsi.toFixed(1)})`);
  } else {
    score -= 10;
    reasons.push(`📊 RSI Bearish (${rsi.toFixed(1)})`);
  }

  // 4. MACD Analysis
  const macd = indicators.macd;
  if (macd.histogram > 0) {
    score += 15;
    reasons.push('🎯 MACD Bullish Histogram');
  } else {
    score -= 15;
    reasons.push('🎯 MACD Bearish Histogram');
  }

  if (macd.macd > macd.signal) {
    score += 15;
    reasons.push('✨ MACD above Signal line');
  } else {
    score -= 15;
    reasons.push('✨ MACD below Signal line');
  }

  // 5. Bollinger Bands
  const bb = indicators.bollingerBands;
  const pricePosition = (currentPrice - bb.lower) / (bb.upper - bb.lower);
  
  if (pricePosition < 0.2) {
    score += 20;
    reasons.push('📍 Price near Lower BB - oversold');
  } else if (pricePosition > 0.8) {
    score -= 20;
    reasons.push('📍 Price near Upper BB - overbought');
  } else if (pricePosition >= 0.4 && pricePosition <= 0.6) {
    reasons.push('📍 Price at BB Middle - neutral');
  }

  // 6. Volatility Squeeze (Bollinger Bands width)
  const bbWidth = (bb.upper - bb.lower) / bb.middle;
  if (bbWidth < 0.04) {
    score += 12;
    reasons.push('💥 Low volatility - breakout expected');
  }

  return { score, reasons };
};
