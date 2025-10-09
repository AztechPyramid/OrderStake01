const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 DEPLOYER ACCOUNT KONTROLÜ\n");
  console.log("=" .repeat(60));
  
  // Network bilgisi
  const network = await ethers.provider.getNetwork();
  console.log(`\n📡 Network: ${network.name}`);
  console.log(`📡 Chain ID: ${network.chainId}`);
  
  // Deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer Address: ${deployer.address}`);
  
  // AVAX balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInAVAX = ethers.formatEther(balance);
  console.log(`💰 AVAX Balance: ${balanceInAVAX} AVAX`);
  
  // Balance kontrolü
  const minRequired = 0.5;
  if (parseFloat(balanceInAVAX) < minRequired) {
    console.log(`\n⚠️  WARNING: Balance düşük! En az ${minRequired} AVAX gerekli.`);
  } else {
    console.log(`\n✅ Balance yeterli (min ${minRequired} AVAX)`);
  }
  
  // ORDER token kontrolü
  const ORDER_TOKEN = "0x1BEd077195307229FcCBC719C5f2ce6416A58180";
  console.log(`\n🪙 ORDER Token Address: ${ORDER_TOKEN}`);
  
  // ORDER token'ın code'unu kontrol et (deployed mi?)
  const code = await ethers.provider.getCode(ORDER_TOKEN);
  if (code === "0x") {
    console.log("❌ ORDER token adresi deployed değil!");
  } else {
    console.log(`✅ ORDER token deployed (${code.length} bytes)`);
    
    // ORDER token balance
    const orderToken = await ethers.getContractAt(
      ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)", "function symbol() view returns (string)"],
      ORDER_TOKEN
    );
    
    try {
      const symbol = await orderToken.symbol();
      const decimals = await orderToken.decimals();
      const orderBalance = await orderToken.balanceOf(deployer.address);
      const orderBalanceFormatted = ethers.formatUnits(orderBalance, decimals);
      
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
      console.log(`   Deployer Balance: ${orderBalanceFormatted} ${symbol}`);
    } catch (e) {
      console.log(`   ⚠️  Token bilgileri okunamadı: ${e.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("\n✅ Account kontrolü tamamlandı!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
