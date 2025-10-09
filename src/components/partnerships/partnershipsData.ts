export const partnerships = [
  {
    key: 'witch',
    name: 'Witch × Order Partnership',
    logo: '/assets/witch.png',
    token: 'WITCH',
    description: `The ORDER team has built https://witchtarot.netlify.app/ platform for the Witch community. This platform is a Tarot application specifically developed for the Witch community, integrated with the Witch token. This collaboration creates a sustainable partnership model that generates value for both ecosystems.`,
    pool: {
      label: 'ORDER/WITCH Liquidity Pool',
      orderToken: 'ORDER',
      partnerToken: 'WITCH',
      lpAddress: '0xAc7e3b8242e0915d22C107c411b90cAc702EBC56',
    },
    external: {
      label: 'Visit Witch Tarot',
      url: 'https://witchtarot.netlify.app/'
    }
  },
  {
    key: 'stank',
    name: 'Stank × Order Partnership',
  logo: '/assets/stank.png',
    token: 'STANK',
  description: `A custom NFT smart contract and frontend were developed for Stank. You can buy and sell any of the 666 NFTs directly with the contract.`,
    pool: {
      label: 'ORDER/STANK Staking Pool',
      orderToken: 'ORDER',
      partnerToken: 'STANK',
      lpAddress: '0x0',
    },
    external: {
      label: 'Visit Stank Platform',
      url: 'https://stanknftcollection.netlify.app/'
    }
  },
  {
    key: 'koksal',
    name: 'Koksal × Order Partnership',
  logo: '/assets/koksal.png',
    token: 'KOKSAL',
  description: `Koksal NFT Market allows you to mint GIF NFTs and buy/sell them using the KOKSAL token via Tenor integration. Both the frontend and smart contracts for Koksal were developed by the Order team.`,
    pool: {
      label: 'ORDER/KOKSAL Staking Pool',
      orderToken: 'ORDER',
      partnerToken: 'KOKSAL',
      lpAddress: '0x0',
    },
    external: {
      label: 'Visit Koksal Platform',
      url: 'https://koksalnft.netlify.app/'
    }
  }
];
