/**
 * Smart Contract Addresses for Avalanche C-Chain
 * Deployed: October 6, 2025
 */

export const AVALANCHE_MAINNET = {
  chainId: 43114,
  name: 'Avalanche C-Chain',
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  explorerUrl: 'https://snowtrace.io',
};

// Core Contract Addresses
export const CONTRACTS = {
  // Ecosystem Staking Factory (Deployed & Verified) - Updated October 6, 2025
  FACTORY_ADDRESS: '0x3E3d8a430fF70E89C035301943375377CC7343A7',
  
  // ORDER Token (Main token)
  ORDER_TOKEN: '0x1BEd077195307229FcCBC719C5f2ce6416A58180',
  
  // Dead Address (for burns)
  DEAD_ADDRESS: '0x000000000000000000000000000000000000dEaD',
  
  // Whitelisted Address (no burn required)
  WHITELISTED_ADDRESS: '0x3fa6df8357DC58935360833827a9762433488C83',
} as const;

// Staking Configuration
export const STAKING_CONFIG = {
  // Burn amount required to create pool (1M ORDER)
  BURN_AMOUNT: '1000000',
  
  // All tokens must be 18 decimals
  REQUIRED_DECIMALS: 18,
  
  // Minimum stake amount (0.001 tokens)
  MIN_STAKE_AMOUNT: '1000000000000000', // 0.001 * 10^18
} as const;

// Snowtrace Links
export const EXPLORER_LINKS = {
  factory: `${AVALANCHE_MAINNET.explorerUrl}/address/${CONTRACTS.FACTORY_ADDRESS}`,
  orderToken: `${AVALANCHE_MAINNET.explorerUrl}/token/${CONTRACTS.ORDER_TOKEN}`,
  
  // Helper function to get pool link
  getPoolLink: (poolAddress: string) => 
    `${AVALANCHE_MAINNET.explorerUrl}/address/${poolAddress}`,
  
  // Helper function to get transaction link
  getTxLink: (txHash: string) => 
    `${AVALANCHE_MAINNET.explorerUrl}/tx/${txHash}`,
} as const;

// Export for convenience
export const {
  FACTORY_ADDRESS,
  ORDER_TOKEN,
  DEAD_ADDRESS,
  WHITELISTED_ADDRESS,
} = CONTRACTS;

export default CONTRACTS;
