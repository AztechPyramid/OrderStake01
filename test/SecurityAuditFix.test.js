const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Security Audit Fix Tests", function () {
  let factory, orderToken, stakingToken, rewardToken;
  let admin, creator, user;
  
  const BURN_AMOUNT = ethers.parseUnits("1000000", 18);
  const REWARD_PER_BLOCK = ethers.parseUnits("1", 18);
  
  beforeEach(async function () {
    [admin, creator, user] = await ethers.getSigners();
    
    // Deploy ORDER token (18 decimals)
    const ERC20Mock = await ethers.getContractFactory("MockERC20");
    orderToken = await ERC20Mock.deploy("Order Token", "ORDER", 18);
    await orderToken.waitForDeployment();
    
    // Deploy Factory
    const Factory = await ethers.getContractFactory("EcosystemStakingFactory");
    factory = await Factory.deploy(await orderToken.getAddress());
    await factory.waitForDeployment();
    
    // Whitelist creator
    await factory.setWhitelist(creator.address, true);
  });
  
  describe("🔒 Fix #1: Decimal Validation", function () {
    it("✅ Should accept 18-decimal staking and reward tokens", async function () {
      // Deploy 18-decimal tokens
      const ERC20Mock = await ethers.getContractFactory("MockERC20");
      stakingToken = await ERC20Mock.deploy("18 Decimal Token", "TOKEN18", 18);
      rewardToken = await ERC20Mock.deploy("18 Decimal Reward", "REWARD18", 18);
      
      await stakingToken.waitForDeployment();
      await rewardToken.waitForDeployment();
      
      const startBlock = await ethers.provider.getBlockNumber() + 10;
      const endBlock = startBlock + 1000;
      
      // Should succeed
      const tx = await factory.connect(creator).createStakingPool({
        stakingToken: await stakingToken.getAddress(),
        rewardToken: await rewardToken.getAddress(),
        rewardPerBlock: REWARD_PER_BLOCK,
        startBlock: startBlock,
        endBlock: endBlock,
        poolName: "Test Pool",
        poolDescription: "Test Description",
        stakingSymbol: "TOKEN18",
        rewardSymbol: "REWARD18",
        stakingLogo: "https://test.com/staking.png",
        rewardLogo: "https://test.com/reward.png"
      });
      
      await tx.wait();
      
      const poolCount = await factory.poolCount();
      expect(poolCount).to.equal(1n);
    });
    
    it("❌ Should reject 6-decimal staking token", async function () {
      const ERC20Mock = await ethers.getContractFactory("MockERC20");
      stakingToken = await ERC20Mock.deploy("USDC Mock", "USDC", 6);
      rewardToken = await ERC20Mock.deploy("18 Decimal Reward", "REWARD18", 18);
      
      await stakingToken.waitForDeployment();
      await rewardToken.waitForDeployment();
      
      const startBlock = await ethers.provider.getBlockNumber() + 10;
      const endBlock = startBlock + 1000;
      
      // Should revert with decimal error
      await expect(
        factory.connect(creator).createStakingPool({
          stakingToken: await stakingToken.getAddress(),
          rewardToken: await rewardToken.getAddress(),
          rewardPerBlock: REWARD_PER_BLOCK,
          startBlock: startBlock,
          endBlock: endBlock,
          poolName: "Test Pool",
          poolDescription: "Test Description",
          stakingSymbol: "USDC",
          rewardSymbol: "REWARD18",
          stakingLogo: "https://test.com/staking.png",
          rewardLogo: "https://test.com/reward.png"
        })
      ).to.be.revertedWith("Staking token must have 18 decimals");
    });
    
    it("❌ Should reject 6-decimal reward token", async function () {
      const ERC20Mock = await ethers.getContractFactory("MockERC20");
      stakingToken = await ERC20Mock.deploy("18 Decimal Token", "TOKEN18", 18);
      rewardToken = await ERC20Mock.deploy("USDC Mock", "USDC", 6);
      
      await stakingToken.waitForDeployment();
      await rewardToken.waitForDeployment();
      
      const startBlock = await ethers.provider.getBlockNumber() + 10;
      const endBlock = startBlock + 1000;
      
      // Should revert with decimal error
      await expect(
        factory.connect(creator).createStakingPool({
          stakingToken: await stakingToken.getAddress(),
          rewardToken: await rewardToken.getAddress(),
          rewardPerBlock: REWARD_PER_BLOCK,
          startBlock: startBlock,
          endBlock: endBlock,
          poolName: "Test Pool",
          poolDescription: "Test Description",
          stakingSymbol: "TOKEN18",
          rewardSymbol: "USDC",
          stakingLogo: "https://test.com/staking.png",
          rewardLogo: "https://test.com/reward.png"
        })
      ).to.be.revertedWith("Reward token must have 18 decimals");
    });
    
    it("❌ Should reject 8-decimal tokens (WBTC-like)", async function () {
      const ERC20Mock = await ethers.getContractFactory("MockERC20");
      stakingToken = await ERC20Mock.deploy("WBTC Mock", "WBTC", 8);
      rewardToken = await ERC20Mock.deploy("18 Decimal Reward", "REWARD18", 18);
      
      await stakingToken.waitForDeployment();
      await rewardToken.waitForDeployment();
      
      const startBlock = await ethers.provider.getBlockNumber() + 10;
      const endBlock = startBlock + 1000;
      
      // Should revert with decimal error
      await expect(
        factory.connect(creator).createStakingPool({
          stakingToken: await stakingToken.getAddress(),
          rewardToken: await rewardToken.getAddress(),
          rewardPerBlock: REWARD_PER_BLOCK,
          startBlock: startBlock,
          endBlock: endBlock,
          poolName: "Test Pool",
          poolDescription: "Test Description",
          stakingSymbol: "WBTC",
          rewardSymbol: "REWARD18",
          stakingLogo: "https://test.com/staking.png",
          rewardLogo: "https://test.com/reward.png"
        })
      ).to.be.revertedWith("Staking token must have 18 decimals");
    });
  });
  
  describe("🔒 Fix #2: Reward Balance Check", function () {
    let pool, poolAddress;
    
    beforeEach(async function () {
      // Deploy 18-decimal tokens
      const ERC20Mock = await ethers.getContractFactory("MockERC20");
      stakingToken = await ERC20Mock.deploy("Staking Token", "STAKE", 18);
      rewardToken = await ERC20Mock.deploy("Reward Token", "REWARD", 18);
      
      await stakingToken.waitForDeployment();
      await rewardToken.waitForDeployment();
      
      // Mint tokens to user
      await stakingToken.mint(user.address, ethers.parseUnits("1000", 18));
      
      // Create pool
      const startBlock = await ethers.provider.getBlockNumber() + 5;
      const endBlock = startBlock + 1000;
      
      const tx = await factory.connect(creator).createStakingPool({
        stakingToken: await stakingToken.getAddress(),
        rewardToken: await rewardToken.getAddress(),
        rewardPerBlock: REWARD_PER_BLOCK,
        startBlock: startBlock,
        endBlock: endBlock,
        poolName: "Test Pool",
        poolDescription: "Test Description",
        stakingSymbol: "STAKE",
        rewardSymbol: "REWARD",
        stakingLogo: "https://test.com/staking.png",
        rewardLogo: "https://test.com/reward.png"
      });
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return factory.interface.parseLog(log).name === 'PoolCreated';
        } catch (e) {
          return false;
        }
      });
      poolAddress = factory.interface.parseLog(event).args[0];
      
      pool = await ethers.getContractAt("EcosystemStaking", poolAddress);
      
      // Approve and stake
      await stakingToken.connect(user).approve(poolAddress, ethers.parseUnits("100", 18));
      
      // Mine blocks to reach start
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      await pool.connect(user).stake(ethers.parseUnits("100", 18));
      
      // Mine some blocks to accumulate rewards
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine");
      }
    });
    
    it("❌ Should revert claim when pool has NO reward tokens", async function () {
      // Pool has no reward tokens
      const pendingReward = await pool.pendingReward(user.address);
      expect(pendingReward).to.be.gt(0n);
      
      // Try to claim - should fail
      await expect(
        pool.connect(user).claimReward()
      ).to.be.revertedWith("Pool has insufficient rewards");
    });
    
    it("❌ Should revert claim when pool has INSUFFICIENT reward tokens", async function () {
      const pendingReward = await pool.pendingReward(user.address);
      
      // Add only half of pending rewards to pool
      const halfReward = pendingReward / 2n;
      await rewardToken.mint(poolAddress, halfReward);
      
      // Try to claim - should fail
      await expect(
        pool.connect(user).claimReward()
      ).to.be.revertedWith("Pool has insufficient rewards");
    });
    
    it("✅ Should allow claim when pool has SUFFICIENT reward tokens", async function () {
      const pendingReward = await pool.pendingReward(user.address);
      
      // Add enough rewards to pool
      await rewardToken.mint(poolAddress, pendingReward * 2n);
      
      const userBalanceBefore = await rewardToken.balanceOf(user.address);
      
      // Claim should succeed
      await pool.connect(user).claimReward();
      
      const userBalanceAfter = await rewardToken.balanceOf(user.address);
      expect(userBalanceAfter).to.be.gt(userBalanceBefore);
    });
    
    it("✅ Should handle same token for staking and reward (reserve staked amount)", async function () {
      // Deploy new pool with same token for staking and reward
      const ERC20Mock = await ethers.getContractFactory("MockERC20");
      const sameToken = await ERC20Mock.deploy("Same Token", "SAME", 18);
      await sameToken.waitForDeployment();
      
      // Mint tokens to user
      await sameToken.mint(user.address, ethers.parseUnits("1000", 18));
      
      const startBlock = await ethers.provider.getBlockNumber() + 5;
      const endBlock = startBlock + 1000;
      
      const tx = await factory.connect(creator).createStakingPool({
        stakingToken: await sameToken.getAddress(),
        rewardToken: await sameToken.getAddress(), // Same token!
        rewardPerBlock: REWARD_PER_BLOCK,
        startBlock: startBlock,
        endBlock: endBlock,
        poolName: "Same Token Pool",
        poolDescription: "Staking and reward use same token",
        stakingSymbol: "SAME",
        rewardSymbol: "SAME",
        stakingLogo: "https://test.com/same.png",
        rewardLogo: "https://test.com/same.png"
      });
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return factory.interface.parseLog(log).name === 'PoolCreated';
        } catch (e) {
          return false;
        }
      });
      const sameTokenPoolAddress = factory.interface.parseLog(event).args[0];
      const sameTokenPool = await ethers.getContractAt("EcosystemStaking", sameTokenPoolAddress);
      
      // Approve and stake
      await sameToken.connect(user).approve(sameTokenPoolAddress, ethers.parseUnits("100", 18));
      
      // Mine blocks to reach start
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      await sameTokenPool.connect(user).stake(ethers.parseUnits("100", 18));
      
      // Pool now has 100 tokens (staked)
      // Mine blocks to accumulate rewards
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      const pendingReward = await sameTokenPool.pendingReward(user.address);
      
      // Add rewards to pool (in addition to staked amount)
      await sameToken.mint(sameTokenPoolAddress, pendingReward * 2n);
      
      // Now pool has: 100 (staked) + pendingReward * 2 (rewards)
      // Should be able to claim
      const userBalanceBefore = await sameToken.balanceOf(user.address);
      
      await sameTokenPool.connect(user).claimReward();
      
      const userBalanceAfter = await sameToken.balanceOf(user.address);
      expect(userBalanceAfter).to.be.gt(userBalanceBefore);
      
      // Staked amount should still be in pool
      const totalStaked = await sameTokenPool.totalStaked();
      expect(totalStaked).to.equal(ethers.parseUnits("100", 18));
    });
  });
  
  describe("📊 Integration: Decimal + Balance Check Together", function () {
    it("✅ Should work correctly with proper 18-decimal tokens and sufficient balance", async function () {
      const ERC20Mock = await ethers.getContractFactory("MockERC20");
      stakingToken = await ERC20Mock.deploy("Staking Token", "STAKE", 18);
      rewardToken = await ERC20Mock.deploy("Reward Token", "REWARD", 18);
      
      await stakingToken.waitForDeployment();
      await rewardToken.waitForDeployment();
      
      // Mint tokens
      await stakingToken.mint(user.address, ethers.parseUnits("1000", 18));
      
      // Create pool
      const startBlock = await ethers.provider.getBlockNumber() + 5;
      const endBlock = startBlock + 1000;
      
      const tx = await factory.connect(creator).createStakingPool({
        stakingToken: await stakingToken.getAddress(),
        rewardToken: await rewardToken.getAddress(),
        rewardPerBlock: REWARD_PER_BLOCK,
        startBlock: startBlock,
        endBlock: endBlock,
        poolName: "Test Pool",
        poolDescription: "Test Description",
        stakingSymbol: "STAKE",
        rewardSymbol: "REWARD",
        stakingLogo: "https://test.com/staking.png",
        rewardLogo: "https://test.com/reward.png"
      });
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return factory.interface.parseLog(log).name === 'PoolCreated';
        } catch (e) {
          return false;
        }
      });
      const poolAddress = factory.interface.parseLog(event).args[0];
      const pool = await ethers.getContractAt("EcosystemStaking", poolAddress);
      
      // Add rewards to pool
      await rewardToken.mint(poolAddress, ethers.parseUnits("10000", 18));
      
      // Approve and stake
      await stakingToken.connect(user).approve(poolAddress, ethers.parseUnits("100", 18));
      
      // Mine blocks to reach start
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      await pool.connect(user).stake(ethers.parseUnits("100", 18));
      
      // Mine blocks to accumulate rewards
      for (let i = 0; i < 50; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      // Check pending rewards
      const pendingReward = await pool.pendingReward(user.address);
      expect(pendingReward).to.be.gt(0n);
      
      // Claim rewards
      const userBalanceBefore = await rewardToken.balanceOf(user.address);
      await pool.connect(user).claimReward();
      const userBalanceAfter = await rewardToken.balanceOf(user.address);
      
      // Reward should be at least what was pending (may be slightly more due to block mining)
      expect(userBalanceAfter).to.be.gte(userBalanceBefore + pendingReward);
      
      // Unstake
      await pool.connect(user).unstake(ethers.parseUnits("100", 18));
      
      const finalStakingBalance = await stakingToken.balanceOf(user.address);
      expect(finalStakingBalance).to.equal(ethers.parseUnits("1000", 18)); // Got all back
    });
  });
});
