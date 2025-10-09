const { ethers } = require('ethers');
const { logger } = require('../utils/logger');

/**
 * Event listener for NFT contracts (OrderNFTLaunch and OrderNFTCollection)
 * Handles: CollectionCreated, TokenListed, TokenSold, RevenueWithdrawn, etc.
 */
class NFTEventListener {
  constructor(blockchain, storage) {
    this.blockchain = blockchain;
    this.storage = storage;
    this.isListening = false;
    this.listeners = new Map();
    this.trackedCollections = new Set(); // Track discovered collections
  }

  /**
   * Start listening to all NFT events
   */
  async start() {
    if (this.isListening) {
      logger.warn('⚠️  NFT listener already running');
      return;
    }

    try {
      // Index past events first
      await this.indexPastEvents();
      
      // Start real-time listening
      await this.startRealTimeListening();
      
      this.isListening = true;
      logger.info('🎨 NFT event listener started');
      
    } catch (error) {
      logger.error('❌ Failed to start NFT listener:', error);
      throw error;
    }
  }

  /**
   * Stop listening to events
   */
  async stop() {
    this.isListening = false;
    
    // Remove all event listeners
    for (const [contractName, listeners] of this.listeners) {
      const contract = this.blockchain.getContract(contractName);
      if (contract && contract.removeAllListeners) {
        for (const eventName of listeners) {
          contract.removeAllListeners(eventName);
        }
      }
    }
    
    this.listeners.clear();
    logger.info('🛑 NFT event listener stopped');
  }

  /**
   * Index past events from deployment block to current
   */
  async indexPastEvents() {
    // Index factory events
    await this.indexFactoryEvents();
    
    // Index collection events
    await this.indexCollectionEvents();
    
    logger.info('✅ Past NFT events indexed');
  }

  /**
   * Index OrderNFTLaunch factory events
   */
  async indexFactoryEvents() {
    const factory = this.blockchain.getContract('OrderNFTLaunch');
    if (!factory) {
      logger.warn('⚠️  OrderNFTLaunch not available, skipping factory events');
      return;
    }

    const latestBlock = await this.storage.getLatestBlock('collections');
    const currentBlock = await this.blockchain.getCurrentBlock();
    const maxRange = this.blockchain.config.indexer?.maxBlockRange || 10000;
    
    logger.info(`📚 Indexing factory events from block ${latestBlock} to ${currentBlock}`);

    let currentFrom = latestBlock;

    while (currentFrom <= currentBlock) {
      const currentTo = Math.min(currentFrom + maxRange - 1, currentBlock);
      
      try {
        logger.debug(`🔍 Querying factory events: blocks ${currentFrom} to ${currentTo}`);
        
        // CollectionCreated events
        const collectionCreatedEvents = await factory.queryFilter(
          factory.filters.CollectionCreated(),
          currentFrom,
          currentTo
        );

        for (const event of collectionCreatedEvents) {
          await this.processCollectionCreatedEvent(event);
        }

        // BurnAmountUpdated events
        const burnAmountEvents = await factory.queryFilter(
          factory.filters.BurnAmountUpdated(),
          currentFrom,
          currentTo
        );

        for (const event of burnAmountEvents) {
          await this.processBurnAmountUpdatedEvent(event);
        }

        currentFrom = currentTo + 1;
        
        // Small delay to avoid rate limiting
        if (currentFrom <= currentBlock) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        logger.error(`❌ Error querying factory events ${currentFrom}-${currentTo}:`, error);
        currentFrom = currentTo + 1;
      }
    }
  }

  /**
   * Index individual collection events
   */
  async indexCollectionEvents() {
    // Get all known collections from storage
    const collectionEvents = await this.storage.getEvents('collections', { eventName: 'CollectionCreated' });
    
    for (const event of collectionEvents) {
      if (event.collection && !this.trackedCollections.has(event.collection)) {
        await this.indexIndividualCollectionEvents(event.collection);
        this.trackedCollections.add(event.collection);
      }
    }
  }

