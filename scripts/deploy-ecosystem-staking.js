const hre = require("hardhat");

async function main() {
  console.log("Deploying EcosystemStakingFactory...");

  // ORDER Token address on Avalanche C-Chain
  // ✅ UPDATED: Correct ORDER token address
  const ORDER_TOKEN_ADDRESS = "0x1BEd077195307229FcCBC719C5f2ce6416A58180";

  // Get the contract factory
  const EcosystemStakingFactory = await hre.ethers.getContractFactory("EcosystemStakingFactory");
  
  // Deploy the contract with ORDER token address
  const factory = await EcosystemStakingFactory.deploy(ORDER_TOKEN_ADDRESS);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();

  console.log("✅ EcosystemStakingFactory deployed to:", factoryAddress);
  console.log("📝 ORDER Token:", await factory.orderToken());
  console.log("🔥 Burn Requirement:", hre.ethers.formatEther(await factory.BURN_AMOUNT()), "ORDER");
  console.log("💀 Dead Address:", await factory.DEAD_ADDRESS());
  
  // Check whitelist status
  const whitelistedAddress = "0x3fa6df8357DC58935360833827a9762433488C83";
  const isWhitelisted = await factory.whitelistedCreators(whitelistedAddress);
  console.log("✅ Whitelisted Address:", whitelistedAddress);
  console.log("   Status:", isWhitelisted ? "WHITELISTED (no burn required)" : "NOT WHITELISTED");
  console.log("👤 Admin:", await factory.admin());
  
  // Save deployment info
  const fs = require('fs');
  const path = require('path');
  
  const deploymentInfo = {
    network: hre.network.name,
    factoryAddress: factoryAddress,
    orderToken: await factory.orderToken(),
    burnAmount: (await factory.BURN_AMOUNT()).toString(),
    deadAddress: await factory.DEAD_ADDRESS(),
    admin: (await hre.ethers.getSigners())[0].address,
    whitelistedAddresses: [
      {
        address: "0x3fa6df8357DC58935360833827a9762433488C83",
        status: await factory.whitelistedCreators("0x3fa6df8357DC58935360833827a9762433488C83")
      }
    ],
    deployedAt: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address
  };
  
  const infoPath = path.join(__dirname, '..', 'ecosystem-staking-deployment.json');
  fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📄 Deployment info saved to ecosystem-staking-deployment.json");
  
  // Wait for a few block confirmations before verifying
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    const deployTx = factory.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(5);
    }
    
    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [ORDER_TOKEN_ADDRESS],
      });
      console.log("✅ Contract verified successfully");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }
  
  console.log("\n🎉 Deployment completed!");
  console.log("\n📋 Next steps:");
  console.log("1. Update FACTORY_ADDRESS in frontend code");
  console.log("2. Whitelisted address can create pools without burning ORDER");
  console.log("3. Regular users must approve 1M ORDER and it will be sent to dead address");
  console.log("4. Admin can manage whitelist with setWhitelist(address, bool)");
  console.log("5. Test creating a pool from the UI");
  console.log("6. Verify users can stake/unstake/claim");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
