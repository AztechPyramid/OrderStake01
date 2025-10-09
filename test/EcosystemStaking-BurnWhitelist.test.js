const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ecosystem Staking - Burn to Dead Address & Whitelist", function () {
  let factory;
  let owner;
  let whitelisted;
  let regularUser;
  let mockERC20;
  let mockStakingToken;
  let mockRewardToken;
  
  const BURN_AMOUNT = ethers.parseEther("1000000"); // 1M ORDER
  const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
  const ORDER_TOKEN_ADDRESS = "0x1BEd077195307229FcCBC719C5f2ce6416A58180";
  
  beforeEach(async function () {
    // Get signers
    [owner, whitelisted, regularUser] = await ethers.getSigners();
    
    // Deploy Factory with real ORDER token address
    const Factory = await ethers.getContractFactory("EcosystemStakingFactory");
    factory = await Factory.deploy(ORDER_TOKEN_ADDRESS);
    await factory.waitForDeployment();
    
    // Deploy MockERC20 contract for staking/reward tokens (for testing)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = MockERC20;
    mockStakingToken = await MockERC20.deploy("Mock Staking Token", "MST", ethers.parseEther("1000000"));
    mockRewardToken = await MockERC20.deploy("Mock Reward Token", "MRT", ethers.parseEther("1000000"));
    await mockStakingToken.waitForDeployment();
    await mockRewardToken.waitForDeployment();
  });
  
  describe("Factory Whitelist Configuration", function () {
    it("Should have whitelisted address set in constructor", async function () {
      const whitelistedAddr = "0x3fa6df8357DC58935360833827a9762433488C83";
      const isWhitelisted = await factory.whitelistedCreators(whitelistedAddr);
      expect(isWhitelisted).to.be.true;
    });
    
    it("Should have correct admin set", async function () {
      const admin = await factory.admin();
      expect(admin).to.equal(owner.address);
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
      const whitelistedAddr = "0x3fa6df8357DC58935360833827a9762433488C83";
      
      // Initially whitelisted
      expect(await factory.whitelistedCreators(whitelistedAddr)).to.be.true;
      
      // Admin removes from whitelist
      await factory.setWhitelist(whitelistedAddr, false);
      
      // Now not whitelisted
      expect(await factory.whitelistedCreators(whitelistedAddr)).to.be.false;
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
  
  describe("Pool Creation with Burn (Mock Test)", function () {
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
    
    it("Should revert if non-whitelisted user tries to create pool (no ORDER approval)", async function () {
      // Note: Bu test gerçek ORDER token'ı kullanamadığı için skip edilebilir
      // Mainnet'te ORDER token approval'ı gerekecek
      await expect(
        factory.connect(regularUser).createStakingPool(poolParams)
      ).to.be.reverted;
    });
    
    it("Should allow whitelisted user to create pool without burning ORDER", async function () {
      // Add whitelisted to whitelist
      await factory.setWhitelist(whitelisted.address, true);
      
      const poolCountBefore = await factory.poolCount();
      
      // Create pool (NO ORDER approval needed)
      await factory.connect(whitelisted).createStakingPool(poolParams);
      
      const poolCountAfter = await factory.poolCount();
      expect(poolCountAfter).to.equal(poolCountBefore + BigInt(1));
    });
    
    it("Should emit PoolCreated event", async function () {
      await factory.setWhitelist(whitelisted.address, true);
      
      await expect(factory.connect(whitelisted).createStakingPool(poolParams))
        .to.emit(factory, "PoolCreated");
    });
  });
    it("Should have correct dead address constant", async function () {
      const deadAddr = await factory.DEAD_ADDRESS();
      expect(deadAddr).to.equal(DEAD_ADDRESS);
    });
    
    it("Should accumulate tokens in dead address from multiple burns", async function () {
      const deadBalanceBefore = await orderToken.balanceOf(DEAD_ADDRESS);
      
      // Multiple users create pools
      for (let i = 0; i < 3; i++) {
        await orderToken.connect(regularUser).approve(await factory.getAddress(), BURN_AMOUNT);
        
        const currentBlock = await ethers.provider.getBlockNumber();
        const params = {
          stakingToken: await mockStakingToken.getAddress(),
          rewardToken: await mockRewardToken.getAddress(),
          rewardPerBlock: ethers.parseEther("1"),
          startBlock: currentBlock + 10,
          endBlock: currentBlock + 1000,
          poolName: `Test Pool ${i}`,
          poolDescription: "Test",
          stakingSymbol: "TST",
          rewardSymbol: "RWD",
          stakingLogo: "https://example.com/logo.png",
          rewardLogo: "https://example.com/logo.png"
        };
        
        await factory.connect(regularUser).createStakingPool(params);
      }
      
      const deadBalanceAfter = await orderToken.balanceOf(DEAD_ADDRESS);
      
      // Should have 3M ORDER burned (3 pools × 1M each)
      expect(deadBalanceAfter - deadBalanceBefore).to.equal(BURN_AMOUNT * BigInt(3));
    });
  });
});
