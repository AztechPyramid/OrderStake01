export const ALP_STAKING_ABI = [
  // Read functions
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)", 
  "function getPendingReward(address, uint256) view returns (uint256)",
  "function getPendingRewardByToken(address, address) view returns (uint256)",
  "function userInfo(address) view returns (uint256, uint256)", // amount, rewardDebt
  
  // Write functions
  "function deposit(uint256, address) external",
  "function withdraw(uint256, address) external", 
  "function harvest(address) external",
  
  // ERC20 functions for ALP token approval
  "function approve(address, uint256) external returns (bool)",
  "function allowance(address, address) view returns (uint256)"
] as const;

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) external returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
] as const;
