// TheGraph Subgraph Configuration

export const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/120066/orderstake-avalanche/v0.0.1';

// GraphQL Queries
export const GET_POOLS_QUERY = `
  query GetPools($first: Int!, $skip: Int!, $orderBy: Pool_orderBy, $orderDirection: OrderDirection) {
    pools(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      address
      stakingToken
      rewardToken
      rewardPerBlock
      startBlock
      endBlock
      totalStaked
      creator {
        id
        address
      }
    }
  }
`;

export const SEARCH_POOLS_QUERY = `
  query SearchPools($searchTerm: String!, $first: Int!, $skip: Int!) {
    pools(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      address
      stakingToken
      rewardToken
      rewardPerBlock
      startBlock
      endBlock
      totalStaked
      creator {
        id
        address
      }
    }
  }
`;

export const GET_FACTORY_STATS_QUERY = `
  query GetFactoryStats {
    factory(id: "factory") {
      poolCount
      totalOrderBurned
    }
    statistic(id: "stats") {
      totalPools
      totalOrderBurned
      totalCreators
      totalValueLocked
    }
  }
`;

export const GET_POOL_BY_ADDRESS_QUERY = `
  query GetPoolByAddress($address: String!) {
    pool(id: $address) {
      id
      address
      stakingToken
      rewardToken
      rewardPerBlock
      startBlock
      endBlock
      totalStaked
      creator {
        id
        address
      }
    }
  }
`;

export const GET_CREATOR_POOLS_QUERY = `
  query GetCreatorPools($creatorAddress: String!) {
    creator(id: $creatorAddress) {
      id
      address
      pools {
        id
        address
        stakingToken
        rewardToken
        rewardPerBlock
        startBlock
        endBlock
        totalStaked
      }
    }
  }
`;
