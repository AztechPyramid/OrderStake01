const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
    // .env'den ORDER token adresini al
    const ORDER_TOKEN_ADDRESS = process.env.ORDER_TOKEN_ADDRESS;
    
    if (!ORDER_TOKEN_ADDRESS) {
        throw new Error("ORDER_TOKEN_ADDRESS not found in .env file");
    }
    
    console.log("Deploying TetrisGame contract...");
    console.log("ORDER Token Address:", ORDER_TOKEN_ADDRESS);
    
    // Deployer hesabını al
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Hesap bakiyesini kontrol et
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "AVAX");
    
    // TetrisGame kontratını deploy et
    const TetrisGame = await ethers.getContractFactory("TetrisGame");
    const tetrisGame = await TetrisGame.deploy(ORDER_TOKEN_ADDRESS);
    
    // Deploy işleminin tamamlanmasını bekle
    await tetrisGame.waitForDeployment();
    
    const contractAddress = await tetrisGame.getAddress();
    console.log("TetrisGame deployed to:", contractAddress);
    
    // Kontrat bilgilerini kaydet
    const deploymentInfo = {
        contractAddress: contractAddress,
        orderTokenAddress: ORDER_TOKEN_ADDRESS,
        network: "Avalanche",
        chainId: 43114,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        txHash: tetrisGame.deploymentTransaction().hash
    };
    
    console.log("\n=== Deployment Info ===");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    // Deployment bilgilerini dosyaya kaydet
    fs.writeFileSync(
        "./deployment-info.json", 
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\nDeployment info saved to deployment-info.json");
    
    // Kontrat doğrulama için gerekli bilgileri göster
    console.log("\n=== Verification Command ===");
    console.log(`npx hardhat verify --network avalanche ${contractAddress} "${ORDER_TOKEN_ADDRESS}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });