export const ECOSYSTEM_STAKING_FACTORY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_orderToken",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "poolAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "stakingToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "rewardToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rewardPerBlock",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startBlock",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endBlock",
        "type": "uint256"
      }
    ],
    "name": "PoolCreated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BURN_AMOUNT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allPools",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "stakingToken",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "rewardToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "rewardPerBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endBlock",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "poolName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "poolDescription",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "stakingSymbol",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "rewardSymbol",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "stakingLogo",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "rewardLogo",
            "type": "string"
          }
        ],
        "internalType": "struct EcosystemStakingFactory.CreateParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "createStakingPool",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_limit",
        "type": "uint256"
      }
    ],
    "name": "getAllPools",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_pool",
        "type": "address"
      }
    ],
    "name": "getPoolInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "poolAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "stakingToken",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "rewardToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "rewardPerBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endBlock",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct EcosystemStakingFactory.PoolInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_creator",
        "type": "address"
      }
    ],
    "name": "getPoolsByCreator",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "orderToken",
    "outputs": [
      {
        "internalType": "contract IERC20Burnable",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poolCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "poolInfo",
    "outputs": [
      {
        "internalType": "address",
        "name": "poolAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "stakingToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "rewardToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "rewardPerBlock",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startBlock",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endBlock",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "poolsByCreator",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Type definitions
export interface CreateParams {
  stakingToken: string;
  rewardToken: string;
  rewardPerBlock: bigint;
  startBlock: bigint;
  endBlock: bigint;
  totalRewardAmount: bigint;
  poolName: string;
  poolDescription: string;
  stakingSymbol: string;
  rewardSymbol: string;
  stakingLogo: string;
  rewardLogo: string;
}

export interface PoolInfo {
  poolAddress: string;
  stakingToken: string;
  rewardToken: string;
  rewardPerBlock: bigint;
  startBlock: bigint;
  endBlock: bigint;
  creator: string;
  createdAt: bigint;
}