  /**
   * Index events for a specific collection
   */
  async indexIndividualCollectionEvents(collectionAddress) {
    const latestBlock = await this.storage.getLatestBlock('listings');
    const currentBlock = await this.blockchain.getCurrentBlock();
    const maxRange = this.blockchain.config.indexer?.maxBlockRange || 10000;
    
    logger.debug(`📚 Indexing collection events for ${this.blockchain.formatAddress(collectionAddress)}`);

    try {
      const collectionAbi = this.blockchain.contracts.get('OrderNFTCollection')?.abi;
      if (!collectionAbi) {
        logger.warn('⚠️  No OrderNFTCollection ABI available');
        return;
      }

      const collection = new ethers.Contract(
        collectionAddress,
        collectionAbi,
        this.blockchain.provider
      );

      let currentFrom = latestBlock;

      while (currentFrom <= currentBlock) {
        const currentTo = Math.min(currentFrom + maxRange - 1, currentBlock);
        
        try {
          // TokenListed events
          const tokenListedEvents = await collection.queryFilter(
            collection.filters.TokenListed(),
            currentFrom,
            currentTo
          );

          for (const event of tokenListedEvents) {
            await this.processTokenListedEvent(event, collectionAddress);
          }

          // TokenSold events
          const tokenSoldEvents = await collection.queryFilter(
            collection.filters.TokenSold(),
            currentFrom,
            currentTo
          );

          for (const event of tokenSoldEvents) {
            await this.processTokenSoldEvent(event, collectionAddress);
          }

          // TokenUnlisted events
          const tokenUnlistedEvents = await collection.queryFilter(
            collection.filters.TokenUnlisted(),
            currentFrom,
            currentTo
          );

          for (const event of tokenUnlistedEvents) {
            await this.processTokenUnlistedEvent(event, collectionAddress);
          }

          // RevenueWithdrawn events
          const revenueWithdrawnEvents = await collection.queryFilter(
            collection.filters.RevenueWithdrawn(),
            currentFrom,
            currentTo
          );

          for (const event of revenueWithdrawnEvents) {
            await this.processRevenueWithdrawnEvent(event, collectionAddress);
          }

          currentFrom = currentTo + 1;
          
        } catch (error) {
          logger.error(`❌ Error querying collection events ${currentFrom}-${currentTo}:`, error);
          currentFrom = currentTo + 1;
        }
      }
      
    } catch (error) {
      logger.error(`❌ Error indexing collection ${collectionAddress}:`, error);
    }
  }

  /**
   * Start real-time event listening
   */
  async startRealTimeListening() {
    // Listen to factory events
    await this.listenToFactoryEvents();
    
    // Listen to existing collections
    await this.listenToExistingCollections();
  }

  /**
   * Listen to factory events in real-time
   */
  async listenToFactoryEvents() {
    const factory = this.blockchain.getContract('OrderNFTLaunch');
    if (!factory) {
      logger.warn('⚠️  OrderNFTLaunch not available for real-time listening');
      return;
    }

    const contractName = 'OrderNFTLaunch';
    const listeners = [];

    try {
      // CollectionCreated events
      factory.on('CollectionCreated', async (...args) => {
        const event = args[args.length - 1];
        await this.processCollectionCreatedEvent(event);
      });
      listeners.push('CollectionCreated');

      // BurnAmountUpdated events
      factory.on('BurnAmountUpdated', async (...args) => {
        const event = args[args.length - 1];
        await this.processBurnAmountUpdatedEvent(event);
      });
      listeners.push('BurnAmountUpdated');

      this.listeners.set(contractName, listeners);
      logger.info(`🎨 Real-time listening started for ${contractName}`);
      
    } catch (error) {
      logger.error(`❌ Error setting up factory listeners:`, error);
    }
  }

  /**
   * Listen to existing collections
   */
  async listenToExistingCollections() {
    const collectionEvents = await this.storage.getEvents('collections', { eventName: 'CollectionCreated' });
    
    for (const event of collectionEvents) {
      if (event.collection) {
        await this.startListeningToCollection(event.collection);
      }
    }
  }

