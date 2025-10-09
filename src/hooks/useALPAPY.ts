import { useMemo } from 'react';
import { useDexScreener } from './useDexScreener';

interface ALPAPYCalculation {
  apy: number | null;
  isEnded: boolean;
  remainingTime: string;
  dailyRewards: number;
  monthlyRewards: number;
  yearlyRewards: number;
}

export const useALPAPY = (
  totalStakedValueUSD: number,
  totalRemainingValueUSD: number
): ALPAPYCalculation => {
  const { getTokenPrice } = useDexScreener();

  return useMemo(() => {
    // ALP staking end time - same as ORDER_xORDER and ORDER_xARENA
    const endTimeStr = '2098-12-31 19:00:00';
    const endTime = new Date(endTimeStr.replace(' ', 'T') + 'Z');
    const now = new Date();

    // Check if ended
    const isEnded = now >= endTime;
    if (isEnded) {
      return {
        apy: 0,
        isEnded: true,
        remainingTime: 'Ended',
        dailyRewards: 0,
        monthlyRewards: 0,
        yearlyRewards: 0
      };
    }

    // Calculate remaining time
    let diff = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
    let years = Math.floor(diff / (365 * 24 * 3600));
    diff %= 365 * 24 * 3600;
    let months = Math.floor(diff / (30 * 24 * 3600));
    diff %= 30 * 24 * 3600;
    let weeks = Math.floor(diff / (7 * 24 * 3600));
    diff %= 7 * 24 * 3600;
    let days = Math.floor(diff / 86400);
    diff %= 86400;
    let hours = Math.floor(diff / 3600);
    diff %= 3600;
    let minutes = Math.floor(diff / 60);
    let seconds = diff % 60;

    let remainingTimeStr = '';
    if (years > 0) remainingTimeStr += `${years}y `;
    if (months > 0) remainingTimeStr += `${months}mo `;
    if (weeks > 0) remainingTimeStr += `${weeks}w `;
    if (days > 0) remainingTimeStr += `${days}d `;
    if (years > 0 || months > 0 || weeks > 0 || days > 0 || hours > 0) remainingTimeStr += `${hours}h `;
    if (years === 0 && months === 0 && weeks === 0 && days === 0) {
      remainingTimeStr += `${minutes}m ${seconds}s`;
    }

    // APY Calculation
    let apy: number | null = null;
    let dailyRewards = 0;
    let monthlyRewards = 0;
    let yearlyRewards = 0;

    // Only calculate APY if we have valid data
    if (totalStakedValueUSD > 0 && totalRemainingValueUSD > 0) {
      const secondsRemaining = Math.max(1, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      const secondsInYear = 365 * 24 * 60 * 60;
      const secondsInDay = 24 * 60 * 60;
      const secondsInMonth = 30 * 24 * 60 * 60;

      // Calculate APY: (Total Remaining Rewards / Total Staked Value) * (Time Factor) * 100
      const rawAPY = (totalRemainingValueUSD / totalStakedValueUSD) * (secondsInYear / secondsRemaining) * 100;
      
      // Only set APY if it's a valid, finite number
      if (!isNaN(rawAPY) && isFinite(rawAPY) && rawAPY > 0) {
        apy = rawAPY;

        // Calculate daily, monthly, yearly rewards based on current staking rate
        const dailyRewardRate = totalRemainingValueUSD / (secondsRemaining / secondsInDay);
        const monthlyRewardRate = totalRemainingValueUSD / (secondsRemaining / secondsInMonth);
        const yearlyRewardRate = totalRemainingValueUSD / (secondsRemaining / secondsInYear);

        dailyRewards = dailyRewardRate;
        monthlyRewards = monthlyRewardRate;
        yearlyRewards = yearlyRewardRate;
      }
    }

    return {
      apy,
      isEnded: false,
      remainingTime: remainingTimeStr.trim() || 'Calculating...',
      dailyRewards,
      monthlyRewards,
      yearlyRewards
    };
  }, [totalStakedValueUSD, totalRemainingValueUSD, getTokenPrice]);
};
