const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting OrderNFTLaunch deployment...");
    
    const [deployer] = await ethers.getSigners();
    
    console.log("📋 Deployment Details:");
    console.log("- Deployer address:", deployer.address);
    console.log("- Network:", await ethers.provider.getNetwork());
    
    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log("- Deployer balance:", ethers.utils.formatEther(balance), "ETH");
    
    if (balance.lt(ethers.utils.parseEther("0.1"))) {
        console.warn("⚠️  Warning: Low balance for deployment");
    }
    
    // Deploy OrderNFTLaunch factory
    console.log("\n📦 Deploying OrderNFTLaunch factory...");
    
    const OrderNFTLaunch = await ethers.getContractFactory("OrderNFTLaunch");
    const orderNFTLaunch = await OrderNFTLaunch.deploy();
    
    console.log("⏳ Waiting for deployment confirmation...");
    await orderNFTLaunch.deployed();
    
    console.log("✅ OrderNFTLaunch deployed successfully!");
    console.log("📍 Factory address:", orderNFTLaunch.address);
    
    // Get deployment transaction details
    const deployTx = orderNFTLaunch.deployTransaction;
    const gasUsed = deployTx.gasLimit;
    const gasPrice = deployTx.gasPrice;
    const deploymentCost = gasUsed.mul(gasPrice);
    
    console.log("💰 Deployment cost:", ethers.utils.formatEther(deploymentCost), "ETH");
    console.log("⛽ Gas used:", gasUsed.toString());
    console.log("💸 Gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    try {
        const admin = await orderNFTLaunch.admin();
        const burnAmount = await orderNFTLaunch.burnAmount();
        const collectionCount = await orderNFTLaunch.collectionCount();
        
        console.log("✅ Verification successful:");
        console.log("- Admin:", admin);
        console.log("- Burn amount:", ethers.utils.formatEther(burnAmount), "ORDER tokens");
        console.log("- Collection count:", collectionCount.toString());
        
        // Verify ORDER token address
        const orderTokenAddress = await orderNFTLaunch.ORDER_TOKEN();
        console.log("- ORDER token address:", orderTokenAddress);
        
        if (orderTokenAddress !== "0x1BEd077195307229FcCBC719C5f2ce6416A58180") {
            console.warn("⚠️  Warning: ORDER token address mismatch!");
        }
        
    } catch (error) {
        console.error("❌ Deployment verification failed:", error.message);
        process.exit(1);
    }
    
    // Save deployment info
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            OrderNFTLaunch: {
                address: orderNFTLaunch.address,
                abi: "contracts/OrderNFTLaunch.sol:OrderNFTLaunch"
            }
        },
        deployment: {
            transactionHash: deployTx.hash,
            blockNumber: deployTx.blockNumber,
            gasUsed: gasUsed.toString(),
            gasPrice: gasPrice.toString(),
            deploymentCost: deploymentCost.toString()
        },
        configuration: {
            orderToken: "0x1BEd077195307229FcCBC719C5f2ce6416A58180",
            burnAmount: ethers.utils.parseEther("1000000").toString(),
            deadAddress: "0x000000000000000000000000000000000000dEaD"
        }
    };
    
    const deploymentFile = path.join(__dirname, "..", "nft-factory-deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n💾 Deployment info saved to:", deploymentFile);
    
    // Display next steps
    console.log("\n📝 Next Steps:");
    console.log("1. Verify contract on block explorer (if on public network)");
    console.log("2. Test factory functionality:");
    console.log("   - Approve ORDER tokens for burn");
    console.log("   - Create test NFT collection");
    console.log("   - Test minting and marketplace features");
    console.log("3. Update frontend configuration with factory address");
    console.log("4. Consider setting up monitoring for events");
    
    // Security reminders
    console.log("\n🔒 Security Reminders:");
    console.log("- Keep admin private key secure");
    console.log("- Consider using multisig for admin functions");
    console.log("- Monitor burn amount for potential updates");
    console.log("- Set up event monitoring for collection creation");
    
    console.log("\n🎉 Deployment completed successfully!");
    
    return {
        factory: orderNFTLaunch.address,
        admin: deployer.address,
        deploymentInfo
    };
}

// Allow both direct execution and module import
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = main;