  /**
   * Process CollectionCreated event
   */
  async processCollectionCreatedEvent(event) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'CollectionCreated',
        contractName: 'OrderNFTLaunch',
        contractAddress: event.address,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        // Event-specific data
        creator: args.creator,
        collection: args.collection,
        mintToken: args.mintToken,
        mintPrice: args.mintPrice?.toString(),
        maxSupply: args.maxSupply?.toString(),
        baseURI: args.baseURI,
        
        // Formatted for display
        formatted: {
          creator: this.blockchain.formatAddress(args.creator),
          collection: this.blockchain.formatAddress(args.collection),
          mintToken: this.blockchain.formatAddress(args.mintToken),
          mintPrice: this.blockchain.formatAmount(args.mintPrice, 18),
          maxSupply: args.maxSupply?.toString(),
          baseURI: args.baseURI
        }
      };

      const added = await this.storage.addEvent('collections', eventData);
      if (added) {
        logger.event('CollectionCreated', {
          creator: eventData.formatted.creator,
          collection: eventData.formatted.collection,
          mintPrice: eventData.formatted.mintPrice,
          maxSupply: eventData.formatted.maxSupply
        });

        // Start listening to the new collection's events
        await this.startListeningToCollection(args.collection);
      }
      
    } catch (error) {
      logger.error('❌ Error processing CollectionCreated event:', error);
    }
  }

  /**
   * Process BurnAmountUpdated event (factory)
   */
  async processBurnAmountUpdatedEvent(event) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'BurnAmountUpdated',
        contractName: 'OrderNFTLaunch',
        contractAddress: event.address,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        oldAmount: args.oldAmount?.toString(),
        newAmount: args.newAmount?.toString(),
        
        formatted: {
          oldAmount: this.blockchain.formatAmount(args.oldAmount, 18, 'ORDER'),
          newAmount: this.blockchain.formatAmount(args.newAmount, 18, 'ORDER')
        }
      };

      const added = await this.storage.addEvent('collections', eventData);
      if (added) {
        logger.event('BurnAmountUpdated', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing BurnAmountUpdated event:', error);
    }
  }

  /**
   * Start listening to individual collection events
   */
  async startListeningToCollection(collectionAddress) {
    if (this.trackedCollections.has(collectionAddress)) {
      return; // Already listening
    }

    try {
      const collectionAbi = this.blockchain.contracts.get('OrderNFTCollection')?.abi;
      if (!collectionAbi) {
        logger.warn(`⚠️  No OrderNFTCollection ABI available`);
        return;
      }

      const collection = new ethers.Contract(
        collectionAddress,
        collectionAbi,
        this.blockchain.provider
      );

      const listeners = [];

      // TokenListed events
      collection.on('TokenListed', async (...args) => {
        const event = args[args.length - 1];
        await this.processTokenListedEvent(event, collectionAddress);
      });
      listeners.push('TokenListed');

      // TokenSold events
      collection.on('TokenSold', async (...args) => {
        const event = args[args.length - 1];
        await this.processTokenSoldEvent(event, collectionAddress);
      });
      listeners.push('TokenSold');

      // TokenUnlisted events
      collection.on('TokenUnlisted', async (...args) => {
        const event = args[args.length - 1];
        await this.processTokenUnlistedEvent(event, collectionAddress);
      });
      listeners.push('TokenUnlisted');

      // RevenueWithdrawn events
      collection.on('RevenueWithdrawn', async (...args) => {
        const event = args[args.length - 1];
        await this.processRevenueWithdrawnEvent(event, collectionAddress);
      });
      listeners.push('RevenueWithdrawn');

      this.listeners.set(collectionAddress, listeners);
      this.trackedCollections.add(collectionAddress);
      
      logger.info(`🎨 Started listening to collection: ${this.blockchain.formatAddress(collectionAddress)}`);
      
    } catch (error) {
      logger.error(`❌ Error setting up collection listeners for ${collectionAddress}:`, error);
    }
  }

  /**
   * Process TokenListed event
   */
  async processTokenListedEvent(event, collectionAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'TokenListed',
        contractName: 'OrderNFTCollection',
        contractAddress: collectionAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        tokenId: args.tokenId?.toString(),
        seller: args.seller,
        price: args.price?.toString(),
        paymentToken: args.paymentToken,
        
        formatted: {
          tokenId: args.tokenId?.toString(),
          seller: this.blockchain.formatAddress(args.seller),
          price: this.blockchain.formatAmount(args.price, 18),
          paymentToken: this.blockchain.formatAddress(args.paymentToken),
          collection: this.blockchain.formatAddress(collectionAddress)
        }
      };

      const added = await this.storage.addEvent('listings', eventData);
      if (added) {
        logger.event('TokenListed', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing TokenListed event:', error);
    }
  }

  /**
   * Process TokenSold event
   */
  async processTokenSoldEvent(event, collectionAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'TokenSold',
        contractName: 'OrderNFTCollection',
        contractAddress: collectionAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        tokenId: args.tokenId?.toString(),
        seller: args.seller,
        buyer: args.buyer,
        price: args.price?.toString(),
        paymentToken: args.paymentToken,
        marketplaceFee: args.marketplaceFee?.toString(),
        
        formatted: {
          tokenId: args.tokenId?.toString(),
          seller: this.blockchain.formatAddress(args.seller),
          buyer: this.blockchain.formatAddress(args.buyer),
          price: this.blockchain.formatAmount(args.price, 18),
          paymentToken: this.blockchain.formatAddress(args.paymentToken),
          marketplaceFee: this.blockchain.formatAmount(args.marketplaceFee, 18),
          collection: this.blockchain.formatAddress(collectionAddress)
        }
      };

      const added = await this.storage.addEvent('sales', eventData);
      if (added) {
        logger.event('TokenSold', {
          tokenId: eventData.formatted.tokenId,
          buyer: eventData.formatted.buyer,
          seller: eventData.formatted.seller,
          price: eventData.formatted.price,
          collection: eventData.formatted.collection
        });
      }
      
    } catch (error) {
      logger.error('❌ Error processing TokenSold event:', error);
    }
  }

  /**
   * Process TokenUnlisted event
   */
  async processTokenUnlistedEvent(event, collectionAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'TokenUnlisted',
        contractName: 'OrderNFTCollection',
        contractAddress: collectionAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        tokenId: args.tokenId?.toString(),
        seller: args.seller,
        
        formatted: {
          tokenId: args.tokenId?.toString(),
          seller: this.blockchain.formatAddress(args.seller),
          collection: this.blockchain.formatAddress(collectionAddress)
        }
      };

      const added = await this.storage.addEvent('listings', eventData);
      if (added) {
        logger.event('TokenUnlisted', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing TokenUnlisted event:', error);
    }
  }

  /**
   * Process RevenueWithdrawn event
   */
  async processRevenueWithdrawnEvent(event, collectionAddress) {
    try {
      const args = event.args;
      const eventData = {
        eventName: 'RevenueWithdrawn',
        contractName: 'OrderNFTCollection',
        contractAddress: collectionAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        
        creator: args.creator,
        token: args.token,
        amount: args.amount?.toString(),
        
        formatted: {
          creator: this.blockchain.formatAddress(args.creator),
          token: this.blockchain.formatAddress(args.token),
          amount: this.blockchain.formatAmount(args.amount, 18),
          collection: this.blockchain.formatAddress(collectionAddress)
        }
      };

      const added = await this.storage.addEvent('sales', eventData);
      if (added) {
        logger.event('RevenueWithdrawn', eventData.formatted);
      }
      
    } catch (error) {
      logger.error('❌ Error processing RevenueWithdrawn event:', error);
    }
  }

  /**
   * Get listener status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      activeListeners: this.listeners.size,
      trackedCollections: this.trackedCollections.size,
      contracts: Array.from(this.listeners.keys())
    };
  }
}

module.exports = NFTEventListener;