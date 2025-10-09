const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ecosystem Staking Factory - Mainnet Ready Tests", function () {
  let factory;
  let owner;
  let whitelisted;
  let regularUser;
  let mockStakingToken;
  let mockRewardToken;
  
  const BURN_AMOUNT = ethers.parseEther("1000000"); // 1M ORDER
  const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
  const ORDER_TOKEN_ADDRESS = "0x1BEd077195307229FcCBC719C5f2ce6416A58180"; // Real ORDER token on Avalanche
  
  beforeEach(async function () {
    // Get signers
    [owner, whitelisted, regularUser] = await ethers.getSigners();
    
    // Deploy Factory with real ORDER token address
    const Factory = await ethers.getContractFactory("EcosystemStakingFactory");
    factory = await Factory.deploy(ORDER_TOKEN_ADDRESS);
    await factory.waitForDeployment();
    
    // Deploy MockERC20 for testing pool creation (staking/reward tokens)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockStakingToken = await MockERC20.deploy("Mock Staking Token", "MST", 18);
    mockRewardToken = await MockERC20.deploy("Mock Reward Token", "MRT", 18);
    
    await mockStakingToken.waitForDeployment();
    await mockRewardToken.waitForDeployment();
    
    // Mint initial supply for testing
    await mockStakingToken.mint(owner.address, ethers.parseEther("1000000"));
    await mockRewardToken.mint(owner.address, ethers.parseEther("1000000"));
  });
  
  describe("Factory Configuration", function () {
    it("Should have correct ORDER token address", async function () {
      const orderToken = await factory.orderToken();
      expect(orderToken).to.equal(ORDER_TOKEN_ADDRESS);
    });
    
    it("Should have correct burn amount", async function () {
      const burnAmount = await factory.BURN_AMOUNT();
      expect(burnAmount).to.equal(BURN_AMOUNT);
    });
    
    it("Should have correct dead address", async function () {
      const deadAddr = await factory.DEAD_ADDRESS();
      expect(deadAddr).to.equal(DEAD_ADDRESS);
    });
    
    it("Should have deployer as admin", async function () {
      const admin = await factory.admin();
      expect(admin).to.equal(owner.address);
    });
  });
  
  describe("Whitelist Configuration", function () {
    it("Should have whitelisted address set in constructor", async function () {
      const whitelistedAddr = "0x3fa6df8357DC58935360833827a9762433488C83";
      const isWhitelisted = await factory.whitelistedCreators(whitelistedAddr);
      expect(isWhitelisted).to.be.true;
    });
    
    it("Should allow admin to add address to whitelist", async function () {
      const newWhitelisted = whitelisted.address;
      
      // Initially not whitelisted
      expect(await factory.whitelistedCreators(newWhitelisted)).to.be.false;
      
      // Admin adds to whitelist
      await factory.setWhitelist(newWhitelisted, true);
      
      // Now whitelisted
      expect(await factory.whitelistedCreators(newWhitelisted)).to.be.true;
    });
    
    it("Should allow admin to remove address from whitelist", async function () {
      const testAddr = whitelisted.address;
      
      // Add to whitelist first
      await factory.setWhitelist(testAddr, true);
      expect(await factory.whitelistedCreators(testAddr)).to.be.true;
      
      // Remove from whitelist
      await factory.setWhitelist(testAddr, false);
      expect(await factory.whitelistedCreators(testAddr)).to.be.false;
    });
    
    it("Should emit WhitelistUpdated event", async function () {
      await expect(factory.setWhitelist(whitelisted.address, true))
        .to.emit(factory, "WhitelistUpdated")
        .withArgs(whitelisted.address, true);
    });
    
    it("Should revert when non-admin tries to update whitelist", async function () {
      await expect(
        factory.connect(regularUser).setWhitelist(whitelisted.address, true)
      ).to.be.revertedWith("Only admin");
    });
  });
  
  describe("Pool Creation - Whitelisted Users", function () {
    let poolParams;
    
    beforeEach(async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      
      poolParams = {
        stakingToken: await mockStakingToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        rewardPerBlock: ethers.parseEther("1"),
        startBlock: currentBlock + 10,
        endBlock: currentBlock + 1000,
        poolName: "Test Pool",
        poolDescription: "Test Description",
        stakingSymbol: "TST",
        rewardSymbol: "RWD",
        stakingLogo: "https://example.com/staking.png",
        rewardLogo: "https://example.com/reward.png"
      };
      
      // Add whitelisted user
      await factory.setWhitelist(whitelisted.address, true);
    });
    
    it("Should allow whitelisted user to create pool without ORDER approval", async function () {
      const poolCountBefore = await factory.poolCount();
      
      // Create pool - no ORDER approval needed
      await factory.connect(whitelisted).createStakingPool(poolParams);
      
      const poolCountAfter = await factory.poolCount();
      expect(poolCountAfter).to.equal(poolCountBefore + BigInt(1));
    });
    
    it("Should emit PoolCreated event", async function () {
      await expect(factory.connect(whitelisted).createStakingPool(poolParams))
        .to.emit(factory, "PoolCreated");
    });
    
    it("Should store pool info correctly", async function () {
      const tx = await factory.connect(whitelisted).createStakingPool(poolParams);
      const receipt = await tx.wait();
      
      // Get pool address from event
      const event = receipt.logs.find(log => {
        try {
          return factory.interface.parseLog(log).name === 'PoolCreated';
        } catch {
          return false;
        }
      });
      
      const poolAddress = factory.interface.parseLog(event).args[0];
      
      // Check pool info
      const poolInfo = await factory.getPoolInfo(poolAddress);
      expect(poolInfo.stakingToken).to.equal(await mockStakingToken.getAddress());
      expect(poolInfo.rewardToken).to.equal(await mockRewardToken.getAddress());
      expect(poolInfo.creator).to.equal(whitelisted.address);
    });
    
    it("Should track pools by creator", async function () {
      await factory.connect(whitelisted).createStakingPool(poolParams);
      
      const creatorPools = await factory.getPoolsByCreator(whitelisted.address);
      expect(creatorPools.length).to.equal(1);
    });
  });
  
  describe("Pool Creation - Non-Whitelisted Users", function () {
    let poolParams;
    
    beforeEach(async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      
      poolParams = {
        stakingToken: await mockStakingToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        rewardPerBlock: ethers.parseEther("1"),
        startBlock: currentBlock + 10,
        endBlock: currentBlock + 1000,
        poolName: "Test Pool",
        poolDescription: "Test Description",
        stakingSymbol: "TST",
        rewardSymbol: "RWD",
        stakingLogo: "https://example.com/staking.png",
        rewardLogo: "https://example.com/reward.png"
      };
    });
    
    it("Should revert if non-whitelisted user tries without ORDER approval", async function () {
      // This will fail because regularUser doesn't have ORDER tokens or approval
      // In mainnet, user needs to approve 1M ORDER tokens first
      await expect(
        factory.connect(regularUser).createStakingPool(poolParams)
      ).to.be.reverted;
    });
  });
  
  describe("Input Validation", function () {
    let poolParams;
    
    beforeEach(async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      
      poolParams = {
        stakingToken: await mockStakingToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        rewardPerBlock: ethers.parseEther("1"),
        startBlock: currentBlock + 10,
        endBlock: currentBlock + 1000,
        poolName: "Test Pool",
        poolDescription: "Test Description",
        stakingSymbol: "TST",
        rewardSymbol: "RWD",
        stakingLogo: "https://example.com/staking.png",
        rewardLogo: "https://example.com/reward.png"
      };
      
      await factory.setWhitelist(whitelisted.address, true);
    });
    
    it("Should revert with invalid staking token", async function () {
      poolParams.stakingToken = ethers.ZeroAddress;
      await expect(
        factory.connect(whitelisted).createStakingPool(poolParams)
      ).to.be.revertedWith("Invalid staking token");
    });
    
    it("Should revert with invalid reward token", async function () {
      poolParams.rewardToken = ethers.ZeroAddress;
      await expect(
        factory.connect(whitelisted).createStakingPool(poolParams)
      ).to.be.revertedWith("Invalid reward token");
    });
    
    it("Should revert with invalid block range", async function () {
      poolParams.startBlock = poolParams.endBlock + 100;
      await expect(
        factory.connect(whitelisted).createStakingPool(poolParams)
      ).to.be.revertedWith("Invalid block range");
    });
    
    it("Should revert with zero reward rate", async function () {
      poolParams.rewardPerBlock = 0;
      await expect(
        factory.connect(whitelisted).createStakingPool(poolParams)
      ).to.be.revertedWith("Invalid reward rate");
    });
    
    it("Should revert without pool name", async function () {
      poolParams.poolName = "";
      await expect(
        factory.connect(whitelisted).createStakingPool(poolParams)
      ).to.be.revertedWith("Pool name required");
    });
    
    it("Should revert without staking symbol", async function () {
      poolParams.stakingSymbol = "";
      await expect(
        factory.connect(whitelisted).createStakingPool(poolParams)
      ).to.be.revertedWith("Staking symbol required");
    });
    
    it("Should revert without reward symbol", async function () {
      poolParams.rewardSymbol = "";
      await expect(
        factory.connect(whitelisted).createStakingPool(poolParams)
      ).to.be.revertedWith("Reward symbol required");
    });
  });
  
  describe("Query Functions", function () {
    it("Should return correct pool count", async function () {
      const count = await factory.poolCount();
      expect(count).to.equal(0);
      
      await factory.setWhitelist(whitelisted.address, true);
      
      const currentBlock = await ethers.provider.getBlockNumber();
      const params = {
        stakingToken: await mockStakingToken.getAddress(),
        rewardToken: await mockRewardToken.getAddress(),
        rewardPerBlock: ethers.parseEther("1"),
        startBlock: currentBlock + 10,
        endBlock: currentBlock + 1000,
        poolName: "Test Pool",
        poolDescription: "Test",
        stakingSymbol: "TST",
        rewardSymbol: "RWD",
        stakingLogo: "https://example.com/logo.png",
        rewardLogo: "https://example.com/logo.png"
      };
      
      await factory.connect(whitelisted).createStakingPool(params);
      
      const countAfter = await factory.poolCount();
      expect(countAfter).to.equal(1);
    });
    
    it("Should return empty array for offset >= total", async function () {
      const pools = await factory.getAllPools(100, 10);
      expect(pools.length).to.equal(0);
    });
  });
});
