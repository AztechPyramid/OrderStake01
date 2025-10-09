const hre = require("hardhat");

async function main() {
  console.log("🔍 Pool Contract Auto-Verifier");
  
  const factoryAddress = "0x3E3d8a430fF70E89C035301943375377CC7343A7"; // New Factory address
  
  try {
    // Factory contract'ına bağlan
    const Factory = await hre.ethers.getContractAt("EcosystemStakingFactory", factoryAddress);
    
    // Son oluşturulan pool'ları al
    const poolCount = await Factory.poolCount();
    console.log(`📊 Total pools: ${poolCount}`);
    
    // Son 5 pool'u kontrol et
    const lastPools = Math.min(5, Number(poolCount));
    
    for (let i = Number(poolCount) - lastPools; i < poolCount; i++) {
      try {
        const poolAddress = await Factory.allPools(i);
        console.log(`\n🔗 Pool ${i + 1}: ${poolAddress}`);
        
        // Pool bilgilerini al
        const poolInfo = await Factory.getPoolInfo(poolAddress);
        
        const constructorArgs = [
          poolInfo.stakingToken,
          poolInfo.rewardToken,
          poolInfo.rewardPerBlock,
          poolInfo.startBlock,
          poolInfo.endBlock,
          poolInfo.creator  // Creator parametresi eklendi
        ];
        
        console.log("📝 Constructor args:", constructorArgs);
        
        // Verify et
        await hre.run("verify:verify", {
          address: poolAddress,
          constructorArguments: constructorArgs,
          contract: "contracts/EcosystemStaking.sol:EcosystemStaking"
        });
        
        console.log(`✅ Pool ${poolAddress} verified successfully!`);
        
      } catch (error) {
        if (error.message.includes("Already Verified")) {
          console.log(`✅ Pool already verified`);
        } else {
          console.error(`❌ Error verifying pool:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Script error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });