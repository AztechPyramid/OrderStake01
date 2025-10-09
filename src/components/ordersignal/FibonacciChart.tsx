import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, ColorType, CandlestickData, Time } from 'lightweight-charts';
import { FibonacciLevel } from '@/hooks/ordersignal/useFibonacci';
import { Timeframe } from '@/hooks/ordersignal/useSignals';

interface FibonacciChartProps {
  currentPrice: number;
  supports: FibonacciLevel[];
  resistances: FibonacciLevel[];
  timeframe: Timeframe;
  tokenSymbol: string;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const FibonacciChart: React.FC<FibonacciChartProps> = ({
  currentPrice,
  supports,
  resistances,
  timeframe,
  tokenSymbol,
  onTimeframeChange
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const [chartData, setChartData] = useState<CandlestickData<Time>[]>([]);

  // Generate realistic OHLC data based on current price and timeframe
  useEffect(() => {
    if (!currentPrice) return;

    const generateCandles = () => {
      const candles = [];
      const now = Date.now() / 1000;
      
      // Determine interval in seconds based on timeframe
      let interval: number;
      let count: number;
      
      switch (timeframe) {
        case '15m':
          interval = 15 * 60;
          count = 96; // 24 hours
          break;
        case '1H':
          interval = 60 * 60;
          count = 168; // 7 days
          break;
        case '4H':
          interval = 4 * 60 * 60;
          count = 180; // 30 days
          break;
        case '1D':
          interval = 24 * 60 * 60;
          count = 90; // 90 days
          break;
        case '1W':
          interval = 7 * 24 * 60 * 60;
          count = 52; // 1 year
          break;
        default:
          interval = 60 * 60;
          count = 168;
      }

      let price = currentPrice * 0.85; // Start from lower price
      const volatility = currentPrice * 0.02; // 2% volatility

      for (let i = 0; i < count; i++) {
        const time = (now - (count - i) * interval) as any;
        
        // Trend towards current price
        const trendForce = (currentPrice - price) * 0.05;
        const randomChange = (Math.random() - 0.5) * volatility;
        
        const open = price;
        price += trendForce + randomChange;
        
        const high = price + Math.random() * volatility * 0.5;
        const low = price - Math.random() * volatility * 0.5;
        const close = open + (Math.random() - 0.5) * volatility;
        
        price = close;

        candles.push({
          time,
          open: Math.max(open, 0.000001),
          high: Math.max(high, open, close, 0.000001),
          low: Math.max(Math.min(low, open, close), 0.000001),
          close: Math.max(close, 0.000001)
        });
      }

      // Ensure last candle is at current price
      const lastCandle = candles[candles.length - 1];
      lastCandle.close = currentPrice;
      lastCandle.high = Math.max(lastCandle.high, currentPrice);
      lastCandle.low = Math.min(lastCandle.low, currentPrice);

      return candles;
    };

    setChartData(generateCandles());
  }, [currentPrice, timeframe]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || typeof window === 'undefined') return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
    });

    try {
      // Use addSeries with type parameter for newer versions of lightweight-charts
      const candlestickSeries = chart.addSeries('Candlestick' as any, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
    } catch (error) {
      console.error('Failed to create candlestick series:', error);
      // Fallback: try old API
      try {
        const candlestickSeries = (chart as any).addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });
        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;
      } catch (fallbackError) {
        console.error('Chart creation failed:', fallbackError);
        return;
      }
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data and Fibonacci levels
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || chartData.length === 0) return;

    candlestickSeriesRef.current.setData(chartData);

    // Add Fibonacci price lines
    // Current price line
    candlestickSeriesRef.current.createPriceLine({
      price: currentPrice,
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'Current',
    });

    // Support levels (green)
    supports.forEach((support) => {
      candlestickSeriesRef.current?.createPriceLine({
        price: support.price,
        color: support.strength === 'strong' ? '#10b981' : 
               support.strength === 'medium' ? '#34d399' : '#6ee7b7',
        lineWidth: support.strength === 'strong' ? 2 : 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: support.label,
      });
    });

    // Resistance levels (red)
    resistances.forEach((resistance) => {
      candlestickSeriesRef.current?.createPriceLine({
        price: resistance.price,
        color: resistance.strength === 'strong' ? '#ef4444' : 
               resistance.strength === 'medium' ? '#f87171' : '#fca5a5',
        lineWidth: resistance.strength === 'strong' ? 2 : 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: resistance.label,
      });
    });

    chartRef.current.timeScale().fitContent();
  }, [chartData, currentPrice, supports, resistances]);

  return (
    <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {timeframe} Chart
            </h3>
            <p className="text-sm text-gray-400">Fibonacci Levels • {tokenSymbol}</p>
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex gap-1">
          {(['15m', '1H', '4H', '1D', '1W'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                timeframe === tf 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-700/50 text-gray-400 hover:bg-purple-500/20'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="relative rounded-xl overflow-hidden bg-gray-900/50"
      />

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-gradient-to-r from-green-500 to-green-300"></div>
          <span>Support Levels</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500"></div>
          <span>Current Price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-gradient-to-r from-red-500 to-red-300"></div>
          <span>Resistance Levels</span>
        </div>
      </div>

      {/* Chart Info */}
      <p className="mt-3 text-center text-xs text-gray-500">
        Interactive Fibonacci chart with timeframe-specific levels • Professional Trading Analysis
      </p>
    </div>
  );
};
