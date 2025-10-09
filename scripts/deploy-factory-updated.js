const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting EcosystemStakingFactory deployment and verification...");

  // Get ORDER token address from config
  const ORDER_TOKEN = "0x1BEd077195307229FcCBC719C5f2ce6416A58180"; // ORDER token address

  console.log("📝 Deploying EcosystemStakingFactory...");
  
  // Deploy Factory contract
  const EcosystemStakingFactory = await hre.ethers.getContractFactory("EcosystemStakingFactory");
  const factory = await EcosystemStakingFactory.deploy(ORDER_TOKEN);
  
  console.log("⏳ Waiting for deployment confirmation...");
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("✅ EcosystemStakingFactory deployed to:", factoryAddress);

  // Wait for a few block confirmations before verifying
  console.log("⏳ Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Verify the contract
  console.log("🔍 Starting contract verification...");
  
  try {
    await hre.run("verify:verify", {
      address: factoryAddress,
      constructorArguments: [ORDER_TOKEN],
      contract: "contracts/EcosystemStakingFactory.sol:EcosystemStakingFactory"
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️ Contract is already verified!");
    } else {
      console.error("❌ Verification failed:", error.message);
    }
  }

  // Update deployment info
  const deploymentInfo = {
    factoryAddress: factoryAddress,
    orderToken: ORDER_TOKEN,
    deployedAt: new Date().toISOString(),
    network: hre.network.name,
    txHash: factory.deploymentTransaction()?.hash
  };

  console.log("\n📋 Deployment Summary:");
  console.log("Factory Address:", factoryAddress);
  console.log("ORDER Token:", ORDER_TOKEN);
  console.log("Network:", hre.network.name);
  console.log("TX Hash:", deploymentInfo.txHash);

  // Save deployment info to file
  const fs = require('fs');
  fs.writeFileSync(
    'factory-deployment-info.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n💾 Deployment info saved to factory-deployment-info.json");
  console.log("\n🎉 Deployment and verification completed!");
  
  // Instructions for updating frontend
  console.log("\n📝 Next steps:");
  console.log("1. Update FACTORY_ADDRESS in src/config/contracts.ts");
  console.log("2. Update any hardcoded factory addresses in the frontend");
  console.log("3. Test the new contract functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });